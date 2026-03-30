import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações do usuário' })
  findAll(@Request() req, @Query('unread') unread?: string) {
    return this.notificationsService.findForUser(
      req.user.sub, req.user.tenantId, unread === 'true',
    );
  }

  @Get('count')
  @ApiOperation({ summary: 'Conta notificações não lidas' })
  count(@Request() req) {
    return this.notificationsService.countUnread(req.user.sub, req.user.tenantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  markAllRead(@Request() req) {
    return this.notificationsService.markAllRead(req.user.sub, req.user.tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca notificação específica como lida' })
  markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(id, req.user.sub);
  }
}
