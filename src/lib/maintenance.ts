import { todayISO } from './format'
import { compareDue, computeDue, type DueInfo, type DueStatus } from './due'
import type { MaintenanceRecord } from '../types/app'

export type UpcomingStatus = DueStatus

/** Un mantenimiento pendiente, derivado de next_date / next_mileage del último servicio de su tipo. */
export interface UpcomingItem extends DueInfo {
  record: MaintenanceRecord
}

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
  const latestByType = new Map<string, MaintenanceRecord>()

  for (const r of [...records].sort(sortNewestFirst)) {
    const key = r.service_type.trim().toLowerCase()
    if (!latestByType.has(key)) latestByType.set(key, r)
  }

  const items: UpcomingItem[] = []
  for (const record of latestByType.values()) {
    if (record.next_date == null && record.next_mileage == null) continue

    items.push({ record, ...computeDue(record.next_date, record.next_mileage, currentMileage) })
  }

  return items.sort(compareDue)
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
