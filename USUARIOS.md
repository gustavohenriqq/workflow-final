# Usuários de Teste

> Todos os usuários pertencem ao tenant `tenant-demo-001`.
> Após rodar `npm run prisma:seed`, estes usuários estarão disponíveis.

---

## Perfis disponíveis

| Perfil | Permissões |
|--------|-----------|
| **Admin** | Acesso total — usuários, workflows, instâncias, auditoria |
| **Gestor** | Criar/editar/publicar workflows, iniciar e cancelar instâncias |
| **Aprovador** | Visualizar instâncias, decidir aprovações no Inbox |
| **Auditor** | Somente leitura — workflows, instâncias e auditoria |

---

## Lista de usuários

### Administração

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Admin Sistema | admin@workflow.dev | Admin@2024 | Admin |

### Gestores

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Carlos Lima | carlos.lima@workflow.dev | Gestor@2024 | Gestor |
| Fernanda Souza | fernanda.souza@workflow.dev | Gestor@2024 | Gestor |
| Rafael Santos | rafael.santos@workflow.dev | Gestor@2024 | Gestor |

### Aprovadores — Diretoria

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Ana Beatriz | ana.beatriz@workflow.dev | Aprovador@2024 | Aprovador |
| Marcos Oliveira | marcos.oliveira@workflow.dev | Aprovador@2024 | Aprovador |

### Aprovadores — Financeiro

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Roberto Souza | roberto.souza@workflow.dev | Aprovador@2024 | Aprovador |
| Juliana Costa | juliana.costa@workflow.dev | Aprovador@2024 | Aprovador |

### Aprovadores — Jurídico

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Patrícia Mendes | patricia.mendes@workflow.dev | Aprovador@2024 | Aprovador |

### Aprovadores — TI / Segurança

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Thiago Ferreira | thiago.ferreira@workflow.dev | Aprovador@2024 | Aprovador |
| Camila Rocha | camila.rocha@workflow.dev | Aprovador@2024 | Aprovador |

### Aprovadores — RH

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Lucas Martins | lucas.martins@workflow.dev | Aprovador@2024 | Aprovador |
| Beatriz Alves | beatriz.alves@workflow.dev | Aprovador@2024 | Aprovador |

### Auditores

| Nome | E-mail | Senha | Perfil |
|------|--------|-------|--------|
| Auditoria Interna | auditoria@workflow.dev | Auditor@2024 | Auditor |
| Compliance | compliance@workflow.dev | Auditor@2024 | Auditor |

---

## Workflows de demonstração

Dois workflows são criados automaticamente pelo seed:

**1. Aprovação de Compras**
- Gestor aprova → Gateway verifica valor
- Se > R$ 10.000 → Diretoria aprova também
- Todos com SLA configurado

**2. Admissão de Colaboradores**
- RH → Gestor da Área → Diretoria (sequencial)
- SLAs: 48h / 24h / 72h

---

> ⚠️ Este arquivo é apenas para desenvolvimento local.
> Nunca suba credenciais reais para o repositório.
