import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { WorkflowDesignerPage } from './pages/WorkflowDesignerPage'
import { InstancesPage } from './pages/InstancesPage'
import { InstanceDetailPage } from './pages/InstanceDetailPage'
import { InboxPage } from './pages/InboxPage'
import { AuditPage } from './pages/AuditPage'
import { UsersPage } from './pages/UsersPage'
import { NotFoundPage } from './pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s: any) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="workflows/:workflowId/designer" element={<WorkflowDesignerPage />} />
          <Route path="workflows/:workflowId/designer/:versionId" element={<WorkflowDesignerPage />} />
          <Route path="instances" element={<InstancesPage />} />
          <Route path="instances/:instanceId" element={<InstanceDetailPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
