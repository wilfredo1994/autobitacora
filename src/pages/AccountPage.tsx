import { useEffect } from 'react'
import { Check, Crown, Minus } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { usePlan } from '../plan/PlanProvider'
import { PLAN_LIMITS } from '../lib/plan'
import { formatTimestampDate } from '../lib/format'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'

const FEATURES: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Vehículos activos', free: String(PLAN_LIMITS.free.vehicles), premium: `Hasta ${PLAN_LIMITS.premium.vehicles}` },
  { label: 'Recordatorios pendientes', free: String(PLAN_LIMITS.free.reminders), premium: 'Ilimitados' },
  { label: 'Historial visible', free: `Últimos ${PLAN_LIMITS.free.historyMonths} meses`, premium: 'Completo' },
  { label: 'Mantenimientos, combustible y gastos', free: 'Ilimitados', premium: 'Ilimitados' },
  { label: 'Próximo mantenimiento, consumo y costo por km', free: true, premium: true },
  { label: 'Estadísticas de los últimos meses', free: true, premium: true },
  { label: 'Estadísticas de años anteriores', free: false, premium: true },
  { label: 'Todos los rubros de gasto', free: 'Solo el principal', premium: true },
  { label: 'Comparación entre vehículos', free: false, premium: true },
]

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="ml-auto h-4 w-4 text-emerald-600" aria-label="Incluido" />
  if (value === false) return <Minus className="ml-auto h-4 w-4 text-pine-200" aria-label="No incluido" />
  return <span>{value}</span>
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const full = limit !== null && used >= limit
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-pine-800">{label}</span>
        <span className={`tabular-nums ${full ? 'font-bold text-amber-800' : 'text-pine-700'}`}>
          {used} {limit === null ? '· sin límite' : `de ${limit}`}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-pine-50" aria-hidden>
        <div
          className={`h-2 rounded-full ${full ? 'bg-amber-500' : 'bg-emerald-600'}`}
          style={{ width: limit === null ? '100%' : `${Math.min(100, (used / limit) * 100)}%`, opacity: limit === null ? 0.25 : 1 }}
        />
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { user } = useAuth()
  const { plan, isPremium, loading, reload } = usePlan()

  // El uso puede haber cambiado desde que se cargó el plan (vehículos o recordatorios nuevos).
  useEffect(() => {
    void reload()
  }, [reload])

  if (loading) return <Spinner />

  const overVehicleLimit = plan.active_vehicles > plan.vehicle_limit

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">Mi plan</h1>
        <p className="mt-1 text-pine-600">{user?.email}</p>
      </div>

      {plan.grace_until && (
        <Alert kind="warning">
          No pudimos renovar tu Premium. Lo mantienes hasta el <strong>{formatTimestampDate(plan.grace_until)}</strong>; después
          tu cuenta pasará a Free (no se borra nada).
        </Alert>
      )}
      {!isPremium && plan.subscribed_plan === 'premium' && (
        <Alert kind="warning">Tu Premium venció. Tus datos siguen guardados; con Free ves los últimos {PLAN_LIMITS.free.historyMonths} meses.</Alert>
      )}
      {overVehicleLimit && (
        <Alert kind="warning">
          Tienes {plan.active_vehicles} vehículos activos y tu plan permite {plan.vehicle_limit}. Solo el más antiguo se puede
          editar; los demás quedan en solo lectura. Archiva los que ya no uses o pásate a Premium.
        </Alert>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isPremium ? 'bg-pine-900 text-emerald-300' : 'bg-pine-50 text-pine-700'}`}>
              <Crown className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine-600">Plan actual</p>
              <p className="text-xl font-extrabold text-pine-900">{isPremium ? 'Premium' : 'Free'}</p>
            </div>
          </div>
          {isPremium && plan.expires_at && !plan.grace_until && (
            <p className="text-sm text-pine-600">
              {plan.status === 'cancelled' ? 'Cancelado; activo hasta el ' : 'Se renueva el '}
              {formatTimestampDate(plan.expires_at)}.
            </p>
          )}
          <div className="space-y-4">
            <UsageMeter label="Vehículos activos" used={plan.active_vehicles} limit={plan.vehicle_limit} />
            <UsageMeter label="Recordatorios pendientes" used={plan.pending_reminders} limit={plan.reminder_limit} />
          </div>
        </div>

        <div className="card flex flex-col justify-between gap-4 bg-pine-900 p-5 text-white">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300">
              <Crown className="h-4 w-4" aria-hidden /> AutoBitácora Premium
            </p>
            <p className="mt-2 text-lg font-bold">Más vehículos, todo tu historial y estadísticas completas.</p>
            <p className="mt-1 text-sm text-pine-100">Ideal si tienes más de un vehículo en casa o quieres ver la evolución de varios años.</p>
          </div>
          {isPremium ? (
            <p className="text-sm font-semibold text-emerald-300">Ya tienes Premium. ¡Gracias por apoyar AutoBitácora!</p>
          ) : (
            <div>
              <button type="button" className="btn-primary w-full justify-center" disabled>
                Pasarme a Premium · disponible pronto
              </button>
              <p className="mt-2 text-xs text-pine-100">Los pagos se habilitarán en una próxima versión.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card p-5" aria-label="Comparación de planes">
        <h2 className="text-lg font-bold text-pine-900">Free vs Premium</h2>
        <div className="-mx-1 mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-pine-100 text-xs font-semibold text-pine-600">
                <th scope="col" className="px-1 py-2 text-left">Función</th>
                <th scope="col" className="px-1 py-2 text-right">Free</th>
                <th scope="col" className="px-1 py-2 text-right">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-b border-pine-50">
                  <th scope="row" className="px-1 py-2.5 text-left font-semibold text-pine-800">{f.label}</th>
                  <td className="px-1 py-2.5 text-right text-pine-700"><Cell value={f.free} /></td>
                  <td className="px-1 py-2.5 text-right font-semibold text-pine-900"><Cell value={f.premium} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
