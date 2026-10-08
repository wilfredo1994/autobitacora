import { Link } from 'react-router-dom'
import { Fuel, Gauge, Receipt, Wrench } from 'lucide-react'
import { formatDate, formatKm, formatMoney, formatMonth } from '../lib/format'
import { HISTORY_KIND_LABELS, historyEntryLink, type HistoryEntry, type HistoryKind } from '../lib/history'

const KIND_ICONS: Record<HistoryKind, typeof Wrench> = {
  maintenance: Wrench,
  fuel: Fuel,
  expense: Receipt,
}

interface Props {
  /** Ya ordenadas, más reciente primero (buildHistory). */
  entries: HistoryEntry[]
  /** Si se pasa, cada movimiento muestra el vehículo (vista con varios vehículos). */
  vehicleLabels?: Map<string, string>
}

interface MonthGroup {
  month: string // 'YYYY-MM'
  total: number
  entries: HistoryEntry[]
}

function groupByMonth(entries: HistoryEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const entry of entries) {
    const month = entry.date.slice(0, 7)
    let group = groups[groups.length - 1]
    if (!group || group.month !== month) {
      group = { month, total: 0, entries: [] }
      groups.push(group)
    }
    group.total += entry.amount
    group.entries.push(entry)
  }
  return groups
}

/** Línea de tiempo de movimientos agrupada por mes. Cada movimiento enlaza a la pestaña donde se edita. */
export default function HistoryList({ entries, vehicleLabels }: Props) {
  return (
    <div className="space-y-6">
      {groupByMonth(entries).map((group) => (
        <section key={group.month} aria-label={formatMonth(group.month)} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 className="text-sm font-bold uppercase tracking-wide text-pine-700">{formatMonth(group.month)}</h3>
            <p className="text-sm font-semibold text-pine-600">{formatMoney(group.total)}</p>
          </div>
          <ul className="card divide-y divide-pine-50">
            {group.entries.map((entry) => {
              const Icon = KIND_ICONS[entry.kind]
              const vehicleLabel = vehicleLabels?.get(entry.vehicleId)
              return (
                <li key={entry.key} className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-50 text-emerald-600">
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{HISTORY_KIND_LABELS[entry.kind]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={historyEntryLink(entry)} className="min-w-0 truncate font-semibold text-pine-900 hover:text-emerald-700 hover:underline">
                        {entry.title}
                      </Link>
                      <p className="shrink-0 font-extrabold text-pine-900">{formatMoney(entry.amount)}</p>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-pine-600">
                      <span>{formatDate(entry.date)}</span>
                      {entry.mileage !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          {formatKm(entry.mileage)}
                        </span>
                      )}
                      {vehicleLabel && <span className="font-semibold text-pine-700">{vehicleLabel}</span>}
                      {entry.detail && <span className="truncate">{entry.detail}</span>}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
