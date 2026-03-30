import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardKpis(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const [running, slaExpired, completed, totalDecisions, approvedDecisions] = await Promise.all([
      this.prisma.workflowInstance.count({
        where: { tenantId, status: 'RUNNING' },
      }),
      this.prisma.stepExecution.count({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          slaDeadline: { lt: new Date() },
          instance: { tenantId },
        },
      }),
      this.prisma.workflowInstance.findMany({
        where: { tenantId, completedAt: { gte: since }, status: { in: ['COMPLETED', 'REJECTED'] } },
        select: { status: true, startedAt: true, completedAt: true },
      }),
      this.prisma.decision.count({
        where: { decidedAt: { gte: since }, stepExecution: { instance: { tenantId } } },
      }),
      this.prisma.decision.count({
        where: {
          action: 'APPROVE',
          decidedAt: { gte: since },
          stepExecution: { instance: { tenantId } },
        },
      }),
    ]);

    const approvalRate = totalDecisions > 0
      ? Math.round((approvedDecisions / totalDecisions) * 100)
      : 0;

    const avgDurationMs = completed.length > 0
      ? completed.reduce((sum, i) => {
          const dur = (i.completedAt?.getTime() || 0) - i.startedAt.getTime();
          return sum + dur;
        }, 0) / completed.length
      : 0;
    const avgDurationDays = Math.round((avgDurationMs / (1000 * 3600 * 24)) * 10) / 10;

    return {
      running,
      slaExpired,
      completedInPeriod: completed.length,
      approvalRate,
      avgDurationDays,
      period: { days, since },
    };
  }

  async getBottlenecks(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const steps = await this.prisma.stepExecution.findMany({
      where: {
        instance: { tenantId },
        startedAt: { gte: since },
        decidedAt: { not: null },
      },
      select: {
        stepDefinitionId: true,
        startedAt: true,
        decidedAt: true,
        status: true,
      },
    });

    // Group by stepDefinitionId and compute avg duration
    const grouped: Record<string, { durations: number[]; rejected: number; total: number }> = {};
    for (const step of steps) {
      const id = step.stepDefinitionId;
      if (!grouped[id]) grouped[id] = { durations: [], rejected: 0, total: 0 };
      grouped[id].total++;
      if (step.decidedAt) {
        grouped[id].durations.push(step.decidedAt.getTime() - step.startedAt.getTime());
      }
      if (step.status === 'REJECTED') grouped[id].rejected++;
    }

    const result = Object.entries(grouped).map(([stepId, data]) => {
      const avgMs = data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0;
      return {
        stepDefinitionId: stepId,
        avgDurationHours: Math.round((avgMs / 3600000) * 10) / 10,
        avgDurationDays: Math.round((avgMs / (3600000 * 24)) * 10) / 10,
        total: data.total,
        rejectionRate: data.total > 0 ? Math.round((data.rejected / data.total) * 100) : 0,
      };
    });

    return result.sort((a, b) => b.avgDurationHours - a.avgDurationHours);
  }

  async getInstanceTimeline(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const instances = await this.prisma.workflowInstance.findMany({
      where: { tenantId, startedAt: { gte: since } },
      select: { startedAt: true, status: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by day
    const byDay: Record<string, { date: string; total: number; completed: number; rejected: number }> = {};
    for (const inst of instances) {
      const day = inst.startedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, completed: 0, rejected: 0 };
      byDay[day].total++;
      if (inst.status === 'COMPLETED') byDay[day].completed++;
      if (inst.status === 'REJECTED') byDay[day].rejected++;
    }

    return Object.values(byDay);
  }

  async getSlaStats(tenantId: string) {
    const [onTime, expired, escalated] = await Promise.all([
      this.prisma.stepExecution.count({
        where: {
          instance: { tenantId },
          status: { in: ['APPROVED', 'REJECTED'] },
          decidedAt: { not: null },
          OR: [{ slaDeadline: null }, { slaDeadline: { gt: new Date() } }],
        },
      }),
      this.prisma.stepExecution.count({
        where: {
          instance: { tenantId },
          slaDeadline: { lt: new Date() },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.stepExecution.count({
        where: { instance: { tenantId }, status: 'ESCALATED' },
      }),
    ]);

    const total = onTime + expired + escalated;
    return {
      onTime,
      expired,
      escalated,
      total,
      onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 100,
    };
  }
}
