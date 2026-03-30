import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { InboxService } from './inbox.service';

@ApiTags('Inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inbox')
export class InboxController {
  constructor(private inboxService: InboxService) {}

  @Get()
  @RequirePermission('inbox:read')
  @ApiOperation({ summary: 'Lista aprovações pendentes do usuário autenticado' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findPending(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inboxService.findPending(req.user.sub, req.user.tenantId, cursor, limit ? +limit : 20);
  }

  @Get('history')
  @RequirePermission('inbox:read')
  @ApiOperation({ summary: 'Histórico de decisões do usuário' })
  findHistory(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inboxService.findHistory(req.user.sub, req.user.tenantId, cursor, limit ? +limit : 20);
  }

  @Get('count')
  @RequirePermission('inbox:read')
  @ApiOperation({ summary: 'Conta aprovações pendentes (para badge no nav)' })
  count(@Request() req) {
    return this.inboxService.countPending(req.user.sub, req.user.tenantId);
  }
}
