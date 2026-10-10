import { todayISO } from './format'
import type { PlanInfo, Vehicle } from '../types/app'

/**
 * Límites de cada plan para mostrarlos en la app. La fuente de verdad es la BD
 * (migración 004: plan_vehicle_limit, plan_reminder_limit, plan_history_months).
 */
export const PLAN_LIMITS = {
  free: { vehicles: 1, reminders: 3, historyMonths: 6 },
  premium: { vehicles: 5, reminders: null, historyMonths: null },
} as const

/** Plan con el que se trabaja si no se pudo leer el de la BD (por ejemplo, falta la migración 004). */
export const FALLBACK_PLAN: PlanInfo = {
  plan: 'free',
  subscribed_plan: 'free',
  status: 'active',
  expires_at: null,
  grace_until: null,
  vehicle_limit: PLAN_LIMITS.free.vehicles,
  reminder_limit: PLAN_LIMITS.free.reminders,
  history_months: PLAN_LIMITS.free.historyMonths,
  active_vehicles: 0,
  pending_reminders: 0,
}

/**
 * Primer día visible del historial: hoy menos N meses, mismo día del mes (ajustado al último
 * día si no existe, p. ej. 31 → 30). null = historial completo.
 */
export function historyCutoff(months: number | null): string | null {
  if (months === null) return null
  const [y, m, d] = todayISO().split('-').map(Number)
  const index = y * 12 + (m - 1) - months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

/** ¿El movimiento de esta fecha se muestra con el plan actual? */
export function isVisible(date: string, cutoff: string | null): boolean {
  return cutoff === null || date >= cutoff
}

/**
 * Vehículos editables: los N activos más antiguos (N = límite del plan). Mismo criterio que
 * public.vehicle_is_writable en la BD: created_at y, si empatan, id.
 */
export function writableVehicleIds(vehicles: Vehicle[], limit: number): Set<string> {
  const sorted = [...vehicles].sort((a, b) =>
    a.created_at !== b.created_at ? (a.created_at < b.created_at ? -1 : 1) : a.id < b.id ? -1 : 1,
  )
  return new Set(sorted.slice(0, limit).map((v) => v.id))
}

/** Traduce los errores de límite de plan (migración 004). null si no es uno de ellos. */
export function planError(error: { code?: string }): Error | null {
  switch (error.code) {
    case 'PL001':
      return new Error('Llegaste al límite de vehículos de tu plan. Archiva uno o pásate a Premium para agregar más.')
    case 'PL002':
      return new Error('Llegaste al límite de recordatorios pendientes de tu plan. Completa o descarta uno, o pásate a Premium.')
    case 'PL003':
      return new Error('Este vehículo está en solo lectura con tu plan actual. Pásate a Premium o archiva tus otros vehículos para editarlo.')
    default:
      return null
  }
}

/** Texto que se agrega al aviso de guardado cuando el registro queda fuera del historial visible. */
export function hiddenRecordNote(date: string, cutoff: string | null): string {
  return isVisible(date, cutoff)
    ? ''
    : ' Por su fecha se verá en el historial con Premium; igual se usa en tus alertas y cálculos.'
}
