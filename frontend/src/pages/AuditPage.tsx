import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, Badge, Spinner, EmptyState } from '../components/ui'
import { ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACTION_LABELS: Record<string, { label: string; variant: any }> = {
  'workflow.created': { label: 'Workflow criado', variant: 'info' },
  'workflow.published': { label: 'Versão publicada', variant: 'success' },
  'version.created': { label: 'Versão criada', variant: 'default' },
  'instance.created': { label: 'Instância iniciada', variant: 'info' },
  'instance.cancelled': { label: 'Instância cancelada', variant: 'danger' },
  'decision.made': { label: 'Decisão registrada', variant: 'success' },
  'sla.expired': { label: 'SLA expirado', variant: 'warning' },
  'user.created': { label: 'Usuário criado', variant: 'default' },
}

export function AuditPage() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-events', entityType, action],
    queryFn: () =>
      api.get('/audit-events', {
        params: {
          entityType: entityType || undefined,
          action: action || undefined,
          limit: 50,
        },
      }).then((r) => r.data),
  })

  const events = data?.data || []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Trilha de auditoria"
        description="Registro imutável de todas as ações do sistema"
      />

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-8 px-3 text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/10"
        >
          <option value="">Todos os tipos</option>
          <option value="WorkflowVersion">Workflow</option>
          <option value="WorkflowInstance">Instância</option>
          <option value="StepExecution">Etapa</option>
          <option value="User">Usuário</option>
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-8 px-3 text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/10"
        >
          <option value="">Todas as ações</option>
          {Object.keys(ACTION_LABELS).map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={18} />}
            title="Nenhum evento encontrado"
            description="Os eventos de auditoria aparecem aqui conforme o sistema é utilizado"
          />
        ) : (
          <div className="space-y-2">
            {events.map((event: any) => {
              const cfg = ACTION_LABELS[event.action] || { label: event.action, variant: 'default' }
              return (
                <Card key={event.id} className="p-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {event.entityType} · {event.entityId?.slice(0, 8)}…
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                        {event.actor && (
                          <span className="font-medium text-neutral-600">{event.actor.name}</span>
                        )}
                        <span>{event.actor?.email}</span>
                        {event.metadata?.ip && <span>IP: {event.metadata.ip}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 flex-shrink-0">
                      {format(new Date(event.occurredAt), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
