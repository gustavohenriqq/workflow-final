import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, GitBranch, ListChecks, Inbox,
  ShieldCheck, Users, LogOut, Sun, Moon,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUiStore } from '../../store/ui.store'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, permission: null },
  { to: '/workflows', label: 'Workflows',  icon: GitBranch,        permission: 'workflows:read' },
  { to: '/instances', label: 'Instâncias', icon: ListChecks,       permission: 'instances:read' },
  { to: '/inbox',     label: 'Inbox',      icon: Inbox,            permission: 'inbox:read', badge: true },
  { to: '/audit',     label: 'Auditoria',  icon: ShieldCheck,      permission: 'audit:read' },
  { to: '/users',     label: 'Usuários',   icon: Users,            permission: 'admin:read' },
]

export function AppLayout() {
  const { user, logout, hasPermission } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUiStore()
  const navigate = useNavigate()

  const { data: inboxCount } = useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => api.get('/inbox/count').then(r => r.data),
    refetchInterval: 30_000,
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col flex-shrink-0 sidebar">
        {/* Logo */}
        <div className="h-14 flex items-center px-4" style={{ borderBottom: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-2.5">
            <img src="/img/Logo.png" alt="Workflow" className="w-9 h-9 object-contain flex-shrink-0" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Workflow
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            if (item.permission && !hasPermission(item.permission)) return null
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx('nav-item flex items-center gap-2.5 px-3 py-2 text-sm', isActive && 'active')}
              >
                <Icon size={15} />
                <span className="flex-1">{item.label}</span>
                {item.badge && inboxCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Dark mode toggle */}
        <div className="px-2 pb-1">
          <button
            onClick={toggleDarkMode}
            className="nav-item w-full flex items-center gap-2.5 px-3 py-2 text-sm"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
        </div>

        {/* User */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-base)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md group transition-colors"
            style={{ cursor: 'default' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
              style={{ background: 'var(--text-muted)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Sair"
              style={{ color: 'var(--text-muted)', opacity: 0 }}
              className="group-hover:!opacity-100 transition-opacity hover:text-red-500">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
