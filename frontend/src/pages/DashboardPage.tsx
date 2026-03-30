import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, Spinner, InstanceStatusBadge } from '../components/ui'
import { KpiSkeleton } from '../components/ui/Skeleton'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

function KpiCard({
  label, value, sub, icon: Icon, danger,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; danger?: boolean
}) {
  return (
    <Card className="p-4 dark:bg-neutral-900">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-neutral-100'}`}>
          <Icon size={14} className={danger ? 'text-red-500' : 'text-neutral-500'} />
        </div>
      </div>
      <p className={`text-2xl font-semibold ${danger ? 'text-red-600' : 'text-neutral-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: () => api.get('/analytics/kpis').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: bottlenecks } = useQuery({
    queryKey: ['analytics-bottlenecks'],
    queryFn: () => api.get('/analytics/bottlenecks').then((r) => r.data),
  })

  const { data: timeline } = useQuery({
    queryKey: ['analytics-timeline'],
    queryFn: () => api.get('/analytics/timeline').then((r) => r.data),
  })

  const { data: recentInstances } = useQuery({
    queryKey: ['instances-recent'],
    queryFn: () => api.get('/instances?limit=8').then((r) => r.data.data),
  })

  const { data: sla } = useQuery({
    queryKey: ['analytics-sla'],
    queryFn: () => api.get('/analytics/sla').then((r) => r.data),
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Dashboard"
        description="Visão geral dos processos e aprovações"
      />

      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        {/* KPI Cards */}
        {kpisLoading ? (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Em andamento"
              value={kpis?.running ?? 0}
              sub="instâncias ativas"
              icon={TrendingUp}
            />
            <KpiCard
              label="SLA vencido"
              value={kpis?.slaExpired ?? 0}
              sub="requerem atenção imediata"
              icon={AlertTriangle}
              danger={(kpis?.slaExpired ?? 0) > 0}
            />
            <KpiCard
              label="Taxa de aprovação"
              value={`${kpis?.approvalRate ?? 0}%`}
              sub={`últimos ${kpis?.period?.days ?? 30} dias`}
              icon={CheckCircle2}
            />
            <KpiCard
              label="Tempo médio"
              value={`${kpis?.avgDurationDays ?? 0}d`}
              sub="por instância concluída"
              icon={Clock}
            />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Timeline chart */}
          <Card className="col-span-2 p-4">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-4">Instâncias por dia</p>
            {timeline ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={timeline} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#171717" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#171717" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#a8a29e' }}
                    tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, border: '1px solid #e7e5e4', borderRadius: 6 }}
                    labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy')}
                  />
                  <Area
                    type="monotone" dataKey="total" name="Total"
                    stroke="#171717" strokeWidth={1.5} fill="url(#grad-total)"
                  />
                  <Area
                    type="monotone" dataKey="completed" name="Concluídos"
                    stroke="#16a34a" strokeWidth={1.5} fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center"><Spinner /></div>
            )}
          </Card>

          {/* SLA stats */}
          <Card className="p-4 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-4">SLA geral</p>
            {sla ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-500">No prazo</span>
                    <span className="font-medium text-green-600">{sla.onTimeRate}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${sla.onTimeRate}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-neutral-900">{sla.onTime}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">No prazo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-yellow-600">{sla.escalated}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Escalados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600">{sla.expired}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Vencidos</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center"><Spinner /></div>
            )}
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Bottlenecks */}
          <Card className="p-4 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-4">Gargalos por etapa</p>
            {bottlenecks && bottlenecks.length > 0 ? (
              <div className="space-y-3">
                {bottlenecks.slice(0, 5).map((b: any, i: number) => {
                  const max = bottlenecks[0].avgDurationHours
                  const pct = max > 0 ? (b.avgDurationHours / max) * 100 : 0
                  return (
                    <div key={b.stepDefinitionId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-600 truncate max-w-[200px]">
                          {b.stepDefinitionId}
                        </span>
                        <span className={`font-medium ml-2 ${i === 0 ? 'text-red-600' : i === 1 ? 'text-orange-500' : 'text-neutral-500'}`}>
                          {b.avgDurationHours}h avg
                        </span>
                      </div>
                      <div className="h-1 bg-neutral-100 rounded-full">
                        <div
                          className={`h-full rounded-full ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-300' : 'bg-neutral-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Nenhum dado disponível ainda</p>
            )}
          </Card>

          {/* Recent instances */}
          <Card className="p-4 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-4">Instâncias recentes</p>
            {recentInstances && recentInstances.length > 0 ? (
              <div className="space-y-2">
                {recentInstances.map((inst: any) => (
                  <button
                    key={inst.id}
                    onClick={() => navigate(`/instances/${inst.id}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-neutral-50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-800 truncate">{inst.title}</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        {inst.workflowVersion?.workflow?.name} ·{' '}
                        {formatDistanceToNow(new Date(inst.startedAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <InstanceStatusBadge status={inst.status} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Nenhuma instância ainda</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
