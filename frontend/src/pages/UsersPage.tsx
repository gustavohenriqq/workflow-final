import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, Button, Badge, EmptyState, Spinner } from '../components/ui'
import { Users, Plus, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth.store'

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ email: '', name: '', password: '', roleIds: [] as string[] })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
    staleTime: 300_000,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/users', form).then((r) => r.data),
    onSuccess: () => {
      toast.success('Usuário criado com sucesso')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao criar usuário'),
  })

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full max-w-md p-5">
        <h2 className="text-sm font-semibold mb-4">Novo usuário</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">E-mail *</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="email@empresa.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Senha *</label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              className="w-full h-9 px-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={isPending}
            disabled={!form.name || !form.email || !form.password}
            onClick={() => mutate()}
          >
            Criar usuário
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UsersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Usuário atualizado')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Usuários"
        description="Gerencie usuários e permissões do sistema"
        action={
          hasPermission('admin:manage') && (
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
              Novo usuário
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !users?.length ? (
          <EmptyState icon={<Users size={18} />} title="Nenhum usuário encontrado" />
        ) : (
          <div className="space-y-2">
            {users.map((user: any) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    user.isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'
                  }`}>
                    {getInitials(user.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-800">{user.name}</p>
                      {!user.isActive && <Badge variant="muted">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
                  </div>

                  {/* Roles */}
                  <div className="flex gap-1.5 flex-wrap">
                    {user.userRoles?.map((ur: any) => (
                      <Badge key={ur.role.id} variant="default">{ur.role.name}</Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  {hasPermission('admin:manage') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      onClick={() => toggleActive({ id: user.id, isActive: !user.isActive })}
                    >
                      {user.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
