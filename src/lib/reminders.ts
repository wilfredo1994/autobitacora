import { compareDue, computeDue, type DueInfo } from './due'
import type { Reminder, Vehicle } from '../types/app'

/** Un recordatorio pendiente con su estado de vencimiento calculado. */
export interface ReminderItem extends DueInfo {
  reminder: Reminder
}

/**
 * Pendientes ordenados por proximidad (vencidos primero, luego por días y km que faltan).
 * El kilometraje se compara con el del vehículo de cada recordatorio; si el vehículo no está
 * en la lista (archivado), el recordatorio no se muestra.
 */
export function buildPendingReminders(reminders: Reminder[], vehicles: Vehicle[]): ReminderItem[] {
  const mileageById = new Map(vehicles.map((v) => [v.id, v.current_mileage]))
  const items: ReminderItem[] = []
  for (const reminder of reminders) {
    if (reminder.status !== 'pending') continue
    const currentMileage = mileageById.get(reminder.vehicle_id)
    if (currentMileage === undefined) continue
    items.push({ reminder, ...computeDue(reminder.due_date, reminder.due_mileage, currentMileage) })
  }
  return items.sort(compareDue)
}

/** Completados y descartados, del más reciente al más antiguo. */
export function sortClosedReminders(reminders: Reminder[]): Reminder[] {
  return reminders
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => ((a.completed_at ?? a.updated_at) < (b.completed_at ?? b.updated_at) ? 1 : -1))
}
