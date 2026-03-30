import { useEffect, useState } from 'react'
import { Node } from '@xyflow/react'
import { Clock, User, Users, AlertTriangle, Plus, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface PropertiesPanelProps {
  node: Node | null
  onChange: (nodeId: string, data: any) => void
}

const inputCls = 'input w-full h-8 px-2.5 text-xs'
const labelCls = 'block text-[10px] font-medium uppercase tracking-wide mb-1'
const sectionCls = 'space-y-3 pt-3 border-t border-neutral-100'

export function PropertiesPanel({ node, onChange }: PropertiesPanelProps) {
  const [local, setLocal] = useState<any>({})

  useEffect(() => {
    if (node) setLocal({ ...(node.data as any) })
  }, [node?.id])

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
    staleTime: 60_000,
    retry: 2,
  })

  function update(key: string, value: any) {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    if (node) onChange(node.id, updated)
  }

  function updateSla(key: string, value: any) {
    update('sla', { ...(local.sla || {}), [key]: value })
  }

  function addAssignee(email: string) {
    const list: string[] = local.assignees || []
    if (!list.includes(email)) update('assignees', [...list, email])
  }

  function removeAssignee(email: string) {
    update('assignees', (local.assignees || []).filter((e: string) => e !== email))
  }

  if (!node) {
    return (
      <div className="p-4 text-xs text-neutral-400 text-center pt-8 leading-relaxed">
        Clique em um nó para editar suas propriedades
      </div>
    )
  }

  const type = node.type

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Type badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
          {type === 'approval' ? 'Aprovação' :
           type === 'parallel_approval' ? 'Aprovação Paralela' :
           type === 'gateway' ? 'Gateway Condicional' :
           type === 'sla_timer' ? 'Temporizador SLA' :
           type === 'notification' ? 'Notificação' :
           type === 'email' ? 'E-mail' :
           type === 'webhook' ? 'Webhook' :
           type === 'form' ? 'Formulário' :
           type === 'loop' ? 'Loop' :
           type === 'start' ? 'Início' :
           type === 'end' ? 'Fim' : type}
        </span>
      </div>

      {/* Label (all except start) */}
      {type !== 'start' && (
        <div>
          <label className={labelCls}>Nome da etapa</label>
          <input value={local.label || ''} onChange={e => update('label', e.target.value)}
            className={inputCls} placeholder="Nome desta etapa..." />
        </div>
      )}

      {/* ── APPROVAL ─────────────────────────────────────────────── */}
      {type === 'approval' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}><User size={9} className="inline mr-1" />Responsável</label>
            <select value={local.assigneeId || ''} onChange={e => {
              const u = users?.find((u: any) => u.id === e.target.value)
              update('assigneeId', e.target.value)
              update('assigneeEmail', u?.email || '')
            }} className={inputCls}>
              <option value="">Selecionar responsável...</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </select>
          </div>
          <SlaSection local={local} updateSla={updateSla} users={users} />
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={local.requireCommentOnReject || false}
                onChange={e => update('requireCommentOnReject', e.target.checked)} className="rounded" />
              <span className="text-neutral-600">Comentário obrigatório ao rejeitar</span>
            </label>
          </div>
        </div>
      )}

      {/* ── PARALLEL APPROVAL ────────────────────────────────────── */}
      {type === 'parallel_approval' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}><Users size={9} className="inline mr-1" />Aprovadores</label>
            <select onChange={e => { if (e.target.value) { addAssignee(e.target.value); e.target.value = '' } }}
              className={inputCls} defaultValue="">
              <option value="">Adicionar aprovador...</option>
              {users?.map((u: any) => <option key={u.id} value={u.email}>{u.name} — {u.email}</option>)}
            </select>
            {(local.assignees || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(local.assignees || []).map((email: string) => (
                  <div key={email} className="flex items-center justify-between bg-teal-50 rounded px-2 py-1">
                    <span className="text-[10px] text-teal-700 truncate">{email}</span>
                    <button onClick={() => removeAssignee(email)} className="text-teal-400 hover:text-red-500 ml-1">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Regra de aprovação</label>
            <select value={local.approvalRule || 'ALL'} onChange={e => update('approvalRule', e.target.value)} className={inputCls}>
              <option value="ALL">Todos devem aprovar</option>
              <option value="ANY">Qualquer um pode aprovar</option>
              <option value="MAJORITY">Maioria deve aprovar</option>
            </select>
          </div>
          <SlaSection local={local} updateSla={updateSla} users={users} />
        </div>
      )}

      {/* ── GATEWAY ──────────────────────────────────────────────── */}
      {type === 'gateway' && (
        <div className={sectionCls}>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            Condições são configuradas nas arestas de saída. Conecte o gateway a outros nós e clique na aresta para adicionar regras.
          </p>
          <div>
            <label className={labelCls}>Tipo de gateway</label>
            <select value={local.gatewayType || 'exclusive'} onChange={e => update('gatewayType', e.target.value)} className={inputCls}>
              <option value="exclusive">Exclusivo (só 1 ramo)</option>
              <option value="inclusive">Inclusivo (múltiplos ramos)</option>
            </select>
          </div>
          <ConditionBuilder local={local} update={update} />
        </div>
      )}

      {/* ── SLA TIMER ────────────────────────────────────────────── */}
      {type === 'sla_timer' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}><Clock size={9} className="inline mr-1" />Duração (horas)</label>
            <input type="number" min="1" value={local.durationHours || ''} placeholder="24"
              onChange={e => update('durationHours', parseInt(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}><AlertTriangle size={9} className="inline mr-1" />Ação ao vencer</label>
            <select value={local.actionOnTimeout || 'ESCALATE'} onChange={e => update('actionOnTimeout', e.target.value)} className={inputCls}>
              <option value="ESCALATE">Escalar para substituto</option>
              <option value="AUTO_APPROVE">Aprovar automaticamente</option>
              <option value="AUTO_REJECT">Rejeitar automaticamente</option>
            </select>
          </div>
          {local.actionOnTimeout === 'ESCALATE' && (
            <div>
              <label className={labelCls}>Escalar para</label>
              <select value={local.escalateToId || ''} onChange={e => update('escalateToId', e.target.value)} className={inputCls}>
                <option value="">Selecionar...</option>
                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── NOTIFICATION ─────────────────────────────────────────── */}
      {type === 'notification' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>Canal</label>
            <select value={local.channel || 'inapp'} onChange={e => update('channel', e.target.value)} className={inputCls}>
              <option value="inapp">In-app</option>
              <option value="email">E-mail</option>
              <option value="both">E-mail + In-app</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Destinatário</label>
            <select value={local.recipientId || ''} onChange={e => {
              const u = users?.find((u: any) => u.id === e.target.value)
              update('recipientId', e.target.value)
              update('recipientEmail', u?.email || '')
            }} className={inputCls}>
              <option value="">Selecionar...</option>
              <option value="__requester__">Solicitante da instância</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mensagem</label>
            <textarea value={local.message || ''} onChange={e => update('message', e.target.value)}
              rows={2} placeholder="Sua solicitação foi processada..."
              className="w-full px-2.5 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" />
          </div>
        </div>
      )}

      {/* ── EMAIL ────────────────────────────────────────────────── */}
      {type === 'email' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>Para (e-mail)</label>
            <input value={local.to || ''} onChange={e => update('to', e.target.value)}
              placeholder="destinatario@empresa.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Assunto</label>
            <input value={local.subject || ''} onChange={e => update('subject', e.target.value)}
              placeholder="Assunto do e-mail" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Corpo</label>
            <textarea value={local.body || ''} onChange={e => update('body', e.target.value)}
              rows={3} placeholder="Conteúdo do e-mail..."
              className="w-full px-2.5 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" />
          </div>
        </div>
      )}

      {/* ── WEBHOOK ──────────────────────────────────────────────── */}
      {type === 'webhook' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>URL</label>
            <input value={local.url || ''} onChange={e => update('url', e.target.value)}
              placeholder="https://api.exemplo.com/hook" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Método HTTP</label>
            <select value={local.method || 'POST'} onChange={e => update('method', e.target.value)} className={inputCls}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="GET">GET</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Headers extras (JSON)</label>
            <textarea value={local.headers || ''} onChange={e => update('headers', e.target.value)}
              rows={2} placeholder='{"Authorization": "Bearer token"}'
              className="w-full px-2.5 py-2 text-xs font-mono border border-neutral-200 rounded-md focus:outline-none resize-none" />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={local.waitForResponse || false}
                onChange={e => update('waitForResponse', e.target.checked)} className="rounded" />
              <span className="text-neutral-600">Aguardar resposta antes de avançar</span>
            </label>
          </div>
        </div>
      )}

      {/* ── FORM ─────────────────────────────────────────────────── */}
      {type === 'form' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>Campos do formulário</label>
            {(local.fields || []).map((f: string, i: number) => (
              <div key={i} className="flex gap-1 mb-1">
                <input value={f} onChange={e => {
                  const arr = [...(local.fields || [])]
                  arr[i] = e.target.value
                  update('fields', arr)
                }} className={inputCls} />
                <button onClick={() => update('fields', (local.fields || []).filter((_: any, j: number) => j !== i))}
                  className="text-neutral-400 hover:text-red-500"><X size={13} /></button>
              </div>
            ))}
            <button onClick={() => update('fields', [...(local.fields || []), ''])}
              className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-700 mt-1">
              <Plus size={10} /> Adicionar campo
            </button>
          </div>
          <div>
            <label className={labelCls}>Responsável pelo preenchimento</label>
            <select value={local.assigneeId || ''} onChange={e => {
              const u = users?.find((u: any) => u.id === e.target.value)
              update('assigneeId', e.target.value)
              update('assigneeEmail', u?.email || '')
            }} className={inputCls}>
              <option value="">Qualquer participante</option>
              {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── LOOP ─────────────────────────────────────────────────── */}
      {type === 'loop' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>Máximo de iterações</label>
            <input type="number" min="1" max="100" value={local.maxIterations || ''}
              onChange={e => update('maxIterations', parseInt(e.target.value))}
              placeholder="Ex: 3" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Condição de saída</label>
            <input value={local.exitCondition || ''} onChange={e => update('exitCondition', e.target.value)}
              placeholder="Ex: status == 'aprovado'" className={inputCls} />
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            A saída direita (→) representa o caminho quando a condição é atendida ou máximo atingido.
          </p>
        </div>
      )}

      {/* ── END ──────────────────────────────────────────────────── */}
      {type === 'end' && (
        <div className={sectionCls}>
          <div>
            <label className={labelCls}>Status final</label>
            <select value={local.status || 'COMPLETED'} onChange={e => update('status', e.target.value)} className={inputCls}>
              <option value="COMPLETED">Aprovado / Concluído</option>
              <option value="REJECTED">Rejeitado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SLA Sub-section ─────────────────────────────────────────────────────────
function SlaSection({ local, updateSla, users }: any) {
  return (
    <div className="space-y-2">
      <label className={labelCls}><Clock size={9} className="inline mr-1" />SLA</label>
      <div className="flex gap-2 items-center">
        <input type="number" min="1" value={local.sla?.durationHours || ''} placeholder="24"
          onChange={e => updateSla('durationHours', parseInt(e.target.value))}
          className="w-20 h-8 px-2.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
        <span className="text-[10px] text-neutral-400">horas</span>
      </div>
      <select value={local.sla?.actionOnTimeout || 'ESCALATE'} onChange={e => updateSla('actionOnTimeout', e.target.value)}
        className="w-full h-8 px-2.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 bg-white">
        <option value="ESCALATE">Escalar ao vencer</option>
        <option value="AUTO_APPROVE">Aprovar automaticamente</option>
        <option value="AUTO_REJECT">Rejeitar automaticamente</option>
      </select>
      {local.sla?.actionOnTimeout === 'ESCALATE' && (
        <select value={local.sla?.escalateToId || ''} onChange={e => updateSla('escalateToId', e.target.value)}
          className="w-full h-8 px-2.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10 bg-white">
          <option value="">Escalar para...</option>
          {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
    </div>
  )
}

// ─── Condition Builder ────────────────────────────────────────────────────────
function ConditionBuilder({ local, update }: { local: any; update: (k: string, v: any) => void }) {
  const conditions: any[] = local.conditions || []

  function addCondition() {
    update('conditions', [...conditions, {
      id: `cond-${Date.now()}`,
      label: `Condição ${conditions.length + 1}`,
      rules: [{ field: '', operator: 'eq', value: '' }],
      targetNodeId: '',
      isDefault: false,
    }])
  }

  function removeCondition(idx: number) {
    update('conditions', conditions.filter((_, i) => i !== idx))
  }

  function updateCondition(idx: number, key: string, value: any) {
    const updated = [...conditions]
    updated[idx] = { ...updated[idx], [key]: value }
    update('conditions', updated)
  }

  function updateRule(condIdx: number, ruleIdx: number, key: string, value: any) {
    const updated = [...conditions]
    const rules = [...(updated[condIdx].rules || [])]
    rules[ruleIdx] = { ...rules[ruleIdx], [key]: value }
    updated[condIdx] = { ...updated[condIdx], rules }
    update('conditions', updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelCls}>Condições de roteamento</label>
        <button onClick={addCondition}
          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
          <Plus size={10} /> Adicionar
        </button>
      </div>

      {conditions.length === 0 && (
        <p className="text-[10px] text-neutral-400">Nenhuma condição. Clique em "Adicionar" para criar.</p>
      )}

      {conditions.map((cond, ci) => (
        <div key={cond.id} className="border border-neutral-200 rounded-md p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <input value={cond.label} onChange={e => updateCondition(ci, 'label', e.target.value)}
              className="flex-1 h-7 px-2 text-[10px] border border-neutral-200 rounded focus:outline-none"
              placeholder="Nome da condição" />
            <label className="flex items-center gap-1 text-[10px] text-neutral-500">
              <input type="checkbox" checked={cond.isDefault || false}
                onChange={e => updateCondition(ci, 'isDefault', e.target.checked)} className="rounded" />
              Padrão
            </label>
            <button onClick={() => removeCondition(ci)} className="text-neutral-400 hover:text-red-500">
              <X size={12} />
            </button>
          </div>
          {!cond.isDefault && (cond.rules || []).map((rule: any, ri: number) => (
            <div key={ri} className="flex gap-1">
              <input value={rule.field} onChange={e => updateRule(ci, ri, 'field', e.target.value)}
                className="flex-1 h-7 px-2 text-[10px] border border-neutral-200 rounded focus:outline-none"
                placeholder="campo (ex: valor)" />
              <select value={rule.operator} onChange={e => updateRule(ci, ri, 'operator', e.target.value)}
                className="w-16 h-7 px-1 text-[10px] border border-neutral-200 rounded focus:outline-none bg-white">
                <option value="eq">=</option>
                <option value="neq">≠</option>
                <option value="gt">&gt;</option>
                <option value="gte">≥</option>
                <option value="lt">&lt;</option>
                <option value="lte">≤</option>
                <option value="contains">contém</option>
              </select>
              <input value={rule.value} onChange={e => updateRule(ci, ri, 'value', e.target.value)}
                className="w-20 h-7 px-2 text-[10px] border border-neutral-200 rounded focus:outline-none"
                placeholder="valor" />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-neutral-400">ID do nó de destino</label>
            <input value={cond.targetNodeId} onChange={e => updateCondition(ci, 'targetNodeId', e.target.value)}
              className="w-full h-7 px-2 text-[10px] font-mono border border-neutral-200 rounded focus:outline-none mt-0.5"
              placeholder="ex: step-diretoria" />
          </div>
        </div>
      ))}
    </div>
  )
}
