import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) {}

  async findPending(userId: string, tenantId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 100);

    const items = await this.prisma.stepExecution.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        instance: { tenantId, status: { in: ['RUNNING', 'ESCALATED'] } },
      },
      include: {
        instance: {
          select: {
            id: true,
            title: true,
            status: true,
            contextData: true,
            startedAt: true,
            startedBy: { select: { id: true, name: true, email: true } },
            workflowVersion: {
              select: {
                versionNumber: true,
                workflow: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ slaDeadline: 'asc' }, { startedAt: 'asc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;

    // Enrich with SLA status
    const enriched = data.map((step) => ({
      ...step,
      slaStatus: this.computeSlaStatus(step.slaDeadline),
    }));

    return { data: enriched, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  async findHistory(userId: string, tenantId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 100);

    const items = await this.prisma.stepExecution.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED', 'ESCALATED', 'SKIPPED'] },
        decisions: { some: { actorId: userId } },
        instance: { tenantId },
      },
      include: {
        decisions: {
          where: { actorId: userId },
          orderBy: { decidedAt: 'desc' },
          take: 1,
        },
        instance: {
          select: {
            id: true, title: true, status: true,
            workflowVersion: {
              select: { workflow: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { decidedAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  async countPending(userId: string, tenantId: string): Promise<number> {
    return this.prisma.stepExecution.count({
      where: {
        assigneeId: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        instance: { tenantId, status: { in: ['RUNNING', 'ESCALATED'] } },
      },
    });
  }

  private computeSlaStatus(deadline: Date | null): 'ok' | 'warning' | 'critical' | 'expired' {
    if (!deadline) return 'ok';
    const now = Date.now();
    const dl = deadline.getTime();
    const diff = dl - now;
    if (diff <= 0) return 'expired';
    if (diff <= 2 * 3600 * 1000) return 'critical';
    if (diff <= 24 * 3600 * 1000) return 'warning';
    return 'ok';
  }
}
