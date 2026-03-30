import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  BackgroundVariant, Connection, Node, NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { nodeTypes } from '../components/designer/NodeTypes'
import { PropertiesPanel } from '../components/designer/PropertiesPanel'
import { Button, Badge, Spinner } from '../components/ui'
import {
  Save, Rocket, User, GitBranch, Bell, XSquare,
  CheckSquare, History, Trash2, Pencil, Users,
  Timer, FileText, Repeat, Mail, Globe, StopCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const PALETTE_GROUPS = [
  {
    label: 'Aprovação',
    items: [
      { type: 'approval',          label: 'Aprovação simples',   icon: User,        color: 'blue',   data: {} },
      { type: 'parallel_approval', label: 'Aprovação paralela',  icon: Users,       color: 'teal',   data: { assignees: [], approvalRule: 'ALL' } },
    ],
  },
  {
    label: 'Fluxo',
    items: [
      { type: 'gateway',  label: 'Gateway condicional', icon: GitBranch, color: 'amber',  data: { conditions: [] } },
      { type: 'sla_timer',label: 'Temporizador SLA',    icon: Timer,     color: 'orange', data: { durationHours: 24, actionOnTimeout: 'ESCALATE' } },
      { type: 'loop',     label: 'Loop / Repetição',    icon: Repeat,    color: 'amber',  data: { maxIterations: 3 } },
    ],
  },
  {
    label: 'Ações',
    items: [
      { type: 'notification', label: 'Notificação in-app', icon: Bell,      color: 'purple', data: { channel: 'inapp' } },
      { type: 'email',        label: 'Enviar e-mail',      icon: Mail,      color: 'pink',   data: {} },
      { type: 'webhook',      label: 'Webhook HTTP',       icon: Globe,     color: 'gray',   data: { method: 'POST' } },
      { type: 'form',         label: 'Formulário',         icon: FileText,  color: 'teal',   data: { fields: [] } },
    ],
  },
  {
    label: 'Finais',
    items: [
      { type: 'end', label: 'Fim (aprovado)',  icon: CheckSquare, color: 'green', data: { label: 'Aprovado',  status: 'COMPLETED' } },
      { type: 'end', label: 'Fim (rejeitado)', icon: XSquare,     color: 'red',   data: { label: 'Rejeitado', status: 'REJECTED' } },
      { type: 'end', label: 'Fim (cancelado)', icon: StopCircle,  color: 'gray',  data: { label: 'Cancelado', status: 'CANCELLED' } },
    ],
  },
]

const ICON_CLASSES: Record<string, { bg: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600' },
  gray:   { bg: 'bg-neutral-100', text: 'text-neutral-500' },
}

const PROTECTED_TYPES = ['start']

function PublishModal({ workflowId, versionId, onClose, onPublished }: {
  workflowId: string; versionId: string; onClose: () => void; onPublished: () => void
}) {
  const [changelog, setChangelog] = useState('')
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch(`/workflows/${workflowId}/versions/${versionId}/publish`).then(r => r.data),
    onSuccess: () => { toast.success('Versão publicada!'); onPublished(); onClose() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao publicar'),
  })
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-lg w-full max-w-md p-5">
        <h2 className="text-sm font-semibold mb-1">Publicar versão</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Após publicar, esta versão se torna imutável. Novas instâncias usarão ela.
        </p>
        <textarea value={changelog} onChange={e => setChangelog(e.target.value)} rows={3}
          placeholder="O que mudou? (opcional)"
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none mb-4" />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={isPending} icon={<Rocket size={13} />} onClick={() => mutate()}>
            Publicar agora
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditWorkflowModal({ workflow, onClose, onSaved }: {
  workflow: any; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch(`/workflows/${workflow.id}`, {
      name: name.trim(),
      description: description.trim() || null,
    }).then(r => r.data),
    onSuccess: () => { toast.success('Workflow atualizado'); onSaved(); onClose() },
    onError: () => toast.error('Erro ao atualizar'),
  })
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-lg w-full max-w-md p-5">
        <h2 className="text-sm font-semibold mb-4">Editar workflow</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" />
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

export function WorkflowDesignerPage() {
  const { workflowId, versionId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isDragOverTrash, setIsDragOverTrash] = useState(false)
  const [isSavingBeforePublish, setIsSavingBeforePublish] = useState(false)
  const [savedVersionId, setSavedVersionId] = useState<string | null>(null)
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false)

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.get(`/workflows/${workflowId}`).then(r => r.data),
    enabled: !!workflowId,
  })

  const latestVersion =
    workflow?.versions?.find((v: any) => v.status === 'DRAFT') ||
    workflow?.versions?.find((v: any) => v.status === 'PUBLISHED') ||
    workflow?.versions?.[0]

  const targetVersionId = versionId || latestVersion?.id

  const { data: version } = useQuery({
    queryKey: ['version', targetVersionId],
    queryFn: () => api.get(`/workflows/${workflowId}/versions/${targetVersionId}`).then(r => r.data),
    enabled: !!targetVersionId && !!workflowId,
  })

  useEffect(() => {
    if (!version?.graphJson) return
    const graph = version.graphJson as any
    if (graph.nodes?.length) {
      setNodes(graph.nodes)
      setEdges(graph.edges || [])
    } else {
      setNodes([{ id: 'start', type: 'start', position: { x: 300, y: 60 }, data: { label: 'Início' } }])
      setEdges([])
    }
    setIsDirty(false)
  }, [version?.id])

  // Ensure Start node always exists
  useEffect(() => {
    if (nodes.length === 0) return
    if (!nodes.some(n => n.type === 'start')) {
      setNodes(nds => [
        { id: 'start', type: 'start', position: { x: 300, y: 60 }, data: { label: 'Início' } },
        ...nds,
      ])
      toast('Nó de Início restaurado', { icon: 'ℹ️' })
    }
  }, [nodes.length])

  const { mutate: saveDraft, isPending: isSaving } = useMutation({
    mutationFn: () => api.post(`/workflows/${workflowId}/versions/draft`, {
      graphJson: { nodes, edges },
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Rascunho salvo')
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['workflow', workflowId] })
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  async function saveAndPublish() {
    // Validate canvas before anything
    const hasStart = nodes.some(n => n.type === 'start')
    const hasEnd = nodes.some(n => n.type === 'end')
    if (!hasStart) {
      toast.error('O workflow precisa ter um nó de Início')
      return
    }
    if (!hasEnd) {
      toast.error('O workflow precisa ter pelo menos um nó de Fim')
      return
    }
    if (nodes.length < 3) {
      toast.error('Adicione pelo menos uma etapa entre o Início e o Fim')
      return
    }

    // Save current canvas and get the real version ID back
    setIsSavingBeforePublish(true)
    try {
      const saved = await api.post(`/workflows/${workflowId}/versions/draft`, {
        graphJson: { nodes, edges },
      }).then(r => r.data)
      setIsDirty(false)
      // Use the ID of the saved version (may differ from targetVersionId if new version was created)
      setSavedVersionId(saved.id)
      qc.invalidateQueries({ queryKey: ['workflow', workflowId] })
      setShowPublish(true)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar antes de publicar')
    } finally {
      setIsSavingBeforePublish(false)
    }
  }

  async function createNewVersion() {
    setIsCreatingNewVersion(true)
    try {
      // Create a new draft version copying current graph
      const saved = await api.post(`/workflows/${workflowId}/versions/draft`, {
        graphJson: { nodes, edges },
      }).then(r => r.data)
      // Invalidate so the new DRAFT version is picked up
      await qc.invalidateQueries({ queryKey: ['workflow', workflowId] })
      await qc.invalidateQueries({ queryKey: ['version', saved.id] })
      toast.success(`Nova versão v${saved.versionNumber} criada como rascunho`)
      setIsDirty(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao criar nova versão')
    } finally {
      setIsCreatingNewVersion(false)
    }
  }

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, animated: false }, eds))
    setIsDirty(true)
  }, [setEdges])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const filtered = changes.filter(change => {
      if (change.type === 'remove') {
        const node = nodes.find(n => n.id === change.id)
        if (node && PROTECTED_TYPES.includes(node.type || '')) {
          toast.error('O nó de Início não pode ser removido')
          return false
        }
      }
      return true
    })
    onNodesChange(filtered)
  }, [nodes, onNodesChange])

  function addNode(type: string, extraData?: any) {
    const id = `${type}-${Date.now()}`
    setNodes(nds => [...nds, {
      id, type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 120 },
      data: { label: type === 'approval' ? 'Nova aprovação' : '', ...extraData },
    }])
    setIsDirty(true)
  }

  function handleNodeDataChange(nodeId: string, data: any) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n))
    setIsDirty(true)
  }

  function deleteSelectedNode() {
    if (!selectedNode) return
    if (PROTECTED_TYPES.includes(selectedNode.type || '')) {
      toast.error('O nó de Início não pode ser removido')
      return
    }
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id))
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
    setIsDirty(true)
    toast.success('Nó removido')
  }

  const canDelete = selectedNode && !PROTECTED_TYPES.includes(selectedNode.type || '')
  const isPublished = version?.status === 'PUBLISHED'
  const isDraft = version?.status === 'DRAFT'

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center"><Spinner size={24} /></div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{workflow?.name}</span>
          {!isPublished && (
            <button onClick={() => setShowEdit(true)} className="text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0" title="Editar">
              <Pencil size={13} />
            </button>
          )}
          {version && (
            <Badge variant={isPublished ? 'success' : 'warning'}>
              v{version.versionNumber} · {isPublished ? 'Publicado' : 'Rascunho'}
            </Badge>
          )}
          {isDirty && <span className="text-[10px] text-orange-500 flex-shrink-0">● não salvo</span>}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" icon={<History size={13} />} onClick={() => navigate('/workflows')}>Voltar</Button>
        {isDraft && (
          <Button variant="secondary" size="sm" loading={isSaving} icon={<Save size={13} />} onClick={() => saveDraft()} disabled={!isDirty}>
            Salvar rascunho
          </Button>
        )}
        {isDraft && (
          <Button variant="primary" size="sm" icon={<Rocket size={13} />} loading={isSavingBeforePublish} onClick={saveAndPublish}>Publicar</Button>
        )}
        {isPublished && (
          <Button variant="secondary" size="sm" loading={isCreatingNewVersion} icon={<Pencil size={13} />} onClick={createNewVersion}>
            Criar nova versão
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-52 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Componentes</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {PALETTE_GROUPS.map(group => (
              <div key={group.label} className="mb-1">
                <p className="px-3 py-1 text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{group.label}</p>
                {group.items.map((item, i) => {
                  const Icon = item.icon
                  const cls = ICON_CLASSES[item.color] || ICON_CLASSES.gray
                  return (
                    <button key={i}
                      onClick={() => !isPublished && addNode(item.type, item.data)}
                      disabled={isPublished}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                        isPublished ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-50 cursor-pointer',
                      )}
                    >
                      <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', cls.bg)}>
                        <Icon size={10} className={cls.text} />
                      </div>
                      <span className="text-[11px] text-neutral-700 dark:text-neutral-300">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Trash zone */}
          {!isPublished && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOverTrash(true) }}
              onDragLeave={() => setIsDragOverTrash(false)}
              onDrop={e => { e.preventDefault(); setIsDragOverTrash(false); if (selectedNode) deleteSelectedNode() }}
              onClick={() => canDelete && deleteSelectedNode()}
              className={clsx(
                'mx-2 mb-2 rounded-lg border-2 border-dashed p-2.5 flex items-center gap-2 transition-all',
                isDragOverTrash ? 'border-red-400 bg-red-50' :
                canDelete ? 'border-neutral-300 bg-neutral-50 cursor-pointer hover:border-red-300 hover:bg-red-50' :
                'border-neutral-200 opacity-30',
              )}
            >
              <Trash2 size={14} className={isDragOverTrash ? 'text-red-500' : 'text-neutral-400'} />
              <span className={clsx('text-[10px] leading-tight', isDragOverTrash ? 'text-red-500' : 'text-neutral-400')}>
                {isDragOverTrash ? 'Solte para deletar' : canDelete ? 'Deletar selecionado' : 'Selecione um nó'}
              </span>
            </div>
          )}

          {isPublished && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Somente leitura.</p>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-neutral-50 dark:bg-neutral-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={changes => { handleNodesChange(changes); setIsDirty(true) }}
            onEdgesChange={changes => { onEdgesChange(changes); setIsDirty(true) }}
            onConnect={isPublished ? undefined : onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            nodesDraggable={!isPublished}
            nodesConnectable={!isPublished}
            elementsSelectable
            deleteKeyCode={isPublished ? null : ['Delete', 'Backspace']}
            onNodesDelete={deleted => {
              const hasProtected = deleted.some(n => PROTECTED_TYPES.includes(n.type || ''))
              if (hasProtected) {
                toast.error('O nó de Início não pode ser removido')
                setNodes(nds => {
                  const toRestore = deleted.filter(n => PROTECTED_TYPES.includes(n.type || ''))
                  return [...nds, ...toRestore]
                })
              }
              if (deleted.some(n => n.id === selectedNode?.id)) setSelectedNode(null)
            }}
            onEdgesDelete={() => setIsDirty(true)}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e7e5e4" />
            <Controls />
            <MiniMap
              nodeColor={n => {
                const c: Record<string, string> = {
                  start: '#22c55e', end: '#ef4444', approval: '#3b82f6',
                  parallel_approval: '#14b8a6', gateway: '#f59e0b',
                  sla_timer: '#f97316', notification: '#a855f7',
                  email: '#ec4899', webhook: '#6b7280', form: '#14b8a6', loop: '#f59e0b',
                }
                return c[n.type || ''] || '#d6d3d1'
              }}
              className="border border-neutral-200 rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* Properties panel */}
        <div className="w-60 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex-shrink-0 flex flex-col">
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Propriedades</p>
            {canDelete && !isPublished && (
              <button onClick={deleteSelectedNode} className="text-neutral-400 hover:text-red-500 transition-colors" title="Deletar (Delete)">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel node={selectedNode} onChange={isPublished ? () => {} : handleNodeDataChange} />
          </div>
          {canDelete && !isPublished && (
            <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
              <button onClick={deleteSelectedNode}
                className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors border border-red-200">
                <Trash2 size={12} /> Deletar nó selecionado
              </button>
            </div>
          )}
        </div>
      </div>

      {showPublish && (savedVersionId || targetVersionId) && (
        <PublishModal
          workflowId={workflowId!}
          versionId={(savedVersionId || targetVersionId)!}
          onClose={() => { setShowPublish(false); setSavedVersionId(null) }}
          onPublished={() => {
            qc.invalidateQueries({ queryKey: ['workflow', workflowId] })
            qc.invalidateQueries({ queryKey: ['version', savedVersionId || targetVersionId] })
            setSavedVersionId(null)
          }}
        />
      )}

      {showEdit && workflow && (
        <EditWorkflowModal workflow={workflow} onClose={() => setShowEdit(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['workflow', workflowId] })} />
      )}
    </div>
  )
}
