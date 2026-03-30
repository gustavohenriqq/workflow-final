import { Handle, Position, NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import {
  Clock, User, GitBranch, CheckCircle2, XCircle, Bell,
  Users, Timer, FileText, Repeat, StopCircle, Mail, Globe,
} from 'lucide-react'

function NodeWrapper({ selected, color, children }: {
  selected: boolean; color: string; children: React.ReactNode
}) {
  const border: Record<string, string> = {
    blue: 'border-blue-300', amber: 'border-amber-300', purple: 'border-purple-300',
    green: 'border-green-400', red: 'border-red-400', teal: 'border-teal-300',
    orange: 'border-orange-300', pink: 'border-pink-300', gray: 'border-neutral-300',
  }
  const accent: Record<string, string> = {
    blue: 'bg-blue-500', amber: 'bg-amber-500', purple: 'bg-purple-500',
    green: 'bg-green-500', red: 'bg-red-500', teal: 'bg-teal-500',
    orange: 'bg-orange-500', pink: 'bg-pink-500', gray: 'bg-neutral-400',
  }
  const ring: Record<string, string> = {
    blue: 'ring-blue-200', amber: 'ring-amber-200', purple: 'ring-purple-200',
    green: 'ring-green-200', red: 'ring-red-200', teal: 'ring-teal-200',
    orange: 'ring-orange-200', pink: 'ring-pink-200', gray: 'ring-neutral-200',
  }
  return (
    <div className={clsx(
      'border rounded-lg shadow-sm overflow-hidden w-52' as any,
      border[color] || border.gray,
      selected && `ring-2 ${ring[color] || ring.gray}`,
    )}>
      <div className={clsx('h-0.5 w-full', accent[color] || accent.gray)} />
      {children}
    </div>
  )
}

function NodeIcon({ icon: Icon, color }: { icon: any; color: string }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600', green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600', teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600', pink: 'bg-pink-50 text-pink-600',
    gray: 'bg-neutral-100 text-neutral-500',
  }
  return (
    <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', cls[color] || cls.gray)}>
      <Icon size={11} />
    </div>
  )
}

// ─── Start ───────────────────────────────────────────────────────────────────
export function StartNode({ selected }: NodeProps) {
  return (
    <div className={clsx(
      'px-5 py-2.5 rounded-full border-2 border-green-500 shadow-sm',
      'flex items-center gap-2 min-w-[110px] justify-center',
      selected && 'ring-2 ring-green-200 ring-offset-1',
    )}
    style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
      <span className="text-xs font-semibold text-green-700">Início</span>
      <Handle type="source" position={Position.Bottom} className="!bg-green-400 !w-3 !h-3" />
    </div>
  )
}

