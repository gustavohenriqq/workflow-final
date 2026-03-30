import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Role {
  id: string
  name: string
  description?: string
  isSystem: boolean
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
    staleTime: 300_000,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    staleTime: 60_000,
  })
}
