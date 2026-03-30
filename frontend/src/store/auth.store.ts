import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  tenantId: string
  roles: string[]
  permissions: string[]
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      hasPermission: (permission: string) => {
        const { user } = get()
        if (!user) return false
        return user.permissions.includes(permission)
      },
    }),
    {
      name: 'wfe-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
