import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SlaService } from './sla.service';

/**
 * SlaWorker — roda a cada minuto.
 * Busca jobs vencidos no Upstash Redis e executa a ação configurada.
 * Fallback: se Redis não estiver disponível, consulta diretamente o banco.
 */
@Injectable()
export class SlaWorker {
  private readonly logger = new Logger(SlaWorker.name);

  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredSlas() {
    // Tenta via Redis primeiro (mais eficiente)
    const expiredFromRedis = await this.slaService.getExpiredJobs();

    if (expiredFromRedis.length > 0) {
      this.logger.warn(`${expiredFromRedis.length} SLA(s) vencido(s) via Redis`);
      for (const stepId of expiredFromRedis) {
        await this.processById(stepId);
        await this.slaService.removeFromPending(stepId);
      }
      return;
    }

    // Fallback: consulta o banco (quando Redis não está configurado)
    const expiredSteps = await this.prisma.stepExecution.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        slaDeadline: { lt: new Date() },
        instance: { status: { in: ['RUNNING', 'ESCALATED'] } },
      },
      take: 50,
    });

    if (expiredSteps.length === 0) return;

    this.logger.warn(`${expiredSteps.length} SLA(s) vencido(s) via banco`);
    for (const step of expiredSteps) {
      await this.processStep(step);
    }
  }

  private async processById(stepExecutionId: string) {
    const step = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
    });
    if (step) await this.processStep(step);
  }

  private async processStep(step: any) {
    if (!['PENDING', 'IN_PROGRESS'].includes(step.status)) return;

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: step.instanceId },
      include: { workflowVersion: true },
    });
    if (!instance) return;

    const graph = instance.workflowVersion.graphJson as any;
    const node = graph?.nodes?.find((n: any) => n.id === step.stepDefinitionId);
    const action = node?.data?.sla?.actionOnTimeout || 'ESCALATE';
    const escalateToId = node?.data?.sla?.escalateToId || step.assigneeId;

    this.logger.warn(`SLA expirado: step ${step.id} → ação: ${action}`);

    try {
      switch (action) {
        case 'ESCALATE':
          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: 'ESCALATED', assigneeId: escalateToId },
          });
          await this.prisma.workflowInstance.update({
            where: { id: step.instanceId },
            data: { status: 'ESCALATED' },
          });
          break;

        case 'AUTO_APPROVE':
          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: 'APPROVED', decidedAt: new Date() },
          });
          if (escalateToId) {
            await this.prisma.decision.create({
              data: {
                stepExecutionId: step.id,
                actorId: escalateToId,
                action: 'APPROVE',
                comment: 'Aprovado automaticamente por expiração de SLA',
              },
            });
          }
          break;

        case 'AUTO_REJECT':
          await this.prisma.stepExecution.update({
            where: { id: step.id },
            data: { status: 'REJECTED', decidedAt: new Date() },
          });
          if (escalateToId) {
            await this.prisma.decision.create({
              data: {
                stepExecutionId: step.id,
                actorId: escalateToId,
                action: 'REJECT',
                comment: 'Rejeitado automaticamente por expiração de SLA',
              },
            });
          }
          await this.prisma.workflowInstance.update({
            where: { id: step.instanceId },
            data: { status: 'REJECTED', completedAt: new Date() },
          });
          break;
      }

      await this.prisma.auditEvent.create({
        data: {
          tenantId: instance.tenantId,
          action: 'sla.expired',
          entityType: 'StepExecution',
          entityId: step.id,
          payloadAfter: { action, stepId: step.id },
          metadata: { automated: true },
        },
      });
    } catch (e) {
      this.logger.error(`Erro ao processar SLA step ${step.id}: ${e.message}`);
    }
  }
}
