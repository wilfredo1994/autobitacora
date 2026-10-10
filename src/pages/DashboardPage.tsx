import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Car, CalendarDays, Gauge, Plus, Wallet } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { usePlan } from '../plan/PlanProvider'
import { isVisible } from '../lib/plan'
import { useVehicles } from '../hooks/useVehicles'
import { useAllMaintenance } from '../hooks/useAllMaintenance'
import { useAllFuel } from '../hooks/useAllFuel'
import { useAllExpenses } from '../hooks/useAllExpenses'
import { usePendingReminders } from '../hooks/usePendingReminders'
import { buildUpcoming } from '../lib/maintenance'
import { compareDue } from '../lib/due'
import { buildPendingReminders } from '../lib/reminders'
import { buildHistory, summarizeHistory } from '../lib/history'
import { formatKm, formatMoney, formatUnitPrice } from '../lib/format'
import { MIN_DISTANCE_KM, aggregateCostPerKm, costPerKmByVehicle, periodRange } from '../lib/stats'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import VehicleCard from '../components/VehicleCard'
import UpcomingList, { type UpcomingEntry } from '../components/UpcomingList'
import HistoryList from '../components/HistoryList'
import ReminderList from '../components/ReminderList'

const MAX_UPCOMING = 4
const MAX_RECENT = 5
const MAX_REMINDERS = 4

