import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Car } from 'lucide-react'
import { useMovements } from '../hooks/useMovements'
import { formatDate, formatKm, formatMoney, formatUnitPrice } from '../lib/format'
import { HISTORY_KIND_LABELS } from '../lib/history'
import {
  MIN_DISTANCE_KM,
  aggregateCostPerKm,
  availableYears,
  costPerKmByVehicle,
  filterByPeriod,
  monthlyAverage,
  monthlyTotals,
  periodRange,
  topCategories,
  totalsByKind,
  type StatsPeriod,
} from '../lib/stats'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import MonthlySpendChart from '../components/charts/MonthlySpendChart'
import ShareBars from '../components/charts/ShareBars'
import KindLegend from '../components/charts/KindLegend'
import { KIND_COLORS, KIND_ORDER, NEUTRAL_COLOR } from '../components/charts/kindColors'
import PremiumNotice from '../components/PremiumNotice'
import { usePlan } from '../plan/PlanProvider'
import { isVisible } from '../lib/plan'

/** El periodo se guarda como texto en el <select>: 'recent' (últimos N meses) o el año ('2026'). */
function parsePeriod(value: string, recentMonths: number): StatsPeriod {
  return value === 'recent' ? { kind: 'recent', months: recentMonths } : { kind: 'year', year: Number(value) }
}

