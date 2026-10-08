import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Spinner from './Spinner'

/** Solo deja pasar a usuarios con sesión. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner label="Verificando sesión…" />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Para /login y /register: si ya hay sesión, envía a la app. */
export function PublicOnlyRoute() {
  const { session, loading } = useAuth()

  if (loading) return <Spinner label="Verificando sesión…" />
  if (session) return <Navigate to="/app" replace />
  return <Outlet />
}
