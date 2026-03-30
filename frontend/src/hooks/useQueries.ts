import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { toast } from 'sonner'

// ─── Workflows ────────────────────────────────────────────────────────────────
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then((r) => r.data),
  })
}

export function useWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.get(`/workflows/${workflowId}`).then((r) => r.data),
    enabled: !!workflowId,
  })
}

export function useVersion(workflowId: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: ['version', versionId],
    queryFn: () =>
      api.get(`/workflows/${workflowId}/versions/${versionId}`).then((r) => r.data),
    enabled: !!workflowId && !!versionId,
  })
}

// ─── Instances ────────────────────────────────────────────────────────────────
export function useInstances(filters?: { status?: string; workflowId?: string }) {
  return useQuery({
    queryKey: ['instances', filters],
    queryFn: () =>
      api.get('/instances', { params: { ...filters, limit: 30 } }).then((r) => r.data),
  })
}

export function useInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: ['instance', instanceId],
    queryFn: () => api.get(`/instances/${instanceId}`).then((r) => r.data),
    enabled: !!instanceId,
    refetchInterval: 15_000,
  })
}

// ─── Inbox ───────────────────────────────────────────────────────────────────
export function useInbox() {
  return useQuery({
    queryKey: ['inbox'],
    queryFn: () => api.get('/inbox').then((r) => r.data),
    refetchInterval: 30_000,
  })
}

export function useInboxCount() {
  return useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => api.get('/inbox/count').then((r) => r.data),
    refetchInterval: 30_000,
  })
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export function useKpis(days = 30) {
  return useQuery({
    queryKey: ['analytics-kpis', days],
    queryFn: () => api.get('/analytics/kpis', { params: { days } }).then((r) => r.data),
    refetchInterval: 60_000,
  })
}

export function useBottlenecks(days = 30) {
  return useQuery({
    queryKey: ['analytics-bottlenecks', days],
    queryFn: () => api.get('/analytics/bottlenecks', { params: { days } }).then((r) => r.data),
  })
}

export function useTimeline(days = 30) {
  return useQuery({
    queryKey: ['analytics-timeline', days],
    queryFn: () => api.get('/analytics/timeline', { params: { days } }).then((r) => r.data),
  })
}

export function useSlaStats() {
  return useQuery({
    queryKey: ['analytics-sla'],
    queryFn: () => api.get('/analytics/sla').then((r) => r.data),
  })
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export function useAuditEvents(filters?: {
  entityType?: string
  action?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['audit-events', filters],
    queryFn: () =>
      api.get('/audit-events', { params: { ...filters, limit: filters?.limit || 50 } })
        .then((r) => r.data),
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────
export function useDecide(stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      action: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'REQUEST_INFO' | 'ESCALATE'
      comment?: string
      evidenceUrls?: string[]
      delegateToId?: string
    }) => api.post(`/instances/step-executions/${stepId}/decide`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['inbox-count'] })
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao registrar decisão'),
  })
}

export function useCancelInstance(instanceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) =>
      api.patch(`/instances/${instanceId}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Instância cancelada')
      qc.invalidateQueries({ queryKey: ['instance', instanceId] })
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao cancelar'),
  })
}