export default function StatsPage() {
  const { vehicles, vehicleLabels, timeline, loading, vehiclesError, error } = useMovements()
  const { isPremium, cutoff } = usePlan()
  // Free: últimos 6 meses. Premium: últimos 12 meses o cualquier año.
  const recentMonths = isPremium ? 12 : 6
  const [periodValue, setPeriodValue] = useState('recent')
  const [vehicleId, setVehicleId] = useState('all')

  const period = parsePeriod(isPremium ? periodValue : 'recent', recentMonths)
  const years = useMemo(() => availableYears(timeline), [timeline])

  const vehicleEntries = useMemo(
    () => (vehicleId === 'all' ? timeline : timeline.filter((e) => e.vehicleId === vehicleId)),
    [timeline, vehicleId],
  )
  // periodValue en vez de period: period es un objeto nuevo en cada render.
  const effectivePeriod = isPremium ? periodValue : 'recent'
  const stats = useMemo(() => {
    const p = parsePeriod(effectivePeriod, recentMonths)
    const { from, to } = periodRange(p)
    const entries = filterByPeriod(vehicleEntries, p)
    const perVehicle = costPerKmByVehicle(vehicleEntries, from, to)
    return {
      entries,
      total: entries.reduce((sum, e) => sum + e.amount, 0),
      months: monthlyTotals(entries, p),
      byKind: totalsByKind(entries),
      categories: topCategories(entries),
      average: monthlyAverage(entries, vehicleEntries, p),
      perVehicle,
      costPerKm: aggregateCostPerKm(perVehicle),
      distance: perVehicle.reduce((sum, r) => sum + r.distance, 0),
    }
  }, [vehicleEntries, effectivePeriod, recentMonths])

  if (loading) return <Spinner />

  const periodLabel = period.kind === 'recent' ? `los últimos ${period.months} meses` : String(period.year)
  const hiddenCount = timeline.filter((e) => !isVisible(e.date, cutoff)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">Estadísticas</h1>
        <p className="mt-1 text-pine-600">Cuánto cuesta tu vehículo, en qué se va el dinero y cómo cambia mes a mes.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!vehiclesError && vehicles.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Car className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Aún no tienes vehículos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">Registra un vehículo y sus movimientos para ver estadísticas.</p>
          <Link to="/app/vehicles?new=1" className="btn-primary mt-6">Registrar mi primer vehículo</Link>
        </section>
      ) : timeline.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <BarChart3 className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Todavía no hay datos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">
            Registra mantenimientos, cargas de combustible o gastos y aquí verás su evolución.
          </p>
          <Link to="/app/vehicles" className="btn-primary mt-6">Ir a mis vehículos</Link>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-56">
              <label htmlFor="stats_period" className="sr-only">Periodo</label>
              <select id="stats_period" className="field-input" value={effectivePeriod} onChange={(e) => setPeriodValue(e.target.value)}>
                <option value="recent">Últimos {recentMonths} meses</option>
                {years.map((y) => (
                  <option key={y} value={String(y)} disabled={!isPremium}>
                    Año {y}{isPremium ? '' : ' · Premium'}
                  </option>
                ))}
              </select>
            </div>
            {vehicles.length > 1 && (
              <div className="sm:w-64">
                <label htmlFor="stats_vehicle" className="sr-only">Vehículo</label>
                <select id="stats_vehicle" className="field-input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="all">Todos los vehículos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{vehicleLabels.get(v.id)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores del periodo">
            <div className="card p-5">
              <p className="text-sm font-semibold text-pine-600">Gasto del periodo</p>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(stats.total)}</p>
              <p className="mt-1 text-xs text-pine-600">
                {stats.entries.length} {stats.entries.length === 1 ? 'movimiento' : 'movimientos'} en {periodLabel}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-semibold text-pine-600">Promedio mensual</p>
              {stats.average ? (
                <>
                  <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(stats.average.value)}</p>
                  <p className="mt-1 text-xs text-pine-600">
                    Sobre {stats.average.months} {stats.average.months === 1 ? 'mes' : 'meses'} desde tu primer registro
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-pine-600">Sin meses con registros en este periodo.</p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-sm font-semibold text-pine-600">Costo por km</p>
              {stats.costPerKm ? (
                <>
                  <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatUnitPrice(stats.costPerKm.value)}</p>
                  <p className="mt-1 text-xs text-pine-600">
                    Todo incluido, en {formatKm(stats.costPerKm.distance)} medidos
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-pine-600">
                  Necesitas al menos {formatKm(MIN_DISTANCE_KM)} entre registros con kilometraje para calcularlo.
                </p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-sm font-semibold text-pine-600">Km recorridos</p>
              {stats.distance > 0 ? (
                <>
                  <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatKm(stats.distance)}</p>
                  <p className="mt-1 text-xs text-pine-600">
                    {stats.costPerKm
                      ? `Del ${formatDate(stats.costPerKm.from)} al ${formatDate(stats.costPerKm.to)}`
                      : 'Medidos entre mantenimientos y cargas'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-pine-600">Registra mantenimientos o cargas con kilometraje en fechas distintas.</p>
              )}
            </div>
          </section>

          <section className="card space-y-4 p-5" aria-label="Gasto por mes">
            <div>
              <h2 className="text-lg font-bold text-pine-900">Gasto por mes</h2>
              <p className="text-sm text-pine-600">
                {period.kind === 'recent' ? `Últimos ${period.months} meses` : `Enero a diciembre de ${period.year}`}, por tipo de movimiento.
              </p>
            </div>
            <MonthlySpendChart months={stats.months} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card space-y-4 p-5" aria-label="Distribución por tipo">
              <h2 className="text-lg font-bold text-pine-900">Distribución por tipo</h2>
              {stats.total > 0 ? (
                <ShareBars
                  total={stats.total}
                  rows={KIND_ORDER.map((kind) => ({
                    key: kind,
                    label: HISTORY_KIND_LABELS[kind],
                    amount: stats.byKind[kind],
                    color: KIND_COLORS[kind],
                  }))}
                />
              ) : (
                <p className="text-sm text-pine-600">Sin gastos en este periodo.</p>
              )}
            </section>

            <section className="card space-y-4 p-5" aria-label="Principales rubros">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-pine-900">Principales rubros</h2>
                {stats.categories.items.length > 0 && <KindLegend />}
              </div>
              {stats.categories.items.length > 0 && isPremium ? (
                <ShareBars
                  total={stats.total}
                  rows={[
                    ...stats.categories.items.map((c) => ({ key: c.key, label: c.label, amount: c.amount, color: KIND_COLORS[c.kind] })),
                    ...(stats.categories.rest > 0
                      ? [{ key: 'rest', label: 'Otros rubros', amount: stats.categories.rest, color: NEUTRAL_COLOR }]
                      : []),
                  ]}
                />
              ) : stats.categories.items.length > 0 ? (
                // Free: el rubro principal y el resto como vista previa de Premium.
                <>
                  <ShareBars
                    total={stats.total}
                    rows={[{ key: stats.categories.items[0].key, label: stats.categories.items[0].label, amount: stats.categories.items[0].amount, color: KIND_COLORS[stats.categories.items[0].kind] }]}
                  />
                  {stats.categories.items.length > 1 && (
                    <PremiumNotice title="Tus demás rubros de gasto">
                      Ve en qué se va el resto de tu dinero con Premium.
                    </PremiumNotice>
                  )}
                </>
              ) : (
                <p className="text-sm text-pine-600">Sin gastos en este periodo.</p>
              )}
            </section>
          </div>

          {vehicleId === 'all' && vehicles.length > 1 && !isPremium && (
            <PremiumNotice title="Comparación entre vehículos">
              Con Premium comparas el gasto y el costo por km de cada uno de tus vehículos.
            </PremiumNotice>
          )}

          {vehicleId === 'all' && vehicles.length > 1 && isPremium && (
            <section className="card space-y-3 p-5" aria-label="Por vehículo">
              <h2 className="text-lg font-bold text-pine-900">Por vehículo</h2>
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="border-b border-pine-100 text-left text-xs font-semibold text-pine-600">
                      <th scope="col" className="px-1 py-2">Vehículo</th>
                      <th scope="col" className="px-1 py-2 text-right">Gasto</th>
                      <th scope="col" className="px-1 py-2 text-right">Km medidos</th>
                      <th scope="col" className="px-1 py-2 text-right">Costo por km</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {vehicles.map((v) => {
                      const spent = stats.entries.filter((e) => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0)
                      const measured = stats.perVehicle.find((r) => r.vehicleId === v.id)
                      const reliable = measured && measured.distance >= MIN_DISTANCE_KM
                      return (
                        <tr key={v.id} className="border-b border-pine-50">
                          <th scope="row" className="px-1 py-2 text-left font-semibold text-pine-800">
                            <Link to={`/app/vehicles/${v.id}?tab=history`} className="hover:text-emerald-700 hover:underline">
                              {vehicleLabels.get(v.id)}
                            </Link>
                          </th>
                          <td className="px-1 py-2 text-right text-pine-900">{formatMoney(spent)}</td>
                          <td className="px-1 py-2 text-right text-pine-700">{measured ? formatKm(measured.distance) : '—'}</td>
                          <td className="px-1 py-2 text-right text-pine-700">
                            {reliable ? formatUnitPrice(measured.cost / measured.distance) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-pine-600">
                “—” en costo por km: aún no hay {formatKm(MIN_DISTANCE_KM)} medidos para ese vehículo en el periodo.
              </p>
            </section>
          )}

          {!isPremium && hiddenCount > 0 && (
            <PremiumNotice title="Estadísticas de años anteriores">
              Tu plan Free muestra los últimos 6 meses. Con Premium ves los últimos 12 meses y cada año completo.
            </PremiumNotice>
          )}

          <details className="text-sm text-pine-600">
            <summary className="cursor-pointer font-semibold text-pine-700 hover:text-pine-900">¿Cómo se calcula el costo por km?</summary>
            <p className="mt-2 max-w-3xl">
              Se toman las lecturas de odómetro de los mantenimientos y las cargas de combustible del periodo. Los km son la
              diferencia entre la primera y la última lectura de cada vehículo, y el costo es todo lo gastado
              (mantenimiento, combustible y otros gastos) después del día de la primera lectura y hasta la última. Lo pagado
              ese primer día corresponde a km anteriores. Solo se muestra con al menos {formatKm(MIN_DISTANCE_KM)} medidos,
              para no dar una cifra engañosa con poco historial.
            </p>
          </details>
        </>
      )}
    </div>
  )
}
