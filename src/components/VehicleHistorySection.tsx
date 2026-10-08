import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { summarizeHistory, type HistoryEntry } from '../lib/history'
import { formatMoney } from '../lib/format'
import HistoryList from './HistoryList'
import HistoryKindFilter, { type KindFilter } from './HistoryKindFilter'

interface Props {
  /** Movimientos del vehículo, ya ordenados (buildHistory). */
  entries: HistoryEntry[]
}

/** Pestaña "Historial" del vehículo: costo total y línea de tiempo de todos sus movimientos. */
export default function VehicleHistorySection({ entries }: Props) {
  const [kind, setKind] = useState<KindFilter>('all')
  const totals = useMemo(() => summarizeHistory(entries), [entries])
  const visible = useMemo(() => (kind === 'all' ? entries : entries.filter((e) => e.kind === kind)), [entries, kind])

  const breakdown = (period: 'total' | 'thisYear' | 'thisMonth') =>
    `Mantenimiento ${formatMoney(totals.byKind.maintenance[period])} · Combustible ${formatMoney(totals.byKind.fuel[period])} · Otros ${formatMoney(totals.byKind.expense[period])}`

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Costo total del vehículo">
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Costo total registrado</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.total)}</p>
          <p className="mt-1 text-xs text-pine-600">{breakdown('total')}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Este año</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisYear)}</p>
          <p className="mt-1 text-xs text-pine-600">{breakdown('thisYear')}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Este mes</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisMonth)}</p>
          <p className="mt-1 text-xs text-pine-600">{breakdown('thisMonth')}</p>
        </div>
      </section>

      <section className="space-y-4" aria-label="Historial consolidado">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-pine-900">Historial</h2>
          {entries.length > 0 && <HistoryKindFilter value={kind} onChange={setKind} />}
        </div>
        {entries.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
              <History className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-semibold text-pine-900">Todavía no hay movimientos</p>
            <p className="mt-1 max-w-sm text-sm text-pine-600">
              Los mantenimientos, cargas de combustible y gastos que registres aparecerán aquí en orden cronológico.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
            No hay movimientos de este tipo.
          </p>
        ) : (
          <HistoryList entries={visible} />
        )}
      </section>
    </>
  )
}
