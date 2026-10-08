import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, History } from 'lucide-react'
import { useVehicles } from '../hooks/useVehicles'
import { useAllMaintenance } from '../hooks/useAllMaintenance'
import { useAllFuel } from '../hooks/useAllFuel'
import { useAllExpenses } from '../hooks/useAllExpenses'
import { buildHistory } from '../lib/history'
import { formatMoney } from '../lib/format'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import HistoryList from '../components/HistoryList'
import HistoryKindFilter, { type KindFilter } from '../components/HistoryKindFilter'

const PAGE_SIZE = 50

/** Historial consolidado de todos los vehículos activos del usuario. */
export default function HistoryPage() {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles()
  const { records, loading: loadingRecords, error: recordsError } = useAllMaintenance()
  const { records: fuelRecords, loading: loadingFuel, error: fuelError } = useAllFuel()
  const { records: expenses, loading: loadingExpenses, error: expensesError } = useAllExpenses()

  const [vehicleId, setVehicleId] = useState('all')
  const [kind, setKind] = useState<KindFilter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const vehicleLabels = useMemo(
    () => new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model} · ${v.license_plate}`])),
    [vehicles],
  )

  // Solo cuentan movimientos de vehículos activos (no archivados)
  const timeline = useMemo(() => {
    const entries = buildHistory({ maintenance: records, fuel: fuelRecords, expenses })
    return entries.filter((e) => vehicleLabels.has(e.vehicleId))
  }, [records, fuelRecords, expenses, vehicleLabels])

  const filtered = useMemo(
    () => timeline.filter((e) => (vehicleId === 'all' || e.vehicleId === vehicleId) && (kind === 'all' || e.kind === kind)),
    [timeline, vehicleId, kind],
  )
  const filteredTotal = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered])

  if (loadingVehicles || loadingRecords || loadingFuel || loadingExpenses) return <Spinner />

  const error = vehiclesError ?? recordsError ?? fuelError ?? expensesError

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">Historial</h1>
        <p className="mt-1 text-pine-600">Mantenimientos, combustible y otros gastos en orden cronológico.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!vehiclesError && vehicles.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Car className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Aún no tienes vehículos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">Registra un vehículo para empezar a llevar su historial.</p>
          <Link to="/app/vehicles?new=1" className="btn-primary mt-6">Registrar mi primer vehículo</Link>
        </section>
      ) : timeline.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <History className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Todavía no hay movimientos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">
            Abre un vehículo y registra un mantenimiento, una carga de combustible o un gasto.
          </p>
          <Link to="/app/vehicles" className="btn-primary mt-6">Ir a mis vehículos</Link>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <HistoryKindFilter value={kind} onChange={(k) => { setKind(k); setLimit(PAGE_SIZE) }} />
            {vehicles.length > 1 && (
              <div className="sm:w-64">
                <label htmlFor="history_vehicle" className="sr-only">Vehículo</label>
                <select
                  id="history_vehicle"
                  className="field-input"
                  value={vehicleId}
                  onChange={(e) => { setVehicleId(e.target.value); setLimit(PAGE_SIZE) }}
                >
                  <option value="all">Todos los vehículos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{vehicleLabels.get(v.id)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-sm text-pine-600">
            {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'} · <strong className="text-pine-900">{formatMoney(filteredTotal)}</strong>
          </p>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
              No hay movimientos con estos filtros.
            </p>
          ) : (
            <>
              <HistoryList entries={filtered.slice(0, limit)} vehicleLabels={vehicles.length > 1 ? vehicleLabels : undefined} />
              {filtered.length > limit && (
                <div className="flex justify-center">
                  <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                    Ver más movimientos
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
