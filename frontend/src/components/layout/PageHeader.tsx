import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="h-14 px-6 flex items-center justify-between flex-shrink-0 page-header">
      <div>
        <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
