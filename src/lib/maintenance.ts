import { daysBetween, todayISO } from './format'
import type { MaintenanceRecord } from '../types/app'

export type UpcomingStatus = 'overdue' | 'soon' | 'ok'

/** Un mantenimiento pendiente, derivado de next_date / next_mileage del último servicio de su tipo. */
export interface UpcomingItem {
  record: MaintenanceRecord
  status: UpcomingStatus
  daysRemaining: number | null // negativo = vencido
  kmRemaining: number | null // <= 0 = excedido
}

const SOON_DAYS = 30
const SOON_KM = 500

function sortNewestFirst(a: MaintenanceRecord, b: MaintenanceRecord): number {
  if (a.service_date !== b.service_date) return a.service_date < b.service_date ? 1 : -1
  if (a.mileage !== b.mileage) return b.mileage - a.mileage
  return a.created_at < b.created_at ? 1 : -1
}

/**
 * Próximos mantenimientos de UN vehículo.
 * Solo cuenta el servicio más reciente de cada tipo: si ya hiciste un nuevo cambio de aceite,
 * el "próximo" del anterior queda reemplazado y no genera una alerta falsa.
 */
export function buildUpcoming(records: MaintenanceRecord[], currentMileage: number): UpcomingItem[] {
  const today = todayISO()
  const latestByType = new Map<string, MaintenanceRecord>()

  for (const r of [...records].sort(sortNewestFirst)) {
    const key = r.service_type.trim().toLowerCase()
    if (!latestByType.has(key)) latestByType.set(key, r)
  }

  const items: UpcomingItem[] = []
  for (const record of latestByType.values()) {
    if (record.next_date == null && record.next_mileage == null) continue

    const daysRemaining = record.next_date != null ? daysBetween(today, record.next_date) : null
    const kmRemaining = record.next_mileage != null ? record.next_mileage - currentMileage : null

    const overdue = (daysRemaining !== null && daysRemaining < 0) || (kmRemaining !== null && kmRemaining <= 0)
    const soon =
      (daysRemaining !== null && daysRemaining <= SOON_DAYS) || (kmRemaining !== null && kmRemaining <= SOON_KM)

    items.push({ record, status: overdue ? 'overdue' : soon ? 'soon' : 'ok', daysRemaining, kmRemaining })
  }

  const rank: Record<UpcomingStatus, number> = { overdue: 0, soon: 1, ok: 2 }
  return items.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    const da = a.daysRemaining ?? Number.POSITIVE_INFINITY
    const db = b.daysRemaining ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    return (a.kmRemaining ?? Number.POSITIVE_INFINITY) - (b.kmRemaining ?? Number.POSITIVE_INFINITY)
  })
}

export interface MaintenanceTotals {
  total: number
  thisYear: number
  thisMonth: number
  count: number
  lastService: MaintenanceRecord | null
}

export function summarize(records: MaintenanceRecord[]): MaintenanceTotals {
  const today = todayISO()
  const yearPrefix = today.slice(0, 4)
  const monthPrefix = today.slice(0, 7)

  let total = 0
  let thisYear = 0
  let thisMonth = 0
  for (const r of records) {
    const cost = Number(r.cost)
    total += cost
    if (r.service_date.startsWith(yearPrefix)) thisYear += cost
    if (r.service_date.startsWith(monthPrefix)) thisMonth += cost
  }

  const sorted = [...records].sort(sortNewestFirst)
  return { total, thisYear, thisMonth, count: records.length, lastService: sorted[0] ?? null }
}

/** Ordena para mostrar el historial: más reciente primero. */
export function sortHistory(records: MaintenanceRecord[]): MaintenanceRecord[] {
  return [...records].sort(sortNewestFirst)
}
