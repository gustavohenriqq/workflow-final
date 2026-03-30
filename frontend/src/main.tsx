import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Apply dark mode immediately from localStorage before first render
// This prevents the flash of wrong theme on page load
try {
  const stored = localStorage.getItem('wfe-ui')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.darkMode) {
      document.documentElement.classList.add('dark')
    }
  }
} catch (_) {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
