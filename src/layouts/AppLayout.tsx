import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Car, History, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Logo from '../components/Logo'

const navItems = [
  { to: '/app', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/app/vehicles', label: 'Vehículos', icon: Car, end: false },
  { to: '/app/history', label: 'Historial', icon: History, end: false },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
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
            <nav className="flex items-center gap-1" aria-label="Principal">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-pine-50 text-pine-900' : 'text-pine-600 hover:bg-pine-50 hover:text-pine-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[16rem] truncate text-sm text-pine-600 md:inline">{user?.email}</span>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="btn-secondary !px-3 !py-2">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Salir</span>
              <span className="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
