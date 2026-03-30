import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SlaService } from '../sla/sla.service';
import { addHours } from 'date-fns';

interface GraphNode {
  id: string;
  type: 'start' | 'approval' | 'gateway' | 'end' | 'notification' | 'parallel';
  data: {
    label?: string;
    assigneeId?: string;
    assigneeEmail?: string;
    requireCommentOnReject?: boolean;
    status?: string;
    sla?: {
      durationHours: number;
      actionOnTimeout: string;
      escalateToId?: string;
    };
    conditions?: Array<{
      id: string;
      label: string;
      rules: Array<{ field: string; operator: string; value: any }>;
      targetNodeId: string;
      isDefault?: boolean;
    }>;
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  conditionId?: string;
}

interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable()
export class EngineService {
  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
  ) {}

  // ─── Start a new instance ───────────────────────────────────────────────────
  async startInstance(data: {
    workflowId: string;
    tenantId: string;
    userId: string;
    title: string;
    contextData: Record<string, any>;
  }) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: {
        workflowId: data.workflowId,
        status: 'PUBLISHED',
        workflow: { tenantId: data.tenantId },
      },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      throw new BadRequestException(
        'Nenhuma versão publicada encontrada para este workflow',
      );
    }

    const graph = version.graphJson as unknown as WorkflowGraph;
    const startNode = graph.nodes.find((n) => n.type === 'start');
    if (!startNode) throw new BadRequestException('Workflow sem nó de início');

    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowVersionId: version.id,
        tenantId: data.tenantId,
        title: data.title,
        status: 'RUNNING',
        contextData: data.contextData,
        startedById: data.userId,
      },
    });

    await this.advanceFromNode(instance.id, startNode.id, graph, data.contextData);

    return this.prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        stepExecutions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { startedAt: 'asc' },
        },
        workflowVersion: { select: { id: true, versionNumber: true } },
      },
    });
  }

  // ─── Core: advance from a given node ───────────────────────────────────────
  private async advanceFromNode(
    instanceId: string,
    nodeId: string,
    graph: WorkflowGraph,
    contextData: Record<string, any>,
  ) {
    const outgoing = graph.edges.filter((e) => e.source === nodeId);

    for (const edge of outgoing) {
      const targetNode = graph.nodes.find((n) => n.id === edge.target);
      if (!targetNode) continue;

      switch (targetNode.type) {
        case 'approval':
          await this.createStepExecution(instanceId, targetNode);
          break;
        case 'gateway':
          await this.resolveGateway(instanceId, targetNode, graph, contextData);
          break;
        case 'end':
          await this.finalizeInstance(
            instanceId,
            targetNode.data.status || 'COMPLETED',
          );
          break;
        case 'start':
          // pass-through
          await this.advanceFromNode(instanceId, targetNode.id, graph, contextData);
          break;
        case 'notification':
          await this.advanceFromNode(instanceId, targetNode.id, graph, contextData);
          break;
      }
    }
  }

  // ─── Create step_execution for an approval node ─────────────────────────────
  private async createStepExecution(instanceId: string, node: GraphNode) {
    const slaDeadline = node.data.sla?.durationHours
      ? addHours(new Date(), node.data.sla.durationHours)
      : null;

    const step = await this.prisma.stepExecution.create({
      data: {
        instanceId,
        stepDefinitionId: node.id,
        assigneeId: node.data.assigneeId || null,
        status: 'PENDING',
        slaDeadline,
      },
    });

    if (slaDeadline && node.data.sla) {
      const jobId = await this.slaService.scheduleSlaCheck(step.id, slaDeadline, {
        actionOnTimeout: node.data.sla.actionOnTimeout,
        escalateToId: node.data.sla.escalateToId,
      });
      if (jobId) {
        await this.prisma.stepExecution.update({
          where: { id: step.id },
          data: { slaJobId: jobId },
        });
      }
    }

    return step;
  }

  // ─── Resolve gateway: evaluate conditions, pick branch ─────────────────────
  private async resolveGateway(
    instanceId: string,
    gatewayNode: GraphNode,
    graph: WorkflowGraph,
    contextData: Record<string, any>,
  ) {
    const conditions = gatewayNode.data.conditions || [];
    let matched: typeof conditions[0] | null = null;
    let defaultCond: typeof conditions[0] | null = null;

    for (const cond of conditions) {
      if (cond.isDefault) {
        defaultCond = cond;
        continue;
      }
      if (this.evaluateRules(cond.rules, contextData)) {
        matched = cond;
        break;
      }
    }

    const chosen = matched || defaultCond;
    if (!chosen) return;

    // Advance directly to the condition's target node
    const targetNode = graph.nodes.find((n) => n.id === chosen.targetNodeId);
    if (!targetNode) return;

    if (targetNode.type === 'end') {
      await this.finalizeInstance(instanceId, targetNode.data.status || 'COMPLETED');
    } else {
      await this.advanceFromNode(instanceId, chosen.targetNodeId, graph, contextData);
    }
  }

  // ─── Condition evaluator ────────────────────────────────────────────────────
  private evaluateRules(
    rules: Array<{ field: string; operator: string; value: any }>,
    context: Record<string, any>,
  ): boolean {
    if (!rules || rules.length === 0) return true;
    return rules.every((rule) => {
      const actual = this.getNestedValue(context, rule.field);
      switch (rule.operator) {
        case 'eq':       return actual == rule.value;
        case 'neq':      return actual != rule.value;
        case 'gt':       return Number(actual) > Number(rule.value);
        case 'gte':      return Number(actual) >= Number(rule.value);
        case 'lt':       return Number(actual) < Number(rule.value);
        case 'lte':      return Number(actual) <= Number(rule.value);
        case 'contains': return String(actual).toLowerCase().includes(String(rule.value).toLowerCase());
        case 'in':       return Array.isArray(rule.value) && rule.value.includes(actual);
        default:         return false;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((cur, key) => cur?.[key], obj);
  }

  // ─── Process a decision ─────────────────────────────────────────────────────
  async processDecision(data: {
    stepExecutionId: string;
    actorId: string;
    tenantId: string;
    action: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'REQUEST_INFO' | 'ESCALATE';
    comment?: string;
    evidenceUrls?: string[];
    delegateToId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const step = await this.prisma.stepExecution.findUnique({
      where: { id: data.stepExecutionId },
      include: {
        instance: {
          include: { workflowVersion: true },
        },
      },
    });

    if (!step) throw new BadRequestException('Etapa não encontrada');
    if (step.instance.tenantId !== data.tenantId) {
      throw new BadRequestException('Acesso negado');
    }
    if (!['PENDING', 'IN_PROGRESS'].includes(step.status)) {
      throw new BadRequestException('Esta etapa já foi concluída');
    }
    if (
      step.assigneeId &&
      step.assigneeId !== data.actorId &&
      data.action !== 'ESCALATE'
    ) {
      throw new BadRequestException('Você não é o responsável por esta etapa');
    }

    // Record the decision
    await this.prisma.decision.create({
      data: {
        stepExecutionId: data.stepExecutionId,
        actorId: data.actorId,
        action: data.action,
        comment: data.comment,
        evidenceUrls: data.evidenceUrls || [],
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    // Cancel SLA job
    if (step.slaJobId) {
      await this.slaService.cancelSlaCheck(step.slaJobId);
    }

    // Handle delegation
    if (data.action === 'DELEGATE') {
      return this.prisma.stepExecution.update({
        where: { id: data.stepExecutionId },
        data: {
          assigneeId: data.delegateToId,
          delegatedFromId: data.actorId,
          status: 'PENDING',
        },
      });
    }

    if (data.action === 'REQUEST_INFO') {
      return this.prisma.stepExecution.update({
        where: { id: data.stepExecutionId },
        data: { status: 'PENDING' },
      });
    }

    // Mark step decided
    const newStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await this.prisma.stepExecution.update({
      where: { id: data.stepExecutionId },
      data: { status: newStatus, decidedAt: new Date() },
    });

    const graph = step.instance.workflowVersion.graphJson as unknown as WorkflowGraph;
    const contextData = step.instance.contextData as Record<string, any>;

    if (data.action === 'APPROVE') {
      if (step.parallelGroupId) {
        await this.checkParallelGroupCompletion(
          step.instanceId,
          step.parallelGroupId,
          graph,
          contextData,
        );
      } else {
        // Find the outgoing "approved" edge (no label OR label == 'aprovado', not 'rejeitado')
        const approvalEdge = graph.edges.find(
          (e) =>
            e.source === step.stepDefinitionId &&
            e.label !== 'rejeitado',
        );
        if (approvalEdge) {
          const targetNode = graph.nodes.find((n) => n.id === approvalEdge.target);
          if (targetNode) {
            if (targetNode.type === 'end') {
              await this.finalizeInstance(
                step.instanceId,
                targetNode.data.status || 'COMPLETED',
              );
            } else {
              await this.advanceFromNode(
                step.instanceId,
                approvalEdge.target,
                graph,
                contextData,
              );
            }
          }
        }
      }
    } else {
      // REJECT
      const rejectEdge = graph.edges.find(
        (e) => e.source === step.stepDefinitionId && e.label === 'rejeitado',
      );
      if (rejectEdge) {
        const endNode = graph.nodes.find((n) => n.id === rejectEdge.target);
        if (endNode?.type === 'end') {
          await this.finalizeInstance(step.instanceId, 'REJECTED');
        }
      } else {
        await this.finalizeInstance(step.instanceId, 'REJECTED');
      }
    }

    return this.prisma.stepExecution.findUnique({
      where: { id: data.stepExecutionId },
      include: {
        decisions: {
          include: { actor: { select: { id: true, name: true } } },
        },
      },
    });
  }

  // ─── Parallel group: all approved? advance. any rejected? reject all. ───────
  private async checkParallelGroupCompletion(
    instanceId: string,
    parallelGroupId: string,
    graph: WorkflowGraph,
    contextData: Record<string, any>,
  ) {
    const groupSteps = await this.prisma.stepExecution.findMany({
      where: { instanceId, parallelGroupId },
    });

    const allApproved = groupSteps.every((s) => s.status === 'APPROVED');
    const anyRejected = groupSteps.some((s) => s.status === 'REJECTED');

    if (anyRejected) {
      await this.finalizeInstance(instanceId, 'REJECTED');
    } else if (allApproved) {
      const firstStep = groupSteps[0];
      const approvalEdge = graph.edges.find(
        (e) =>
          e.source === firstStep.stepDefinitionId &&
          e.label !== 'rejeitado',
      );
      if (approvalEdge) {
        await this.advanceFromNode(instanceId, approvalEdge.target, graph, contextData);
      }
    }
  }

  // ─── Finalize instance ──────────────────────────────────────────────────────
  private async finalizeInstance(instanceId: string, status: string) {
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: status as any, completedAt: new Date() },
    });
  }

  // ─── Cancel instance ────────────────────────────────────────────────────────
  async cancelInstance(
    instanceId: string,
    tenantId: string,
    userId: string,
    reason?: string,
  ) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
    });
    if (!instance) throw new BadRequestException('Instância não encontrada');
    if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(instance.status)) {
      throw new BadRequestException('Instância já finalizada');
    }

    await this.prisma.stepExecution.updateMany({
      where: {
        instanceId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { status: 'SKIPPED', decidedAt: new Date() },
    });

    return this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }
}
