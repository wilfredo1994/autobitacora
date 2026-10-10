import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import ConfigMissing from './components/ConfigMissing'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import VehiclesPage from './pages/VehiclesPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import HistoryPage from './pages/HistoryPage'
import RemindersPage from './pages/RemindersPage'
import StatsPage from './pages/StatsPage'
import { isSupabaseConfigured } from './lib/supabase'
import { PlanProvider } from './plan/PlanProvider'
import AccountPage from './pages/AccountPage'

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<PlanProvider><AppLayout /></PlanProvider>}>
              <Route index element={<DashboardPage />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
