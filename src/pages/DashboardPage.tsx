import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Car, CalendarDays, Gauge, Plus, Wallet } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useVehicles } from '../hooks/useVehicles'
import { useAllMaintenance } from '../hooks/useAllMaintenance'
import { useAllFuel } from '../hooks/useAllFuel'
import { buildUpcoming, summarize } from '../lib/maintenance'
import { summarizeFuel } from '../lib/fuel'
import { formatKm, formatMoney } from '../lib/format'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import VehicleCard from '../components/VehicleCard'
import UpcomingList, { type UpcomingEntry } from '../components/UpcomingList'

const MAX_UPCOMING = 4

export default function DashboardPage() {
  const { user } = useAuth()
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles()
  const { records, loading: loadingRecords, error: recordsError } = useAllMaintenance()
  const { records: fuelRecords, loading: loadingFuel, error: fuelError } = useAllFuel()

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const firstName = fullName?.split(' ')[0]

  // Solo cuentan registros de vehículos activos (no archivados)
  const activeIds = useMemo(() => new Set(vehicles.map((v) => v.id)), [vehicles])
  const activeRecords = useMemo(() => records.filter((r) => activeIds.has(r.vehicle_id)), [activeIds, records])
  const activeFuel = useMemo(() => fuelRecords.filter((r) => activeIds.has(r.vehicle_id)), [activeIds, fuelRecords])

  const totals = useMemo(() => summarize(activeRecords), [activeRecords])
  const fuelTotals = useMemo(() => summarizeFuel(activeFuel), [activeFuel])

  const upcoming = useMemo<UpcomingEntry[]>(() => {
    const entries: UpcomingEntry[] = []
    for (const v of vehicles) {
      const own = activeRecords.filter((r) => r.vehicle_id === v.id)
      for (const item of buildUpcoming(own, v.current_mileage)) {
        entries.push({ item, vehicleLabel: `${v.brand} ${v.model} · ${v.license_plate}` })
      }
    }
    const rank = { overdue: 0, soon: 1, ok: 2 } as const
    return entries
      .sort((a, b) => {
        if (rank[a.item.status] !== rank[b.item.status]) return rank[a.item.status] - rank[b.item.status]
        return (a.item.daysRemaining ?? Infinity) - (b.item.daysRemaining ?? Infinity)
      })
      .slice(0, MAX_UPCOMING)
  }, [vehicles, activeRecords])

  if (loadingVehicles || loadingRecords || loadingFuel) return <Spinner />

  const error = vehiclesError ?? recordsError ?? fuelError

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
              <p className="mt-2 text-3xl font-extrabold text-pine-900">{vehicles.length}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                {vehicles.length > 1 ? 'Kilometraje total' : 'Kilometraje'}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">
                {formatKm(vehicles.reduce((sum, v) => sum + v.current_mileage, 0))}
              </p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
                Gasto este mes
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisMonth + fuelTotals.thisMonth)}</p>
              <p className="mt-1 text-xs text-pine-600">
                Mantenimiento {formatMoney(totals.thisMonth)} · Combustible {formatMoney(fuelTotals.thisMonth)}
              </p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden />
                Gasto este año
              </div>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisYear + fuelTotals.thisYear)}</p>
              <p className="mt-1 text-xs text-pine-600">
                Mantenimiento {formatMoney(totals.thisYear)} · Combustible {formatMoney(fuelTotals.thisYear)}
              </p>
            </div>
          </section>
          <p className="-mt-4 text-xs text-pine-600">
            Los montos incluyen mantenimiento y combustible. Otros gastos (seguro, peajes, etc.) se sumarán cuando estén disponibles.
          </p>

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
