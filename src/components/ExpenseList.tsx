import { Archive, Gauge, Pencil } from 'lucide-react'
import { formatDate, formatKm, formatMoney } from '../lib/format'
import type { Expense } from '../types/app'

interface Props {
  records: Expense[]
  /** Sin acciones (vehículo en solo lectura), la lista no muestra los botones. */
  onEdit?: (record: Expense) => void
  onArchive?: (record: Expense) => void
}

export default function ExpenseList({ records, onEdit, onArchive }: Props) {
  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id} className="card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-pine-900">{r.category}</h3>
              <p className="mt-0.5 text-sm text-pine-600">{formatDate(r.expense_date)}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-pine-900">{formatMoney(Number(r.amount))}</p>
          </div>

          {r.mileage != null && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-pine-700">
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                {formatKm(r.mileage)}
              </span>
            </div>
          )}

          {r.description && <p className="mt-2 text-sm text-pine-600">{r.description}</p>}

          {onEdit && onArchive && (
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
          )}
        </li>
      ))}
    </ul>
  )
}
