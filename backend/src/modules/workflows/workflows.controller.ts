import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { WorkflowsService } from './workflows.service';

class CreateWorkflowDto {
  @ApiProperty({ example: 'Aprovação de Compras' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateWorkflowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  description?: string | null;
}

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  @RequirePermission('workflows:read')
  @ApiOperation({ summary: 'Lista todos os workflows do tenant' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.findAll(req.user.tenantId, cursor, limit ? +limit : 20);
  }

  @Get(':id')
  @RequirePermission('workflows:read')
  @ApiOperation({ summary: 'Busca workflow por ID com todas as versões' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.workflowsService.findOne(id, req.user.tenantId);
  }

  @Post()
  @RequirePermission('workflows:create')
  @ApiOperation({ summary: 'Cria novo workflow com versão draft inicial' })
  create(@Request() req, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission('workflows:update')
  @ApiOperation({ summary: 'Atualiza metadados do workflow' })
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.update(id, req.user.tenantId, dto);
  }

  @Patch(':id/archive')
  @RequirePermission('workflows:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arquiva workflow (soft delete)' })
  archive(@Param('id') id: string, @Request() req) {
    return this.workflowsService.archive(id, req.user.tenantId);
  }
}
