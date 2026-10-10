import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, Car, Crown, History, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Logo from '../components/Logo'
import Alert from '../components/Alert'
import { usePlan } from '../plan/PlanProvider'

// shortLabel: la barra inferior del móvil tiene ~75 px por opción.
const navItems = [
  { to: '/app', label: 'Resumen', shortLabel: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/app/vehicles', label: 'Vehículos', shortLabel: 'Vehículos', icon: Car, end: false },
  { to: '/app/reminders', label: 'Recordatorios', shortLabel: 'Alertas', icon: Bell, end: false },
  { to: '/app/history', label: 'Historial', shortLabel: 'Historial', icon: History, end: false },
  { to: '/app/stats', label: 'Estadísticas', shortLabel: 'Análisis', icon: BarChart3, end: false },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { isPremium, error: planError } = usePlan()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-pine-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo className="text-xl" />
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Principal">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-pine-50 text-pine-900' : 'text-pine-600 hover:bg-pine-50 hover:text-pine-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/app/account"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                isPremium ? 'bg-pine-900 text-emerald-300 hover:bg-pine-800' : 'bg-pine-50 text-pine-800 hover:bg-pine-100'
              }`}
              title="Mi plan"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {isPremium ? 'Premium' : 'Free'}
              <span className="sr-only">: ver mi plan</span>
            </Link>
            <span className="hidden max-w-[16rem] truncate text-sm text-pine-600 sm:inline lg:hidden">{user?.email}</span>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="btn-secondary !px-3 !py-2" title={user?.email ? `Cerrar la sesión de ${user.email}` : undefined}>
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Salir</span>
              <span className="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 lg:pb-8">
        {planError && <div className="mb-6"><Alert kind="warning">{planError}</Alert></div>}
        <Outlet />
      </main>

      {/* Debajo de lg la navegación va abajo, al alcance del pulgar: 5 opciones no caben en la cabecera. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-pine-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Principal"
      >
        <div className="mx-auto flex max-w-lg">
          {navItems.map(({ to, label, shortLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-pine-600 hover:text-pine-900'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate" aria-hidden>{shortLabel}</span>
              <span className="sr-only">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
