import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Credenciais inválidas')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/img/Logo.png" alt="Workflow" className="w-28 h-28 object-contain" />
        </div>

        {/* Card */}
        <div className="rounded-xl p-6 card">
          <h1 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Entrar na sua conta
          </h1>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Use as credenciais do demo para acessar
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                E-mail
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@workflow.dev"
                className="input w-full h-9 px-3 text-sm"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input w-full h-9 px-3 pr-9 text-sm"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" variant="primary" size="md" loading={isSubmitting}
              className="w-full justify-center">
              Entrar
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border-base)' }}>
            <p className="text-[10px] mb-2 font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Contas demo <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(após npm run prisma:seed)</span>
            </p>
            <div className="space-y-1">
              {[
                { email: 'admin@workflow.dev',       role: 'Admin',    pw: 'Admin@2024' },
                { email: 'carlos.lima@workflow.dev', role: 'Gestor',   pw: 'Gestor@2024' },
                { email: 'ana.beatriz@workflow.dev', role: 'Aprovador',pw: 'Aprovador@2024' },
              ].map(acc => (
                <div key={acc.email} className="flex justify-between text-[11px]">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{acc.email}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{acc.pw}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
