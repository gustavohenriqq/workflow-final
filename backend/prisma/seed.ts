import { PrismaClient, WorkflowVersionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ─── Permissions ─────────────────────────────────────────────
  const permissions = [
    { module: 'workflows', action: 'create' },
    { module: 'workflows', action: 'read' },
    { module: 'workflows', action: 'update' },
    { module: 'workflows', action: 'delete' },
    { module: 'workflows', action: 'publish' },
    { module: 'instances', action: 'create' },
    { module: 'instances', action: 'read' },
    { module: 'instances', action: 'cancel' },
    { module: 'inbox', action: 'read' },
    { module: 'inbox', action: 'decide' },
    { module: 'audit', action: 'read' },
    { module: 'admin', action: 'read' },
    { module: 'admin', action: 'manage' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: { module: p.module, action: p.action },
    });
  }
  console.log('✅ Permissões criadas');

  const allPermissions = await prisma.permission.findMany();
  const tenantId = 'tenant-demo-001';

  // ─── Roles ───────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Admin' } },
    update: {},
    create: {
      name: 'Admin',
      description: 'Acesso completo a todos os módulos',
      tenantId,
      isSystem: true,
      rolePermissions: { create: allPermissions.map(p => ({ permissionId: p.id })) },
    },
  });

  const managerPerms = allPermissions.filter(p =>
    [
      'workflows:create', 'workflows:read', 'workflows:update',
      'workflows:delete', 'workflows:publish',
      'instances:create', 'instances:read', 'instances:cancel',
      'inbox:read', 'inbox:decide',
    ].includes(`${p.module}:${p.action}`),
  );
  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Gestor' } },
    update: {},
    create: {
      name: 'Gestor',
      description: 'Cria e gerencia workflows e instâncias',
      tenantId,
      isSystem: true,
      rolePermissions: { create: managerPerms.map(p => ({ permissionId: p.id })) },
    },
  });

  const approverPerms = allPermissions.filter(p =>
    ['inbox:read', 'inbox:decide', 'instances:read', 'workflows:read'].includes(`${p.module}:${p.action}`),
  );
  const approverRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Aprovador' } },
    update: {},
    create: {
      name: 'Aprovador',
      description: 'Visualiza e decide aprovações',
      tenantId,
      isSystem: true,
      rolePermissions: { create: approverPerms.map(p => ({ permissionId: p.id })) },
    },
  });

  const auditorPerms = allPermissions.filter(p =>
    ['audit:read', 'instances:read', 'workflows:read'].includes(`${p.module}:${p.action}`),
  );
  const auditorRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Auditor' } },
    update: {},
    create: {
      name: 'Auditor',
      description: 'Acesso somente leitura para fins de auditoria',
      tenantId,
      isSystem: true,
      rolePermissions: { create: auditorPerms.map(p => ({ permissionId: p.id })) },
    },
  });

  console.log('✅ Perfis criados (Admin, Gestor, Aprovador, Auditor)');

  // ─── Users ───────────────────────────────────────────────────
  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const users = [
    // Admins
    { email: 'admin@workflow.dev',         name: 'Admin Sistema',       password: 'Admin@2024',     role: adminRole.id },
    // Gestores
    { email: 'carlos.lima@workflow.dev',   name: 'Carlos Lima',         password: 'Gestor@2024',    role: managerRole.id },
    { email: 'fernanda.souza@workflow.dev',name: 'Fernanda Souza',      password: 'Gestor@2024',    role: managerRole.id },
    { email: 'rafael.santos@workflow.dev', name: 'Rafael Santos',       password: 'Gestor@2024',    role: managerRole.id },
    // Aprovadores - Diretoria
    { email: 'ana.beatriz@workflow.dev',   name: 'Ana Beatriz',         password: 'Aprovador@2024', role: approverRole.id },
    { email: 'marcos.oliveira@workflow.dev',name: 'Marcos Oliveira',    password: 'Aprovador@2024', role: approverRole.id },
    // Aprovadores - Financeiro
    { email: 'roberto.souza@workflow.dev', name: 'Roberto Souza',       password: 'Aprovador@2024', role: approverRole.id },
    { email: 'juliana.costa@workflow.dev', name: 'Juliana Costa',       password: 'Aprovador@2024', role: approverRole.id },
    // Aprovadores - Jurídico
    { email: 'patricia.mendes@workflow.dev',name: 'Patrícia Mendes',    password: 'Aprovador@2024', role: approverRole.id },
    // Aprovadores - TI / Segurança
    { email: 'thiago.ferreira@workflow.dev',name: 'Thiago Ferreira',    password: 'Aprovador@2024', role: approverRole.id },
    { email: 'camila.rocha@workflow.dev',  name: 'Camila Rocha',        password: 'Aprovador@2024', role: approverRole.id },
    // Aprovadores - RH
    { email: 'lucas.martins@workflow.dev', name: 'Lucas Martins',       password: 'Aprovador@2024', role: approverRole.id },
    { email: 'beatriz.alves@workflow.dev', name: 'Beatriz Alves',       password: 'Aprovador@2024', role: approverRole.id },
    // Auditores
    { email: 'auditoria@workflow.dev',     name: 'Auditoria Interna',   password: 'Auditor@2024',   role: auditorRole.id },
    { email: 'compliance@workflow.dev',    name: 'Compliance',          password: 'Auditor@2024',   role: auditorRole.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: await hash(u.password),
        tenantId,
        userRoles: { create: { roleId: u.role } },
      },
    });
  }
  console.log(`✅ ${users.length} usuários criados`);

  // ─── Demo Workflow ────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@workflow.dev' } });
  const carlosUser = await prisma.user.findUnique({ where: { email: 'carlos.lima@workflow.dev' } });
  const anaUser = await prisma.user.findUnique({ where: { email: 'ana.beatriz@workflow.dev' } });
  const robertoUser = await prisma.user.findUnique({ where: { email: 'roberto.souza@workflow.dev' } });

  const wfDef = await prisma.workflowDefinition.upsert({
    where: { id: 'wf-demo-compras-001' },
    update: {},
    create: {
      id: 'wf-demo-compras-001',
      tenantId,
      name: 'Aprovação de Compras',
      description: 'Fluxo padrão para aprovação de solicitações de compra corporativas',
      createdById: adminUser.id,
    },
  });

  const graphJson = {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 300, y: 40 },
        data: { label: 'Início' },
      },
      {
        id: 'step-gestor',
        type: 'approval',
        position: { x: 300, y: 160 },
        data: {
          label: 'Aprovação do Gestor',
          assigneeId: carlosUser.id,
          assigneeEmail: carlosUser.email,
          requireCommentOnReject: true,
          sla: { durationHours: 24, actionOnTimeout: 'ESCALATE', escalateToId: adminUser.id },
        },
      },
      {
        id: 'gateway-valor',
        type: 'gateway',
        position: { x: 300, y: 310 },
        data: {
          label: 'Valor > R$ 10.000?',
          conditions: [
            {
              id: 'cond-alto',
              label: 'Alto valor',
              rules: [{ field: 'valor', operator: 'gt', value: 10000 }],
              targetNodeId: 'step-diretoria',
              isDefault: false,
            },
            {
              id: 'cond-padrao',
              label: 'Valor padrão',
              rules: [],
              targetNodeId: 'end-aprovado',
              isDefault: true,
            },
          ],
        },
      },
      {
        id: 'step-diretoria',
        type: 'approval',
        position: { x: 300, y: 460 },
        data: {
          label: 'Aprovação Diretoria',
          assigneeId: anaUser.id,
          assigneeEmail: anaUser.email,
          requireCommentOnReject: true,
          sla: { durationHours: 48, actionOnTimeout: 'ESCALATE', escalateToId: adminUser.id },
        },
      },
      {
        id: 'end-aprovado',
        type: 'end',
        position: { x: 150, y: 600 },
        data: { label: 'Aprovado', status: 'COMPLETED' },
      },
      {
        id: 'end-rejeitado',
        type: 'end',
        position: { x: 460, y: 600 },
        data: { label: 'Rejeitado', status: 'REJECTED' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start',        target: 'step-gestor' },
      { id: 'e2', source: 'step-gestor',   target: 'gateway-valor',  label: 'aprovado' },
      { id: 'e3', source: 'step-gestor',   target: 'end-rejeitado',  label: 'rejeitado' },
      { id: 'e4', source: 'gateway-valor', target: 'step-diretoria', conditionId: 'cond-alto' },
      { id: 'e5', source: 'gateway-valor', target: 'end-aprovado',   conditionId: 'cond-padrao' },
      { id: 'e6', source: 'step-diretoria', target: 'end-aprovado',  label: 'aprovado' },
      { id: 'e7', source: 'step-diretoria', target: 'end-rejeitado', label: 'rejeitado' },
    ],
  };

  await prisma.workflowVersion.upsert({
    where: { workflowId_versionNumber: { workflowId: wfDef.id, versionNumber: 1 } },
    update: {},
    create: {
      workflowId: wfDef.id,
      versionNumber: 1,
      status: WorkflowVersionStatus.PUBLISHED,
      graphJson,
      changelog: 'Versão inicial com gateway condicional de valor',
      publishedAt: new Date(),
      publishedById: adminUser.id,
    },
  });

  // Second workflow
  const wfAdmissao = await prisma.workflowDefinition.upsert({
    where: { id: 'wf-demo-admissao-001' },
    update: {},
    create: {
      id: 'wf-demo-admissao-001',
      tenantId,
      name: 'Admissão de Colaboradores',
      description: 'Fluxo de aprovação para novas contratações',
      createdById: adminUser.id,
    },
  });

  const graphAdmissao = {
    nodes: [
      { id: 'start', type: 'start', position: { x: 300, y: 40 }, data: { label: 'Início' } },
      {
        id: 'step-rh',
        type: 'approval',
        position: { x: 300, y: 160 },
        data: {
          label: 'Aprovação RH',
          assigneeId: robertoUser.id,
          assigneeEmail: robertoUser.email,
          requireCommentOnReject: false,
          sla: { durationHours: 48, actionOnTimeout: 'ESCALATE', escalateToId: adminUser.id },
        },
      },
      {
        id: 'step-gestor',
        type: 'approval',
        position: { x: 300, y: 310 },
        data: {
          label: 'Aprovação Gestor da Área',
          assigneeId: carlosUser.id,
          assigneeEmail: carlosUser.email,
          requireCommentOnReject: true,
          sla: { durationHours: 24, actionOnTimeout: 'ESCALATE', escalateToId: adminUser.id },
        },
      },
      {
        id: 'step-diretoria',
        type: 'approval',
        position: { x: 300, y: 460 },
        data: {
          label: 'Aprovação Diretoria',
          assigneeId: anaUser.id,
          assigneeEmail: anaUser.email,
          requireCommentOnReject: true,
          sla: { durationHours: 72, actionOnTimeout: 'ESCALATE', escalateToId: adminUser.id },
        },
      },
      { id: 'end-ok', type: 'end', position: { x: 150, y: 600 }, data: { label: 'Admissão Aprovada', status: 'COMPLETED' } },
      { id: 'end-nok', type: 'end', position: { x: 450, y: 600 }, data: { label: 'Admissão Negada', status: 'REJECTED' } },
    ],
    edges: [
      { id: 'e1', source: 'start',         target: 'step-rh' },
      { id: 'e2', source: 'step-rh',       target: 'step-gestor',   label: 'aprovado' },
      { id: 'e3', source: 'step-rh',       target: 'end-nok',       label: 'rejeitado' },
      { id: 'e4', source: 'step-gestor',   target: 'step-diretoria', label: 'aprovado' },
      { id: 'e5', source: 'step-gestor',   target: 'end-nok',       label: 'rejeitado' },
      { id: 'e6', source: 'step-diretoria', target: 'end-ok',       label: 'aprovado' },
      { id: 'e7', source: 'step-diretoria', target: 'end-nok',      label: 'rejeitado' },
    ],
  };

  await prisma.workflowVersion.upsert({
    where: { workflowId_versionNumber: { workflowId: wfAdmissao.id, versionNumber: 1 } },
    update: {},
    create: {
      workflowId: wfAdmissao.id,
      versionNumber: 1,
      status: WorkflowVersionStatus.PUBLISHED,
      graphJson: graphAdmissao,
      changelog: 'Versão inicial — 3 etapas sequenciais',
      publishedAt: new Date(),
      publishedById: adminUser.id,
    },
  });

  console.log('✅ 2 workflows demo criados');
  console.log('\n🎉 Seed concluído com sucesso!\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
