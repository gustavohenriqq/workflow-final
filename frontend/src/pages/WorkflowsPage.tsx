import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, Spinner } from '../components/ui'
import { GitBranch, Plus, ChevronRight, ExternalLink, Trash2, MoreVertical, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth.store'

function CreateWorkflowModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/workflows', data).then(r => r.data),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow criado!')
      onClose()
      navigate(`/workflows/${wf.id}/designer`)
    },
    onError: () => toast.error('Erro ao criar workflow'),
  })

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-md p-5">
        <h2 className="text-sm font-semibold mb-4">Novo workflow</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Aprovação de Compras"
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              onKeyDown={e => e.key === 'Enter' && name.trim() && mutate({ name: name.trim(), description: description.trim() || null })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o objetivo..." rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={isPending} disabled={!name.trim()}
            onClick={() => mutate({ name: name.trim(), description: description.trim() || null })}>
            Criar e abrir designer
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteWorkflowModal({ workflow, onClose }: { workflow: any; onClose: () => void }) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch(`/workflows/${workflow.id}/archive`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow arquivado')
      onClose()
    },
    onError: () => toast.error('Erro ao arquivar workflow'),
  })

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 size={15} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Arquivar workflow</h2>
            <p className="text-xs text-neutral-500 mt-1">
              "{workflow.name}" será arquivado. Instâncias em andamento não serão afetadas.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" loading={isPending} onClick={() => mutate()}>
            Arquivar
          </Button>
        </div>
      </div>
    </div>
  )
}

function WorkflowMenu({ workflow, onEdit, onDelete }: { workflow: any; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-44">
            <button onClick={e => { e.stopPropagation(); setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left">
              <Pencil size={12} /> Editar nome/descrição
            </button>
            <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left">
              <Trash2 size={12} /> Arquivar workflow
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EditNameModal({ workflow, onClose }: { workflow: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(workflow.name)
  const [description, setDescription] = useState(workflow.description || '')
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch(`/workflows/${workflow.id}`, {
      name: name.trim(),
      description: description.trim() || null,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Atualizado'); onClose() },
    onError: () => toast.error('Erro ao atualizar'),
  })
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-md p-5">
        <h2 className="text-sm font-semibold mb-4">Editar workflow</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={isPending} disabled={!name.trim()} onClick={() => mutate()}>Salvar</Button>
        </div>
      </div>
    </div>
  )
}

function getVersionBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    DRAFT:       { label: 'Rascunho',   variant: 'warning' },
    PUBLISHED:   { label: 'Publicado',  variant: 'success' },
    DEPRECATED:  { label: 'Depreciado', variant: 'muted' },
  }
  const cfg = map[status] || { label: status, variant: 'default' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function WorkflowsPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then(r => r.data),
  })

  const workflows = data?.data || []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Workflows"
        description="Gerencie e versione seus fluxos de aprovação"
        action={
          hasPermission('workflows:create') && (
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
              Novo workflow
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={18} />}
            title="Nenhum workflow criado"
            description="Crie seu primeiro workflow de aprovação para começar"
            action={
              hasPermission('workflows:create') && (
                <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
                  Criar workflow
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-4xl">
            {workflows.map((wf: any) => {
              const latest = wf.versions?.[0]
              return (
                <Card
                  key={wf.id}
                  className="p-4 hover:border-neutral-300 cursor-pointer transition-colors"
                  onClick={() => navigate(`/workflows/${wf.id}/designer`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      <GitBranch size={16} className="text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{wf.name}</h3>
                        {latest && getVersionBadge(latest.status)}
                        {latest && <span className="text-[10px] text-neutral-400 dark:text-neutral-500">v{latest.versionNumber}</span>}
                      </div>
                      {wf.description && (
                        <p className="text-xs text-neutral-500 truncate">{wf.description}</p>
                      )}
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        por {wf.createdBy?.name} ·{' '}
                        {formatDistanceToNow(new Date(wf.createdAt), { addSuffix: true, locale: ptBR })} ·{' '}
                        {wf._count?.versions || 0} versão(ões)
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" icon={<ExternalLink size={12} />}
                        onClick={() => navigate(`/instances?workflowId=${wf.id}`)}>
                        Instâncias
                      </Button>
                      {hasPermission('workflows:update') && (
                        <WorkflowMenu
                          workflow={wf}
                          onEdit={() => setEditTarget(wf)}
                          onDelete={() => setDeleteTarget(wf)}
                        />
                      )}
                      <ChevronRight size={14} className="text-neutral-300 ml-1" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateWorkflowModal onClose={() => setShowCreate(false)} />}
      {deleteTarget && <DeleteWorkflowModal workflow={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {editTarget && <EditNameModal workflow={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  )
}