// ─── End ─────────────────────────────────────────────────────────────────────
export function EndNode({ data, selected }: NodeProps) {
  const d = data as any
  const isRejection = d.status === 'REJECTED'
  const isCancelled = d.status === 'CANCELLED'
  const color = isRejection ? 'red' : isCancelled ? 'gray' : 'green'
  const borderCls = isRejection ? 'border-red-400' : isCancelled ? 'border-neutral-400' : 'border-green-500'
  const ringCls = isRejection ? 'ring-red-200' : isCancelled ? 'ring-neutral-200' : 'ring-green-200'
  const textCls = isRejection ? 'text-red-700' : isCancelled ? 'text-neutral-600' : 'text-green-700'
  return (
    <div className={clsx(
      'px-5 py-2.5 rounded-full border-2 shadow-sm flex items-center gap-2 min-w-[110px] justify-center',
      borderCls, selected && `ring-2 ring-offset-1 ${ringCls}`,
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      {isRejection ? <XCircle size={14} className="text-red-500" />
        : isCancelled ? <StopCircle size={14} className="text-neutral-500" />
        : <CheckCircle2 size={14} className="text-green-500" />}
      <span className={clsx('text-xs font-semibold', textCls)}>
        {d.label || (isRejection ? 'Rejeitado' : isCancelled ? 'Cancelado' : 'Aprovado')}
      </span>
    </div>
  )
}

// ─── Approval ────────────────────────────────────────────────────────────────
export function ApprovalNode({ data, selected }: NodeProps) {
  const d = data as any
  return (
    <NodeWrapper selected={selected} color="blue">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={User} color="blue" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Aprovação'}</p>
            {d.assigneeEmail
              ? <p className="text-[10px] text-neutral-400 truncate mt-0.5">{d.assigneeEmail}</p>
              : <p className="text-[10px] text-red-400 mt-0.5">Sem responsável</p>
            }
          </div>
        </div>
        {d.sla?.durationHours && (
          <div className="flex items-center gap-1 bg-neutral-50 rounded px-2 py-1">
            <Clock size={9} className="text-neutral-400" />
            <span className="text-[10px] text-neutral-500">SLA: {d.sla.durationHours}h</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Parallel Approval ───────────────────────────────────────────────────────
export function ParallelApprovalNode({ data, selected }: NodeProps) {
  const d = data as any
  const assignees: string[] = d.assignees || []
  return (
    <NodeWrapper selected={selected} color="teal">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={Users} color="teal" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Aprovação paralela'}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{assignees.length} aprovadores simultâneos</p>
          </div>
        </div>
        {assignees.slice(0, 2).map((e: string, i: number) => (
          <div key={i} className="text-[10px] text-neutral-500 truncate ml-8">• {e}</div>
        ))}
        {assignees.length > 2 && <div className="text-[10px] text-neutral-400 ml-8">+{assignees.length - 2} mais</div>}
        {d.sla?.durationHours && (
          <div className="flex items-center gap-1 bg-neutral-50 rounded px-2 py-1 mt-2">
            <Clock size={9} className="text-neutral-400" />
            <span className="text-[10px] text-neutral-500">SLA: {d.sla.durationHours}h</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Gateway Condicional ──────────────────────────────────────────────────────
export function GatewayNode({ data, selected }: NodeProps) {
  const d = data as any
  const condCount = d.conditions?.length || 0
  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <Handle type="target" position={Position.Top} style={{ top: 2 }} className="!w-3 !h-3" />
      <div className={clsx(
        'w-16 h-16 rotate-45 border-2 border-amber-400 shadow-sm transition-all',
        selected && 'ring-2 ring-amber-200',
      )}>
        <div className="-rotate-45 flex flex-col items-center justify-center h-full gap-0.5 px-1">
          <GitBranch size={13} className="text-amber-600" />
          {d.label && (
            <p className="text-[8px] text-amber-700 font-semibold text-center leading-tight max-w-[52px] truncate">
              {d.label}
            </p>
          )}
          {condCount > 0 && <p className="text-[7px] text-amber-500">{condCount} regras</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ bottom: 2 }} className="!w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" style={{ right: 2 }} className="!w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="left" style={{ left: 2 }} className="!w-3 !h-3" />
    </div>
  )
}

// ─── SLA Timer ────────────────────────────────────────────────────────────────
export function SlaTimerNode({ data, selected }: NodeProps) {
  const d = data as any
  const actionLabel: Record<string, string> = {
    ESCALATE: 'Escalar', AUTO_APPROVE: 'Aprovar auto', AUTO_REJECT: 'Rejeitar auto',
  }
  return (
    <NodeWrapper selected={selected} color="orange">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={Timer} color="orange" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Temporizador SLA'}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {d.durationHours ? `Aguarda ${d.durationHours}h` : 'Configure a duração'}
            </p>
          </div>
        </div>
        {d.actionOnTimeout && (
          <div className="text-[10px] text-orange-600 bg-orange-50 rounded px-2 py-1">
            Ao vencer: {actionLabel[d.actionOnTimeout] || d.actionOnTimeout}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Notification ─────────────────────────────────────────────────────────────
export function NotificationNode({ data, selected }: NodeProps) {
  const d = data as any
  const channelLabel: Record<string, string> = {
    email: 'E-mail', inapp: 'In-app', both: 'E-mail + In-app',
  }
  return (
    <NodeWrapper selected={selected} color="purple">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={Bell} color="purple" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Notificação'}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {channelLabel[d.channel] || 'In-app'}
            </p>
          </div>
        </div>
        {d.message && (
          <p className="text-[10px] text-neutral-500 truncate italic ml-8">"{d.message}"</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Email ────────────────────────────────────────────────────────────────────
export function EmailNode({ data, selected }: NodeProps) {
  const d = data as any
  return (
    <NodeWrapper selected={selected} color="pink">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <NodeIcon icon={Mail} color="pink" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Enviar e-mail'}</p>
            {d.to
              ? <p className="text-[10px] text-neutral-400 truncate mt-0.5">Para: {d.to}</p>
              : <p className="text-[10px] text-red-400 mt-0.5">Destinatário não definido</p>
            }
            {d.subject && <p className="text-[10px] text-neutral-500 truncate">{d.subject}</p>}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Webhook ──────────────────────────────────────────────────────────────────
export function WebhookNode({ data, selected }: NodeProps) {
  const d = data as any
  return (
    <NodeWrapper selected={selected} color="gray">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={Globe} color="gray" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Webhook'}</p>
            {d.url
              ? <p className="text-[10px] text-neutral-400 truncate mt-0.5">{d.url}</p>
              : <p className="text-[10px] text-red-400 mt-0.5">URL não definida</p>
            }
          </div>
        </div>
        {d.method && (
          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 rounded px-2 py-0.5">
            {d.method}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Form / Coleta de dados ───────────────────────────────────────────────────
export function FormNode({ data, selected }: NodeProps) {
  const d = data as any
  const fields: string[] = d.fields || []
  return (
    <NodeWrapper selected={selected} color="teal">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <NodeIcon icon={FileText} color="teal" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Formulário'}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{fields.length} campo(s) para preencher</p>
          </div>
        </div>
        {fields.slice(0, 2).map((f: string, i: number) => (
          <div key={i} className="text-[10px] text-neutral-500 truncate ml-8">• {f}</div>
        ))}
        {fields.length > 2 && <div className="text-[10px] text-neutral-400 ml-8">+{fields.length - 2} mais</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
export function LoopNode({ data, selected }: NodeProps) {
  const d = data as any
  return (
    <NodeWrapper selected={selected} color="amber">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <NodeIcon icon={Repeat} color="amber" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{d.label || 'Loop / Repetição'}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {d.maxIterations ? `Máx. ${d.maxIterations} iterações` : 'Configure o loop'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-2 ml-8">
          <span className="text-[9px] bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">↓ continuar</span>
          <span className="text-[9px] bg-neutral-100 text-neutral-500 rounded px-1.5 py-0.5">→ sair</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="continue" className="!w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="exit" style={{ top: '50%' }} className="!w-3 !h-3" />
    </NodeWrapper>
  )
}

export const nodeTypes = {
  start:             StartNode,
  end:               EndNode,
  approval:          ApprovalNode,
  parallel_approval: ParallelApprovalNode,
  gateway:           GatewayNode,
  sla_timer:         SlaTimerNode,
  notification:      NotificationNode,
  email:             EmailNode,
  webhook:           WebhookNode,
  form:              FormNode,
  loop:              LoopNode,
}
