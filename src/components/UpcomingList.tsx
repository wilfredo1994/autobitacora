import { AlertTriangle, CalendarCheck, Clock } from 'lucide-react'
import { formatDate, formatKm } from '../lib/format'
import type { UpcomingItem, UpcomingStatus } from '../lib/maintenance'

export interface UpcomingEntry {
  item: UpcomingItem
  /** Etiqueta del vehículo, útil cuando la lista mezcla varios vehículos. */
  vehicleLabel?: string
}

const STYLES: Record<UpcomingStatus, { icon: typeof Clock; box: string; label: string }> = {
  overdue: { icon: AlertTriangle, box: 'bg-red-50 text-red-700', label: 'Vencido' },
  soon: { icon: Clock, box: 'bg-amber-50 text-amber-700', label: 'Próximo' },
  ok: { icon: CalendarCheck, box: 'bg-emerald-50 text-emerald-700', label: 'Al día' },
}

function describe(item: UpcomingItem): string[] {
  const parts: string[] = []
  const { record, daysRemaining, kmRemaining } = item

  if (record.next_date != null && daysRemaining !== null) {
    const when =
      daysRemaining < 0
        ? `vencido hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'}`
        : daysRemaining === 0
          ? 'es hoy'
          : `en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`
    parts.push(`${formatDate(record.next_date)} (${when})`)
  }
  if (record.next_mileage != null && kmRemaining !== null) {
    const diff =
      kmRemaining <= 0 ? `excedido por ${formatKm(Math.abs(kmRemaining))}` : `faltan ${formatKm(kmRemaining)}`
    parts.push(`${formatKm(record.next_mileage)} (${diff})`)
  }
  return parts
}

export default function UpcomingList({ entries }: { entries: UpcomingEntry[] }) {
  return (
    <ul className="space-y-2.5">
      {entries.map(({ item, vehicleLabel }) => {
        const { icon: Icon, box, label } = STYLES[item.status]
        return (
          <li key={item.record.id} className="card flex items-start gap-3.5 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${box}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-pine-900">
                {item.record.service_type}
                <span className={`ml-2 rounded-md px-1.5 py-0.5 align-middle text-xs font-semibold ${box}`}>{label}</span>
              </p>
              {vehicleLabel && <p className="text-xs text-pine-600">{vehicleLabel}</p>}
              <p className="mt-0.5 text-sm text-pine-700">{describe(item).join(' · ')}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
