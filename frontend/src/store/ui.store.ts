import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (val: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode
          if (next) document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
          return { darkMode: next }
        }),
      setDarkMode: (val) => {
        if (val) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        set({ darkMode: val })
      },
    }),
    {
      name: 'wfe-ui',
      onRehydrateStorage: () => (state) => {
        // Apply dark mode on page load from persisted state
        if (state?.darkMode) {
          document.documentElement.classList.add('dark')
        }
      },
    },
  ),
)
