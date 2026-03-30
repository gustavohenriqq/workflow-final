import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsArray, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { UsersService } from './users.service';

class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() roleIds?: string[];
}

class UpdateUserDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateRolesDto {
  @ApiProperty({ type: [String] }) @IsArray() roleIds: string[];
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermission('admin:read')
  @ApiOperation({ summary: 'Lista usuários do tenant' })
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @RequirePermission('admin:read')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Post()
  @RequirePermission('admin:manage')
  @ApiOperation({ summary: 'Cria usuário no tenant' })
  create(@Request() req, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin:manage')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, req.user.tenantId, dto);
  }

  @Patch(':id/roles')
  @RequirePermission('admin:manage')
  @ApiOperation({ summary: 'Atualiza roles do usuário' })
  updateRoles(@Param('id') id: string, @Request() req, @Body() dto: UpdateRolesDto) {
    return this.usersService.updateRoles(id, req.user.tenantId, dto.roleIds);
  }
}