export default function DashboardPage() {
  const { user } = useAuth()
  const { isPremium, cutoff } = usePlan()
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles()
  const { records, loading: loadingRecords, error: recordsError } = useAllMaintenance()
  const { records: fuelRecords, loading: loadingFuel, error: fuelError } = useAllFuel()
  const { records: expenses, loading: loadingExpenses, error: expensesError } = useAllExpenses()
  const { reminders, loading: loadingReminders, error: remindersError } = usePendingReminders()

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const firstName = fullName?.split(' ')[0]

  // Solo cuentan registros de vehículos activos (no archivados)
  const activeIds = useMemo(() => new Set(vehicles.map((v) => v.id)), [vehicles])
  const activeRecords = useMemo(() => records.filter((r) => activeIds.has(r.vehicle_id)), [activeIds, records])
  const activeFuel = useMemo(() => fuelRecords.filter((r) => activeIds.has(r.vehicle_id)), [activeIds, fuelRecords])
  const activeExpenses = useMemo(() => expenses.filter((r) => activeIds.has(r.vehicle_id)), [activeIds, expenses])

  const timeline = useMemo(
    () => buildHistory({ maintenance: activeRecords, fuel: activeFuel, expenses: activeExpenses }),
    [activeRecords, activeFuel, activeExpenses],
  )
  const totals = useMemo(() => summarizeHistory(timeline), [timeline])
  // Costo por km de los últimos 6 (Free) o 12 meses (Premium), igual que en Estadísticas.
  const costPerKmMonths = isPremium ? 12 : 6
  const costPerKm = useMemo(() => {
    const { from, to } = periodRange({ kind: 'recent', months: costPerKmMonths })
    return aggregateCostPerKm(costPerKmByVehicle(timeline, from, to))
  }, [timeline, costPerKmMonths])
  const pendingReminders = useMemo(() => buildPendingReminders(reminders, vehicles), [reminders, vehicles])
  const vehicleLabels = useMemo(
    () => new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model} · ${v.license_plate}`])),
    [vehicles],
  )

  const upcoming = useMemo<UpcomingEntry[]>(() => {
    const entries: UpcomingEntry[] = []
    for (const v of vehicles) {
      const own = activeRecords.filter((r) => r.vehicle_id === v.id)
      for (const item of buildUpcoming(own, v.current_mileage)) {
        entries.push({ item, vehicleLabel: `${v.brand} ${v.model} · ${v.license_plate}` })
      }
    }
    return entries.sort((a, b) => compareDue(a.item, b.item)).slice(0, MAX_UPCOMING)
  }, [vehicles, activeRecords])

  if (loadingVehicles || loadingRecords || loadingFuel || loadingExpenses || loadingReminders) return <Spinner />

  const error = vehiclesError ?? recordsError ?? fuelError ?? expensesError ?? remindersError

  const overdueReminders = pendingReminders.filter((i) => i.status === 'overdue').length

  const breakdown = (period: 'thisMonth' | 'thisYear') =>
    `Mantenimiento ${formatMoney(totals.byKind.maintenance[period])} · Combustible ${formatMoney(totals.byKind.fuel[period])} · Otros ${formatMoney(totals.byKind.expense[period])}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </h1>
        <p className="mt-1 text-pine-600">Este es el resumen de tus vehículos.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!vehiclesError && vehicles.length === 0 && (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Car className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Aún no tienes vehículos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">
            Registra tu primer vehículo para empezar a llevar su historial, costos y mantenimientos.
          </p>
          <Link to="/app/vehicles?new=1" className="btn-primary mt-6">
            <Plus className="h-4 w-4" aria-hidden />
            Registrar mi primer vehículo
          </Link>
        </section>
      )}

      {!vehiclesError && vehicles.length > 0 && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Car className="h-4 w-4 text-emerald-600" aria-hidden />
                Vehículos activos
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{vehicles.length}</p>
              <p className="mt-1 text-xs text-pine-600">
                {vehicles.length > 1 ? 'Kilometraje total: ' : 'Kilometraje: '}
                {formatKm(vehicles.reduce((sum, v) => sum + v.current_mileage, 0))}
              </p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
                Gasto este mes
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisMonth)}</p>
              <p className="mt-1 text-xs text-pine-600">{breakdown('thisMonth')}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden />
                Gasto este año
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisYear)}</p>
              <p className="mt-1 text-xs text-pine-600">{breakdown('thisYear')}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                Costo por km
              </div>
              {costPerKm ? (
                <>
                  <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatUnitPrice(costPerKm.value)}</p>
                  <p className="mt-1 text-xs text-pine-600">Últimos {costPerKmMonths} meses, todo incluido, en {formatKm(costPerKm.distance)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-pine-600">
                  Aparecerá cuando tengas {formatKm(MIN_DISTANCE_KM)} medidos entre mantenimientos y cargas.
                </p>
              )}
            </div>
          </section>
          <p className="-mt-4 text-right">
            <Link to="/app/stats" className="text-sm font-semibold text-emerald-700 hover:underline">
              Ver estadísticas
            </Link>
          </p>

          <section className="space-y-3" aria-label="Recordatorios">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-pine-900">Recordatorios</h2>
                {pendingReminders.length > 0 && (
                  <p className="text-sm text-pine-600">
                    {pendingReminders.length} {pendingReminders.length === 1 ? 'pendiente' : 'pendientes'}
                    {overdueReminders > 0 && <> · <span className="font-semibold text-red-700">{overdueReminders} {overdueReminders === 1 ? 'vencido' : 'vencidos'}</span></>}
                  </p>
                )}
              </div>
              <Link to="/app/reminders" className="text-sm font-semibold text-emerald-700 hover:underline">
                {pendingReminders.length > MAX_REMINDERS ? 'Ver todos' : 'Administrar'}
              </Link>
            </div>
            {pendingReminders.length > 0 ? (
              <ReminderList
                items={pendingReminders.slice(0, MAX_REMINDERS)}
                vehicleLabels={vehicles.length > 1 ? vehicleLabels : undefined}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
                No tienes recordatorios pendientes. Créalos desde la pestaña <strong>Recordatorios</strong> de tu vehículo (SOAT, revisión técnica, impuesto…).
              </p>
            )}
          </section>

          {upcoming.length > 0 ? (
            <section className="space-y-3" aria-label="Próximos mantenimientos">
              <h2 className="text-lg font-bold text-pine-900">Próximos mantenimientos</h2>
              <UpcomingList entries={upcoming} />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
              {activeRecords.length === 0
                ? 'Registra un mantenimiento desde el detalle de tu vehículo para ver aquí sus costos y lo que viene después.'
                : 'No tienes mantenimientos programados. Al registrar un servicio puedes indicar cuándo toca el siguiente.'}
            </p>
          )}

          {timeline.length > 0 && (
            <section aria-label="Últimos movimientos" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-pine-900">Últimos movimientos</h2>
                <Link to="/app/history" className="text-sm font-semibold text-emerald-700 hover:underline">
                  Ver historial
                </Link>
              </div>
              <HistoryList entries={timeline.filter((e) => isVisible(e.date, cutoff)).slice(0, MAX_RECENT)} vehicleLabels={vehicles.length > 1 ? vehicleLabels : undefined} />
            </section>
          )}

          <section aria-label="Mis vehículos" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-pine-900">Mis vehículos</h2>
              <Link to="/app/vehicles" className="text-sm font-semibold text-emerald-700 hover:underline">
                Administrar
              </Link>
            </div>
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}
