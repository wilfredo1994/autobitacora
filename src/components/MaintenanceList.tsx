import { Building2, Gauge, Pencil, Archive } from 'lucide-react'
import { formatDate, formatKm, formatMoney } from '../lib/format'
import type { MaintenanceRecord } from '../types/app'

interface Props {
  records: MaintenanceRecord[]
  onEdit: (record: MaintenanceRecord) => void
  onArchive: (record: MaintenanceRecord) => void
}

export default function MaintenanceList({ records, onEdit, onArchive }: Props) {
  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id} className="card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-pine-900">{r.service_type}</h3>
              <p className="mt-0.5 text-sm text-pine-600">{formatDate(r.service_date)}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-pine-900">{formatMoney(Number(r.cost))}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-pine-700">
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
              {formatKm(r.mileage)}
            </span>
            {r.workshop && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-600" aria-hidden />
                {r.workshop}
              </span>
            )}
          </div>

          {r.description && <p className="mt-2 text-sm text-pine-600">{r.description}</p>}

          <div className="mt-3 flex gap-2 border-t border-pine-50 pt-3">
            <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => onEdit(r)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </button>
            <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => onArchive(r)}>
              <Archive className="h-3.5 w-3.5" aria-hidden />
              Archivar
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
