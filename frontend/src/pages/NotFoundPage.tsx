import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-6xl font-semibold text-neutral-200">404</p>
      <p className="text-sm font-medium text-neutral-700">Página não encontrada</p>
      <p className="text-xs text-neutral-400">O endereço que você acessou não existe.</p>
      <Button
        variant="secondary"
        size="sm"
        icon={<ArrowLeft size={13} />}
        onClick={() => navigate('/dashboard')}
      >
        Voltar ao dashboard
      </Button>
    </div>
  )
}
