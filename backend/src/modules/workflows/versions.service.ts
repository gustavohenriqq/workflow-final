import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  async findOne(versionId: string) {
    const v = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
      include: {
        workflow: { select: { id: true, name: true, tenantId: true } },
        publishedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!v) throw new NotFoundException('Versão não encontrada');
    return v;
  }

  async saveDraft(workflowId: string, tenantId: string, graphJson: any, changelog?: string) {
    // Verify workflow belongs to tenant
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id: workflowId, tenantId },
    });
    if (!workflow) throw new NotFoundException('Workflow não encontrado');

    // Find existing draft or create new version
    const existingDraft = await this.prisma.workflowVersion.findFirst({
      where: { workflowId, status: 'DRAFT' },
      orderBy: { versionNumber: 'desc' },
    });

    if (existingDraft) {
      return this.prisma.workflowVersion.update({
        where: { id: existingDraft.id },
        data: { graphJson, changelog },
      });
    }

    // Get latest version number
    const latest = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: 'desc' },
    });

    return this.prisma.workflowVersion.create({
      data: {
        workflowId,
        versionNumber: (latest?.versionNumber || 0) + 1,
        status: 'DRAFT',
        graphJson,
        changelog: changelog || 'Nova versão',
      },
    });
  }

  async publish(versionId: string, userId: string, tenantId: string) {
    const version = await this.findOne(versionId);

    if (version.workflow.tenantId !== tenantId) {
      throw new NotFoundException('Versão não encontrada');
    }
    if (version.status !== 'DRAFT') {
      throw new ConflictException('Apenas versões em rascunho podem ser publicadas');
    }

    // Validate graph has at least start and end nodes
    const graph = version.graphJson as any;
    if (!graph.nodes || graph.nodes.length < 2) {
      throw new BadRequestException('O workflow precisa ter pelo menos um início e um fim');
    }
    const hasStart = graph.nodes.some((n: any) => n.type === 'start');
    const hasEnd = graph.nodes.some((n: any) => n.type === 'end');
    if (!hasStart || !hasEnd) {
      throw new BadRequestException('O workflow precisa ter nó de início e de fim');
    }

    // Deprecate previous published version
    await this.prisma.workflowVersion.updateMany({
      where: { workflowId: version.workflowId, status: 'PUBLISHED' },
      data: { status: 'DEPRECATED' },
    });

    return this.prisma.workflowVersion.update({
      where: { id: versionId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: userId },
    });
  }

  async compare(versionIdA: string, versionIdB: string) {
    const [a, b] = await Promise.all([
      this.prisma.workflowVersion.findUnique({ where: { id: versionIdA } }),
      this.prisma.workflowVersion.findUnique({ where: { id: versionIdB } }),
    ]);
    if (!a || !b) throw new NotFoundException('Uma ou mais versões não encontradas');

    const graphA = a.graphJson as any;
    const graphB = b.graphJson as any;

    const nodesA = new Map((graphA.nodes || []).map((n: any) => [n.id, n]));
    const nodesB = new Map((graphB.nodes || []).map((n: any) => [n.id, n]));

    const added = [...nodesB.values()].filter((n: any) => !nodesA.has(n.id));
    const removed = [...nodesA.values()].filter((n: any) => !nodesB.has(n.id));
    const modified = [...nodesB.values()].filter((n: any) => {
      if (!nodesA.has(n.id)) return false;
      return JSON.stringify(nodesA.get(n.id)) !== JSON.stringify(n);
    });

    return {
      versionA: { id: a.id, versionNumber: a.versionNumber, status: a.status },
      versionB: { id: b.id, versionNumber: b.versionNumber, status: b.status },
      diff: { added, removed, modified, unchanged: graphB.nodes.length - added.length - modified.length },
    };
  }
}
