import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import {
  Card, Button, EmptyState, Spinner, InstanceStatusBadge, Badge,
} from '../components/ui'
import {
  ListChecks, Plus, ChevronRight, Clock,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth.store'

function StartInstanceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [workflowId, setWorkflowId] = useState('')
  const [title, setTitle] = useState('')
  const [contextJson, setContextJson] = useState('{\n  "valor": 5000,\n  "categoria": "TI"\n}')
  const [jsonError, setJsonError] = useState('')

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then((r) => r.data.data),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) => api.post('/instances', payload).then((r) => r.data),
    onSuccess: (inst) => {
      toast.success('Instância iniciada com sucesso!')
      qc.invalidateQueries({ queryKey: ['instances'] })
      onClose()
      navigate(`/instances/${inst.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao iniciar instância'),
  })

  function handleSubmit() {
    let contextData: any
    try {
      contextData = JSON.parse(contextJson)
      setJsonError('')
    } catch {
      setJsonError('JSON inválido')
      return
    }
    mutate({ workflowId, title: title.trim(), contextData })
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Iniciar nova instância</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Workflow *</label>
            <select
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 bg-white"
            >
              <option value="">Selecionar workflow...</option>
              {workflows?.map((wf: any) => (
                <option key={wf.id} value={wf.id}>{wf.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Compra Notebook - João Silva"
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Dados do contexto (JSON)
            </label>
            <textarea
              value={contextJson}
              onChange={(e) => { setContextJson(e.target.value); setJsonError('') }}
              rows={5}
              className={`w-full px-3 py-2 text-xs font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none ${jsonError ? 'border-red-400' : 'border-neutral-200'}`}
            />
            {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
            <p className="text-[10px] text-neutral-400 mt-1">
              Estes dados serão avaliados pelas condições do workflow (ex: valor, categoria)
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={isPending}
            disabled={!workflowId || !title.trim()}
            onClick={handleSubmit}
          >
            Iniciar instância
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InstancesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [showStart, setShowStart] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['instances', statusFilter],
    queryFn: () =>
      api.get('/instances', { params: { status: statusFilter || undefined, limit: 30 } })
        .then((r) => r.data),
  })

  const instances = data?.data || []

  const statuses = [
    { value: '', label: 'Todas' },
    { value: 'RUNNING', label: 'Em andamento' },
    { value: 'COMPLETED', label: 'Concluídas' },
    { value: 'REJECTED', label: 'Rejeitadas' },
    { value: 'CANCELLED', label: 'Canceladas' },
    { value: 'ESCALATED', label: 'Escaladas' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Instâncias"
        description="Acompanhe todos os processos em execução"
        action={
          hasPermission('instances:create') && (
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowStart(true)}>
              Nova instância
            </Button>
          )
        }
      />

      {/* Status filter tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6">
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                statusFilter === s.value
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : instances.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={18} />}
            title="Nenhuma instância encontrada"
            description="Inicie uma instância a partir de um workflow publicado"
            action={
              hasPermission('instances:create') && (
                <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowStart(true)}>
                  Nova instância
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2">
            {instances.map((inst: any) => (
              <Card
                key={inst.id}
                className="p-4 hover:border-neutral-300 cursor-pointer transition-colors"
                onClick={() => navigate(`/instances/${inst.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-neutral-900 truncate">{inst.title}</h3>
                      <InstanceStatusBadge status={inst.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                      <span>{inst.workflowVersion?.workflow?.name}</span>
                      <span>·</span>
                      <span>v{inst.workflowVersion?.versionNumber}</span>
                      <span>·</span>
                      <span>Iniciado por {inst.startedBy?.name}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {formatDistanceToNow(new Date(inst.startedAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Pending steps count */}
                  {inst.stepExecutions?.length > 0 && (
                    <Badge variant="warning">
                      {inst.stepExecutions.length} aguardando
                    </Badge>
                  )}

                  <ChevronRight size={14} className="text-neutral-300 flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showStart && <StartInstanceModal onClose={() => setShowStart(false)} />}
    </div>
  )
}
