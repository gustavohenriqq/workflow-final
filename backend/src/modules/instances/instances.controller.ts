import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { InstancesService } from './instances.service';
import { EngineService } from '../engine/engine.service';

class CreateInstanceDto {
  @ApiProperty({ example: 'wf-demo-compras-001' })
  @IsString()
  workflowId: string;

  @ApiProperty({ example: 'Compra Notebook Dev - João Silva' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: { valor: 15000, categoria: 'TI', solicitante: 'João Silva' } })
  @IsObject()
  contextData: Record<string, any>;
}

class DecideDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'DELEGATE', 'REQUEST_INFO', 'ESCALATE'] })
  @IsString()
  action: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'REQUEST_INFO' | 'ESCALATE';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  evidenceUrls?: string[];

  @ApiProperty({ required: false, description: 'Required when action is DELEGATE' })
  @IsOptional()
  @IsString()
  delegateToId?: string;
}

class CancelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Instances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('instances')
export class InstancesController {
  constructor(
    private instancesService: InstancesService,
    private engineService: EngineService,
  ) {}

  @Get()
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'Lista instâncias com filtros' })
  @ApiQuery({ name: 'status', required: false, enum: ['RUNNING', 'COMPLETED', 'REJECTED', 'CANCELLED'] })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('workflowId') workflowId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.instancesService.findAll(req.user.tenantId, {
      status, workflowId, cursor, limit: limit ? +limit : 20,
    });
  }

  @Get(':id')
  @RequirePermission('instances:read')
  @ApiOperation({ summary: 'Detalhes da instância com timeline completa' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.instancesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @RequirePermission('instances:create')
  @ApiOperation({ summary: 'Inicia nova instância de workflow' })
  create(@Request() req, @Body() dto: CreateInstanceDto) {
    return this.engineService.startInstance({
      workflowId: dto.workflowId,
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      title: dto.title,
      contextData: dto.contextData,
    });
  }

  @Post('step-executions/:stepId/decide')
  @RequirePermission('inbox:decide')
  @ApiOperation({ summary: 'Registra decisão em uma etapa (aprovar/rejeitar/delegar)' })
  decide(
    @Param('stepId') stepId: string,
    @Request() req,
    @Body() dto: DecideDto,
  ) {
    return this.engineService.processDecision({
      stepExecutionId: stepId,
      actorId: req.user.sub,
      tenantId: req.user.tenantId,
      action: dto.action,
      comment: dto.comment,
      evidenceUrls: dto.evidenceUrls,
      delegateToId: dto.delegateToId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':id/cancel')
  @RequirePermission('instances:cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela instância em execução' })
  cancel(@Param('id') id: string, @Request() req, @Body() dto: CancelDto) {
    return this.engineService.cancelInstance(id, req.user.tenantId, req.user.sub, dto.reason);
  }
}
