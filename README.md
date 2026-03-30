<div align="center">
  <img src="frontend/public/img/Logo.png" alt="Workflow" width="100" />
  <h1>Workflow Approval Engine</h1>
  <p>Motor de aprovação corporativo com designer visual, SLA, auditoria e controle de acesso por perfil.</p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
  ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
</div>

---

## Sobre o projeto

O **Workflow Approval Engine** é uma plataforma para criação e execução de fluxos de aprovação empresariais. Diferente de ferramentas genéricas, ele trata cada workflow como um artefato versionado com execução real de regras de negócio.

### Principais funcionalidades

- **Designer visual** — arraste e solte componentes para montar fluxos com ramificações, paralelos e condicionais
- **Motor de execução** — avalia condições, roteia aprovações e escala automaticamente quando o SLA vence
- **Versionamento** — publique novas versões sem afetar instâncias em andamento
- **Auditoria completa** — cada decisão registra usuário, data, comentário e evidências
- **RBAC granular** — Admin, Gestor, Aprovador e Auditor com permissões por módulo
- **Dashboard** — KPIs em tempo real, gargalos por etapa, taxa de aprovação e SLA
- **Dark mode** — alternável a qualquer momento pela sidebar

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Designer visual | React Flow |
| Estado global | Zustand |
| Queries / cache | TanStack Query v5 |
| Backend | NestJS + TypeScript |
| Banco de dados | PostgreSQL via Supabase |
| ORM | Prisma |
| Filas SLA | Upstash Redis |
| Autenticação | JWT + Refresh Token |
| Estilo | Tailwind CSS |

---

## Pré-requisitos

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Conta Supabase** (gratuita) — [supabase.com](https://supabase.com)
- **Conta Upstash** (gratuita, opcional) — [upstash.com](https://upstash.com)

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/workflow-engine.git
cd workflow-engine
```

### 2. Configure as variáveis de ambiente

```bash
cd backend
cp .env
```

Edite o `backend/.env` com suas credenciais:

```env
# Supabase — Settings → Database → Connection string
# Aba "Transaction" (porta 6543) — adicione ?pgbouncer=true
DATABASE_URL="postgresql://postgres.SEU-REF:SENHA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Aba "URI" (porta 5432) — para migrations
DIRECT_URL="postgresql://postgres:SENHA@db.SEU-REF.supabase.co:5432/postgres"

# Upstash Redis (opcional — para SLA automático)
UPSTASH_REDIS_REST_URL="https://seu-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="seu-token"

# JWT — use frases longas e diferentes entre si
JWT_SECRET="sua-chave-secreta-com-minimo-32-caracteres"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="outra-chave-diferente-tambem-32-chars"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Instale as dependências

```bash
# Backend
cd backend && npm install

# Frontend (novo terminal)
cd frontend && npm install
```

### 4. Crie as tabelas e popule o banco

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 5. Rode o projeto

**Terminal 1 — Backend:**
```bash
cd backend
npm run start:dev
# API: http://localhost:3001/api/v1
# Swagger: http://localhost:3001/api/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App: http://localhost:5173
```

---

## Usuários de teste

Veja [USUARIOS.md](./USUARIOS.md) para a lista completa de logins e senhas criados pelo seed.

Login rápido para começar:

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@workflow.dev | Admin@2024 | Admin |
| carlos.lima@workflow.dev | Gestor@2024 | Gestor |
| ana.beatriz@workflow.dev | Aprovador@2024 | Aprovador |

---

## Estrutura do projeto

```
workflow-engine/
├── backend/                   # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma      # Schema do banco (fonte da verdade)
│   │   └── seed.ts            # Usuários e workflows de demonstração
│   └── src/
│       └── modules/
│           ├── auth/          # JWT, refresh token, guards
│           ├── workflows/     # CRUD + versionamento
│           ├── engine/        # Motor de execução dos fluxos
│           ├── instances/     # Instâncias em andamento
│           ├── inbox/         # Fila de aprovações do usuário
│           ├── audit/         # Trilha de auditoria imutável
│           ├── sla/           # Cron de verificação de SLA
│           ├── analytics/     # KPIs e gargalos
│           ├── notifications/ # In-app e e-mail
│           └── users/         # Usuários e perfis
└── frontend/                  # React + Vite
    └── src/
        ├── components/
        │   ├── designer/      # Nós e painel de propriedades
        │   ├── layout/        # Sidebar e header
        │   └── ui/            # Componentes base
        ├── pages/             # Todas as telas
        ├── store/             # Zustand (auth + UI)
        ├── hooks/             # TanStack Query hooks
        └── lib/               # axios, dateUtils, cn
```

---

## Componentes do designer

O designer suporta 12 tipos de nós:

| Nó | Descrição |
|----|-----------|
| Início | Ponto de entrada do fluxo |
| Aprovação simples | Um responsável decide |
| Aprovação paralela | Múltiplos aprovadores simultâneos |
| Gateway condicional | Roteamento por regras de negócio |
| Temporizador SLA | Espera com ação ao vencer |
| Notificação | Alerta in-app ou e-mail |
| Enviar e-mail | E-mail direto para destinatário |
| Webhook HTTP | Chamada a sistema externo |
| Formulário | Coleta de dados durante o fluxo |
| Loop | Repetição com condição de saída |
| Fim (aprovado) | Conclusão com sucesso |
| Fim (rejeitado) | Conclusão com rejeição |

---

## Comandos úteis

```bash
# Ver banco de dados visualmente
cd backend && npx prisma studio

# Recriar banco do zero
cd backend && npx prisma migrate reset --force && npm run prisma:seed

# Build de produção
cd frontend && npm run build
cd backend  && npm run build
```

---

## Licença

MIT
