import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import {
  Card, Button, Badge, Spinner,
  InstanceStatusBadge, StepStatusBadge,
} from '../components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, User,
  GitBranch, AlertTriangle, Ban,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth.store'

function ContextDataView({ data }: { data: any }) {
  return (
    <div className="bg-neutral-50 rounded-md p-3 font-mono text-xs text-neutral-600 overflow-x-auto">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

function TimelineStep({ step, isLast }: { step: any; isLast: boolean }) {
  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock size={14} className="text-yellow-500" />,
    IN_PROGRESS: <Clock size={14} className="text-blue-500" />,
    APPROVED: <CheckCircle2 size={14} className="text-green-500" />,
    REJECTED: <XCircle size={14} className="text-red-500" />,
    ESCALATED: <AlertTriangle size={14} className="text-orange-500" />,
    SKIPPED: <Ban size={14} className="text-neutral-400" />,
  }

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          step.status === 'APPROVED' ? 'bg-green-50' :
          step.status === 'REJECTED' ? 'bg-red-50' :
          step.status === 'PENDING' || step.status === 'IN_PROGRESS' ? 'bg-yellow-50' :
          'bg-neutral-100'
        }`}>
          {statusIcons[step.status] || <Clock size={14} />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1" />}
      </div>

      {/* Content */}
      <div className={`pb-6 flex-1 min-w-0 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-800">{step.stepDefinitionId}</span>
              <StepStatusBadge status={step.status} />
            </div>
            {step.assignee && (
              <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                <User size={10} /> {step.assignee.name} ({step.assignee.email})
              </p>
            )}
          </div>
          <div className="text-right text-[10px] text-neutral-400 flex-shrink-0">
            <p>{format(new Date(step.startedAt), 'dd/MM HH:mm', { locale: ptBR })}</p>
            {step.slaDeadline && (
              <p className={new Date(step.slaDeadline) < new Date() && !step.decidedAt ? 'text-red-500' : ''}>
                SLA: {format(new Date(step.slaDeadline), 'dd/MM HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Decisions */}
        {step.decisions?.length > 0 && (
          <div className="space-y-2 mt-2">
            {step.decisions.map((d: any) => (
              <div key={d.id} className={`rounded-md p-2.5 text-xs ${
                d.action === 'APPROVE' ? 'bg-green-50 border border-green-100' :
                d.action === 'REJECT' ? 'bg-red-50 border border-red-100' :
                'bg-neutral-50 border border-neutral-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-700">{d.actor.name}</span>
                  <span className="text-neutral-400">
                    {format(new Date(d.decidedAt), 'dd/MM HH:mm')}
                  </span>
                </div>
                {d.comment && (
                  <p className="text-neutral-600 italic">"{d.comment}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function InstanceDetailPage() {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const { data: instance, isLoading } = useQuery({
    queryKey: ['instance', instanceId],
    queryFn: () => api.get(`/instances/${instanceId}`).then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: () => api.patch(`/instances/${instanceId}/cancel`, { reason: 'Cancelado manualmente' }),
    onSuccess: () => {
      toast.success('Instância cancelada')
      qc.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao cancelar'),
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center"><Spinner size={24} /></div>
    )
  }

  if (!instance) return null

  const isActive = ['RUNNING', 'ESCALATED'].includes(instance.status)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title={instance.title}
        description={`${instance.workflowVersion?.workflow?.name} · v${instance.workflowVersion?.versionNumber}`}
        action={
          <div className="flex items-center gap-2">
            {isActive && hasPermission('instances:cancel') && (
              <Button
                variant="ghost"
                size="sm"
                loading={cancelling}
                icon={<Ban size={13} />}
                onClick={() => {
                  if (confirm('Cancelar esta instância?')) cancel()
                }}
              >
                Cancelar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={13} />}
              onClick={() => navigate('/instances')}
            >
              Voltar
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Main: Timeline */}
            <div className="col-span-2 space-y-4">
              <Card className="p-5">
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
                  Timeline do processo
                </h2>
                {instance.stepExecutions?.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Nenhuma etapa iniciada ainda</p>
                ) : (
                  <div>
                    {instance.stepExecutions.map((step: any, i: number) => (
                      <TimelineStep
                        key={step.id}
                        step={step}
                        isLast={i === instance.stepExecutions.length - 1}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar: Details */}
            <div className="space-y-4">
              {/* Status */}
              <Card className="p-4">
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                  Status
                </h3>
                <InstanceStatusBadge status={instance.status} />
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Iniciado em</span>
                    <span className="text-neutral-700">
                      {format(new Date(instance.startedAt), 'dd/MM/yy HH:mm')}
                    </span>
                  </div>
                  {instance.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Concluído em</span>
                      <span className="text-neutral-700">
                        {format(new Date(instance.completedAt), 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Duração</span>
                    <span className="text-neutral-700">
                      {formatDistanceToNow(new Date(instance.startedAt), { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Solicitante</span>
                    <span className="text-neutral-700">{instance.startedBy?.name}</span>
                  </div>
                </div>
              </Card>

              {/* Context data */}
              <Card className="p-4">
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                  Dados do processo
                </h3>
                <ContextDataView data={instance.contextData} />
              </Card>

              {/* Steps summary */}
              <Card className="p-4">
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">
                  Resumo das etapas
                </h3>
                <div className="space-y-1.5">
                  {instance.stepExecutions?.map((step: any) => (
                    <div key={step.id} className="flex justify-between items-center">
                      <span className="text-xs text-neutral-600 truncate flex-1 mr-2">
                        {step.stepDefinitionId}
                      </span>
                      <StepStatusBadge status={step.status} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
