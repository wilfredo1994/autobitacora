import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import AuthShell from '../components/AuthShell'
import Alert from '../components/Alert'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Inicia sesión" subtitle="Accede a la bitácora de tus vehículos.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="field-label">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-pine-600">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-semibold text-emerald-700 hover:underline">Crear cuenta</Link>
      </p>
    </AuthShell>
  )
}
