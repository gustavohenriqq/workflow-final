import { useAuthStore } from '../store/auth.store'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const logout = useAuthStore((s) => s.logout)

  return { user, isAuthenticated, hasPermission, logout }
}
