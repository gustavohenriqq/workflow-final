import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import {
  Card, Button, Badge, EmptyState, Spinner,
  SlaStatusBadge, StepStatusBadge,
} from '../components/ui'
import { Inbox, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

function DecisionModal({
  step, onClose,
}: {
  step: any
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  const [comment, setComment] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) =>
      api.post(`/instances/step-executions/${step.id}/decide`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success(action === 'APPROVE' ? 'Aprovado com sucesso!' : 'Rejeitado.')
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['inbox-count'] })
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao registrar decisão'),
  })

  const requireComment = step.instance && action === 'REJECT'

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-lg p-5">
        <h2 className="text-sm font-semibold mb-1">Registrar decisão</h2>
        <p className="text-xs text-neutral-500 mb-4">
          {step.instance?.title} ·{' '}
          {step.instance?.workflowVersion?.workflow?.name}
        </p>

        {/* Action toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAction('APPROVE')}
            className={`flex-1 h-9 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
              action === 'APPROVE'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <CheckCircle2 size={13} /> Aprovar
          </button>
          <button
            onClick={() => setAction('REJECT')}
            className={`flex-1 h-9 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
              action === 'REJECT'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <XCircle size={13} /> Rejeitar
          </button>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Comentário {requireComment && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={action === 'APPROVE' ? 'Observações (opcional)...' : 'Justifique a rejeição...'}
            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant={action === 'APPROVE' ? 'primary' : 'danger'}
            loading={isPending}
            disabled={requireComment && !comment.trim()}
            onClick={() => mutate({ action, comment: comment.trim() || undefined })}
          >
            Confirmar {action === 'APPROVE' ? 'aprovação' : 'rejeição'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InboxPage() {
  const navigate = useNavigate()
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api.get('/inbox').then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['inbox-history'],
    queryFn: () => api.get('/inbox/history').then((r) => r.data),
    enabled: tab === 'history',
  })

  const pending = pendingData?.data || []
  const history = historyData?.data || []

  function getSlaColor(status: string) {
    if (status === 'expired' || status === 'critical') return 'border-l-red-400'
    if (status === 'warning') return 'border-l-yellow-400'
    return 'border-l-transparent'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Inbox"
        description="Aprovações aguardando sua decisão"
      />

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6">
        <div className="flex gap-6">
          {[
            { key: 'pending', label: 'Pendentes', count: pending.length },
            { key: 'history', label: 'Histórico' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {tab === 'pending' && (
          <>
            {pendingLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : pending.length === 0 ? (
              <EmptyState
                icon={<Inbox size={18} />}
                title="Nada pendente"
                description="Você não tem aprovações aguardando. Aproveite para tomar um café ☕"
              />
            ) : (
              <div className="space-y-3">
                {pending.map((step: any) => (
                  <div
                    key={step.id}
                    className={`bg-white border border-neutral-200 border-l-4 rounded-lg p-4 ${getSlaColor(step.slaStatus)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title + badges */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {step.instance?.title}
                          </h3>
                          <SlaStatusBadge status={step.slaStatus} />
                        </div>

                        <p className="text-xs text-neutral-500 mb-2">
                          {step.instance?.workflowVersion?.workflow?.name} · Etapa:{' '}
                          <span className="font-medium">{step.stepDefinitionId}</span> · Solicitante:{' '}
                          {step.instance?.startedBy?.name}
                        </p>

                        <div className="flex items-center gap-4 text-[10px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Aguardando{' '}
                            {formatDistanceToNow(new Date(step.startedAt), { addSuffix: false, locale: ptBR })}
                          </span>
                          {step.slaDeadline && (
                            <span className={step.slaStatus === 'expired' ? 'text-red-500' : ''}>
                              SLA: {format(new Date(step.slaDeadline), 'dd/MM HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<ChevronRight size={13} />}
                          onClick={() => navigate(`/instances/${step.instance?.id}`)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => setSelectedStep(step)}
                        >
                          Decidir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {historyLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={<Clock size={18} />}
                title="Sem histórico ainda"
                description="Suas decisões aparecerão aqui após você aprovar ou rejeitar etapas"
              />
            ) : (
              <div className="space-y-2">
                {history.map((step: any) => {
                  const decision = step.decisions?.[0]
                  return (
                    <Card key={step.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 truncate">
                            {step.instance?.title}
                          </p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {step.instance?.workflowVersion?.workflow?.name} ·{' '}
                            {decision && formatDistanceToNow(new Date(decision.decidedAt), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <StepStatusBadge status={step.status} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedStep && (
        <DecisionModal step={selectedStep} onClose={() => setSelectedStep(null)} />
      )}
    </div>
  )
}
