import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InstancesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, filters: {
    status?: string; workflowId?: string; startedById?: string;
    cursor?: string; limit?: number;
  }) {
    const take = Math.min(filters.limit || 20, 100);
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.startedById) where.startedById = filters.startedById;
    if (filters.workflowId) {
      where.workflowVersion = { workflowId: filters.workflowId };
    }

    const items = await this.prisma.workflowInstance.findMany({
      where,
      include: {
        workflowVersion: {
          select: {
            id: true, versionNumber: true,
            workflow: { select: { id: true, name: true } },
          },
        },
        startedBy: { select: { id: true, name: true, email: true } },
        stepExecutions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          select: { id: true, stepDefinitionId: true, status: true, slaDeadline: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: take + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  async findOne(id: string, tenantId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id, tenantId },
      include: {
        workflowVersion: {
          select: {
            id: true, versionNumber: true, graphJson: true,
            workflow: { select: { id: true, name: true } },
          },
        },
        startedBy: { select: { id: true, name: true, email: true } },
        stepExecutions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            delegatedFrom: { select: { id: true, name: true } },
            decisions: {
              include: { actor: { select: { id: true, name: true, email: true } } },
              orderBy: { decidedAt: 'asc' },
            },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!instance) throw new NotFoundException('Instância não encontrada');
    return instance;
  }
}
