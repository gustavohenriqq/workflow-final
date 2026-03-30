import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('kpis')
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'KPIs do dashboard: em andamento, SLA vencido, taxa aprovação, tempo médio' })
  @ApiQuery({ name: 'days', required: false, description: 'Período em dias (default 30)' })
  kpis(@Request() req, @Query('days') days?: string) {
    return this.analyticsService.getDashboardKpis(req.user.tenantId, days ? +days : 30);
  }

  @Get('bottlenecks')
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'Etapas com maior tempo médio de decisão (gargalos)' })
  @ApiQuery({ name: 'days', required: false })
  bottlenecks(@Request() req, @Query('days') days?: string) {
    return this.analyticsService.getBottlenecks(req.user.tenantId, days ? +days : 30);
  }

  @Get('timeline')
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'Instâncias criadas por dia no período' })
  @ApiQuery({ name: 'days', required: false })
  timeline(@Request() req, @Query('days') days?: string) {
    return this.analyticsService.getInstanceTimeline(req.user.tenantId, days ? +days : 30);
  }

  @Get('sla')
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'Estatísticas de cumprimento de SLA' })
  sla(@Request() req) {
    return this.analyticsService.getSlaStats(req.user.tenantId);
  }
}
