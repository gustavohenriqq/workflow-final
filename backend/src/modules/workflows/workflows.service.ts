import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateWorkflowDto {
  name: string;
  description?: string;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
}

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 100);
    const workflows = await this.prisma.workflowDefinition.findMany({
      where: { tenantId, isArchived: false },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { id: true, versionNumber: true, status: true, publishedAt: true },
        },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = workflows.length > take;
    const data = hasMore ? workflows.slice(0, take) : workflows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  async findOne(id: string, tenantId: string) {
    const wf = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            status: true,
            changelog: true,
            publishedAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!wf) throw new NotFoundException('Workflow não encontrado');
    return wf;
  }

  async create(tenantId: string, userId: string, dto: CreateWorkflowDto) {
    const workflow = await this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name,
        description: dto.description || null,
      },
    });

    // Create initial draft version with empty graph
    await this.prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        versionNumber: 1,
        status: 'DRAFT',
        graphJson: { nodes: [], edges: [] },
        changelog: 'Versão inicial',
      },
    });

    return workflow;
  }

  async update(id: string, tenantId: string, dto: UpdateWorkflowDto) {
    await this.findOne(id, tenantId);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    else data.description = null; // allow clearing description
    return this.prisma.workflowDefinition.update({
      where: { id },
      data,
    });
  }

  async archive(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
