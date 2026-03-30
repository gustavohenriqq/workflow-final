import {
  Controller, Post, Patch, Get, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { VersionsService } from './versions.service';

class SaveDraftDto {
  @ApiProperty({ description: 'Graph JSON with nodes and edges' })
  @IsObject()
  graphJson: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  changelog?: string;
}

@ApiTags('Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('workflows/:workflowId/versions')
export class VersionsController {
  constructor(private versionsService: VersionsService) {}

  @Post('draft')
  @RequirePermission('workflows:update')
  @ApiOperation({ summary: 'Salva rascunho do grafo do workflow' })
  saveDraft(
    @Param('workflowId') workflowId: string,
    @Request() req,
    @Body() dto: SaveDraftDto,
  ) {
    return this.versionsService.saveDraft(
      workflowId, req.user.tenantId, dto.graphJson, dto.changelog,
    );
  }

  @Patch(':versionId/publish')
  @RequirePermission('workflows:publish')
  @ApiOperation({ summary: 'Publica versão draft (torna imutável e inicia novas instâncias com ela)' })
  publish(@Param('versionId') versionId: string, @Request() req) {
    return this.versionsService.publish(versionId, req.user.sub, req.user.tenantId);
  }

  @Get(':versionIdA/compare/:versionIdB')
  @RequirePermission('workflows:read')
  @ApiOperation({ summary: 'Compara dois versões e retorna diff de nós' })
  compare(
    @Param('versionIdA') versionIdA: string,
    @Param('versionIdB') versionIdB: string,
  ) {
    return this.versionsService.compare(versionIdA, versionIdB);
  }

  @Get(':versionId')
  @RequirePermission('workflows:read')
  @ApiOperation({ summary: 'Retorna versão com graph_json completo' })
  findOne(@Param('versionId') versionId: string) {
    return this.versionsService.findOne(versionId);
  }
}
