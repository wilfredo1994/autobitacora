import { daysBetween, formatDate, formatKm, todayISO } from './format'

/** Estado de algo que vence por fecha y/o kilometraje (próximo mantenimiento, recordatorio). */
export type DueStatus = 'overdue' | 'soon' | 'ok'

export interface DueInfo {
  status: DueStatus
  daysRemaining: number | null // negativo = vencido
  kmRemaining: number | null // <= 0 = excedido
}

/** Umbrales de "Próximo": faltan 30 días o menos, o 500 km o menos. */
export const SOON_DAYS = 30
export const SOON_KM = 500

/**
 * Vencido si la fecha pasó o el kilometraje actual alcanzó el objetivo; Próximo si está dentro
 * de los umbrales; Al día en otro caso. Si hay fecha y km, manda lo que ocurra primero.
 */
export function computeDue(dueDate: string | null, dueMileage: number | null, currentMileage: number): DueInfo {
  const daysRemaining = dueDate != null ? daysBetween(todayISO(), dueDate) : null
  const kmRemaining = dueMileage != null ? dueMileage - currentMileage : null

  const overdue = (daysRemaining !== null && daysRemaining < 0) || (kmRemaining !== null && kmRemaining <= 0)
  const soon = (daysRemaining !== null && daysRemaining <= SOON_DAYS) || (kmRemaining !== null && kmRemaining <= SOON_KM)

  return { status: overdue ? 'overdue' : soon ? 'soon' : 'ok', daysRemaining, kmRemaining }
}

const STATUS_RANK: Record<DueStatus, number> = { overdue: 0, soon: 1, ok: 2 }

/** Orden por proximidad: primero el estado, luego los días que faltan y luego los km que faltan. */
export function compareDue(a: DueInfo, b: DueInfo): number {
  if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status]
  const da = a.daysRemaining ?? Number.POSITIVE_INFINITY
  const db = b.daysRemaining ?? Number.POSITIVE_INFINITY
  if (da !== db) return da - db
  return (a.kmRemaining ?? Number.POSITIVE_INFINITY) - (b.kmRemaining ?? Number.POSITIVE_INFINITY)
}

/** Textos como "12 oct 2026 (en 4 días)" y "232,000 km (faltan 500 km)". */
export function describeDue(dueDate: string | null, dueMileage: number | null, info: DueInfo): string[] {
  const parts: string[] = []
  const { daysRemaining, kmRemaining } = info

  if (dueDate != null && daysRemaining !== null) {
    const when =
      daysRemaining < 0
        ? `vencido hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'}`
        : daysRemaining === 0
          ? 'es hoy'
          : `en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`
    parts.push(`${formatDate(dueDate)} (${when})`)
  }
  if (dueMileage != null && kmRemaining !== null) {
    const diff = kmRemaining <= 0 ? `excedido por ${formatKm(Math.abs(kmRemaining))}` : `faltan ${formatKm(kmRemaining)}`
    parts.push(`${formatKm(dueMileage)} (${diff})`)
  }
  return parts
}
