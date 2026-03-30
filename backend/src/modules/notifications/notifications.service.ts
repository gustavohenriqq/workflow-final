import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findForUser(userId: string, tenantId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        tenantId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, tenantId, isRead: false },
    });
  }

  async create(data: {
    userId: string;
    tenantId: string;
    type: any;
    title: string;
    body: string;
    entityId?: string;
    entityType?: string;
  }) {
    return this.prisma.notification.create({ data });
  }
}
