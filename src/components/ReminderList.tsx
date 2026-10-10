import { Link } from 'react-router-dom'
import { Check, Pencil, X } from 'lucide-react'
import { describeDue } from '../lib/due'
import type { ReminderItem } from '../lib/reminders'
import type { Reminder } from '../types/app'
import { DUE_STYLES } from './UpcomingList'

interface Props {
  items: ReminderItem[]
  /** Si se pasa, cada recordatorio muestra su vehículo con un enlace a su pestaña de recordatorios. */
  vehicleLabels?: Map<string, string>
  /** Sin acciones, la lista es solo de lectura (por ejemplo, en el resumen). */
  onComplete?: (reminder: Reminder) => void
  onDismiss?: (reminder: Reminder) => void
  onEdit?: (reminder: Reminder) => void
  /** Recordatorio con una acción en curso: sus botones se deshabilitan. */
  busyId?: string | null
  /** Vehículos en solo lectura por el plan: sus recordatorios no muestran acciones. */
  readOnlyVehicleIds?: Set<string>
}

/** Recordatorios pendientes, ya ordenados por proximidad (buildPendingReminders). */
export default function ReminderList({ items, vehicleLabels, onComplete, onDismiss, onEdit, busyId, readOnlyVehicleIds }: Props) {
  const hasActions = Boolean(onComplete || onDismiss || onEdit)

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const { reminder } = item
        const { icon: Icon, box, label } = DUE_STYLES[item.status]
        const vehicleLabel = vehicleLabels?.get(reminder.vehicle_id)
        const busy = busyId === reminder.id
        return (
          <li key={reminder.id} className="card p-4">
            <div className="flex items-start gap-3.5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${box}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-pine-900">
                  {reminder.title}
                  <span className={`ml-2 rounded-md px-1.5 py-0.5 align-middle text-xs font-semibold ${box}`}>{label}</span>
                </p>
                {vehicleLabel && (
                  <Link to={`/app/vehicles/${reminder.vehicle_id}?tab=reminders`} className="text-xs font-semibold text-emerald-700 hover:underline">
                    {vehicleLabel}
                  </Link>
                )}
                <p className="mt-0.5 text-sm text-pine-700">{describeDue(reminder.due_date, reminder.due_mileage, item).join(' · ')}</p>
                {reminder.description && <p className="mt-1 text-sm text-pine-600">{reminder.description}</p>}
              </div>
            </div>

            {hasActions && !readOnlyVehicleIds?.has(reminder.vehicle_id) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-pine-50 pt-3">
                {onComplete && (
                  <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => onComplete(reminder)}>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Completar
                  </button>
                )}
                {onEdit && (
                  <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => onEdit(reminder)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Editar
                  </button>
                )}
                {onDismiss && (
                  <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => onDismiss(reminder)}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Descartar
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
