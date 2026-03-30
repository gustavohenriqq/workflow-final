import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, email: true, name: true, avatarUrl: true, isActive: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, email: true, name: true, avatarUrl: true, isActive: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(tenantId: string, data: { email: string; name: string; password: string; roleIds?: string[] }) {
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        name: data.name,
        password: hashed,
        userRoles: data.roleIds
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async update(id: string, tenantId: string, data: { name?: string; isActive?: boolean }) {
    await this.findOne(id, tenantId);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, isActive: true },
    });
  }

  async updateRoles(id: string, tenantId: string, roleIds: string[]) {
    await this.findOne(id, tenantId);
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    return this.prisma.user.update({
      where: { id },
      data: { userRoles: { create: roleIds.map((roleId) => ({ roleId })) } },
      select: { id: true, email: true, userRoles: { include: { role: true } } },
    });
  }
}
