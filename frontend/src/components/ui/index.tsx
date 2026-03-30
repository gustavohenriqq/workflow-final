import { clsx } from 'clsx'
import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted'

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--bg-muted)', color: 'var(--text-secondary)' },
  success: { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
  danger:  { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' },
  warning: { background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a' },
  info:    { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  muted:   { background: 'var(--bg-muted)', color: 'var(--text-muted)' },
}

// Dark mode overrides for semantic badges
const badgeDarkStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {},
  success: { background: 'rgba(21,128,61,0.2)', color: '#86efac', border: '1px solid rgba(21,128,61,0.4)' },
  danger:  { background: 'rgba(185,28,28,0.2)', color: '#fca5a5', border: '1px solid rgba(185,28,28,0.4)' },
  warning: { background: 'rgba(161,98,7,0.2)',  color: '#fde047', border: '1px solid rgba(161,98,7,0.4)' },
  info:    { background: 'rgba(29,78,216,0.2)',  color: '#93c5fd', border: '1px solid rgba(29,78,216,0.4)' },
  muted:   {},
}

export function Badge({ children, variant = 'default', className }: {
  children: ReactNode; variant?: BadgeVariant; className?: string
}) {
  const isDark = document.documentElement.classList.contains('dark')
  const style = isDark && badgeDarkStyles[variant] && Object.keys(badgeDarkStyles[variant]).length > 0
    ? badgeDarkStyles[variant]
    : badgeStyles[variant]

  return (
    <span
      className={clsx('badge-base', className)}
      style={style}
    >
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ children, variant = 'secondary', size = 'md', loading, icon, className, disabled, ...props }: ButtonProps) {
  const sizes = { sm: 'h-7 px-3 text-xs', md: 'h-8 px-3.5 text-xs', lg: 'h-9 px-4 text-sm' }

  const base = 'inline-flex items-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClass: Record<ButtonVariant, string> = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(base, variantClass[variant], sizes[size], className)}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className, onClick }: {
  children: ReactNode; className?: string; onClick?: () => void
}) {
  return (
    <div className={clsx('card', className)} onClick={onClick}>
      {children}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs mb-4" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {action}
    </div>
  )
}

// ─── Status Badges ────────────────────────────────────────────────────────────
export function InstanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    RUNNING:   { label: 'Em andamento', variant: 'info' },
    COMPLETED: { label: 'Concluído',    variant: 'success' },
    REJECTED:  { label: 'Rejeitado',    variant: 'danger' },
    CANCELLED: { label: 'Cancelado',    variant: 'muted' },
    ESCALATED: { label: 'Escalado',     variant: 'warning' },
  }
  const cfg = map[status] || { label: status, variant: 'default' as BadgeVariant }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function SlaStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    ok:       { label: 'No prazo',    variant: 'success' },
    warning:  { label: 'Atenção',     variant: 'warning' },
    critical: { label: 'Crítico',     variant: 'danger' },
    expired:  { label: 'SLA vencido', variant: 'danger' },
  }
  const cfg = map[status] || { label: status, variant: 'default' as BadgeVariant }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export function StepStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING:     { label: 'Pendente',    variant: 'warning' },
    IN_PROGRESS: { label: 'Em análise', variant: 'info' },
    APPROVED:    { label: 'Aprovado',   variant: 'success' },
    REJECTED:    { label: 'Rejeitado',  variant: 'danger' },
    SKIPPED:     { label: 'Pulado',     variant: 'muted' },
    ESCALATED:   { label: 'Escalado',   variant: 'warning' },
    TIMED_OUT:   { label: 'SLA vencido', variant: 'danger' },
  }
  const cfg = map[status] || { label: status, variant: 'default' as BadgeVariant }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
