import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import AuthShell from '../components/AuthShell'
import Alert from '../components/Alert'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) return setError('Ingresa tu nombre.')
    if (!email.trim()) return setError('Ingresa tu correo electrónico.')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')

    setLoading(true)
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password, fullName.trim())
      if (needsEmailConfirmation) {
        setConfirmationSentTo(email.trim())
      } else {
        navigate('/app', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSentTo) {
    return (
      <AuthShell title="Revisa tu correo" subtitle="Un último paso para activar tu cuenta.">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-pine-50 p-4 text-sm text-pine-800">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <p>
              Enviamos un enlace de confirmación a <strong>{confirmationSentTo}</strong>. Ábrelo y luego inicia sesión.
              Si no lo ves, revisa la carpeta de spam.
            </p>
          </div>
          <Link to="/login" className="btn-primary w-full">Ir a iniciar sesión</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Empieza a llevar el historial de tu vehículo.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="full_name" className="field-label">Nombre</label>
          <input id="full_name" autoComplete="name" className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" maxLength={80} />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </div>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-pine-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-emerald-700 hover:underline">Inicia sesión</Link>
      </p>
    </AuthShell>
  )
}
