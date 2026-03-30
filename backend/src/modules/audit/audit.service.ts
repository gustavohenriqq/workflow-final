import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditQuery {
  tenantId: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: AuditQuery) {
    const limit = Math.min(query.limit || 25, 100);

    const where: any = { tenantId: query.tenantId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action };
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to) where.occurredAt.lte = new Date(query.to);
    }

    const events = await this.prisma.auditEvent.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data, nextCursor, hasMore };
  }

  async findByEntity(entityType: string, entityId: string, tenantId: string) {
    return this.prisma.auditEvent.findMany({
      where: { entityType, entityId, tenantId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async log(data: {
    tenantId: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    payloadBefore?: any;
    payloadAfter?: any;
    metadata?: any;
  }) {
    return this.prisma.auditEvent.create({ data });
  }
}
