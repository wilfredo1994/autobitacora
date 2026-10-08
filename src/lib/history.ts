import { formatDecimal, todayISO } from './format'
import { FUEL_TYPE_LABELS, FUEL_UNIT_LABELS, type Expense, type FuelRecord, type MaintenanceRecord } from '../types/app'

export type HistoryKind = 'maintenance' | 'fuel' | 'expense'

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  maintenance: 'Mantenimiento',
  fuel: 'Combustible',
  expense: 'Otros gastos',
}

/** Un movimiento del historial consolidado, sin importar de qué tabla viene. */
export interface HistoryEntry {
  key: string
  kind: HistoryKind
  vehicleId: string
  date: string // 'YYYY-MM-DD'
  mileage: number | null
  amount: number
  title: string
  detail: string | null
  createdAt: string
}

export interface HistorySources {
  maintenance: MaintenanceRecord[]
  fuel: FuelRecord[]
  expenses: Expense[]
}

/** Más reciente primero: fecha, luego kilometraje (si ambos lo tienen) y luego orden de registro. */
function sortNewestFirst(a: HistoryEntry, b: HistoryEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.mileage !== null && b.mileage !== null && a.mileage !== b.mileage) return b.mileage - a.mileage
  return a.createdAt < b.createdAt ? 1 : -1
}

/** Une mantenimientos, cargas de combustible y gastos en una sola línea de tiempo. */
export function buildHistory({ maintenance, fuel, expenses }: HistorySources): HistoryEntry[] {
  const entries: HistoryEntry[] = []

  for (const r of maintenance) {
    entries.push({
      key: `maintenance-${r.id}`,
      kind: 'maintenance',
      vehicleId: r.vehicle_id,
      date: r.service_date,
      mileage: r.mileage,
      amount: Number(r.cost),
      title: r.service_type,
      detail: r.workshop,
      createdAt: r.created_at,
    })
  }

  for (const r of fuel) {
    const unit = FUEL_UNIT_LABELS[r.fuel_type]
    entries.push({
      key: `fuel-${r.id}`,
      kind: 'fuel',
      vehicleId: r.vehicle_id,
      date: r.fuel_date,
      mileage: r.mileage,
      amount: Number(r.total_amount),
      title: `${formatDecimal(Number(r.liters))} ${unit} de ${FUEL_TYPE_LABELS[r.fuel_type].toLowerCase()}${r.full_tank ? '' : ' (parcial)'}`,
      detail: r.station,
      createdAt: r.created_at,
    })
  }

  for (const r of expenses) {
    entries.push({
      key: `expense-${r.id}`,
      kind: 'expense',
      vehicleId: r.vehicle_id,
      date: r.expense_date,
      mileage: r.mileage,
      amount: Number(r.amount),
      title: r.category,
      detail: r.description,
      createdAt: r.created_at,
    })
  }

  return entries.sort(sortNewestFirst)
}

export interface PeriodTotals {
  total: number
  thisYear: number
  thisMonth: number
  byKind: Record<HistoryKind, { total: number; thisYear: number; thisMonth: number }>
}

/** Gasto total, del año y del mes, en conjunto y por tipo de movimiento. */
export function summarizeHistory(entries: HistoryEntry[]): PeriodTotals {
  const today = todayISO()
  const yearPrefix = today.slice(0, 4)
  const monthPrefix = today.slice(0, 7)
  const empty = () => ({ total: 0, thisYear: 0, thisMonth: 0 })
  const result: PeriodTotals = {
    ...empty(),
    byKind: { maintenance: empty(), fuel: empty(), expense: empty() },
  }

  for (const e of entries) {
    const kind = result.byKind[e.kind]
    result.total += e.amount
    kind.total += e.amount
    if (e.date.startsWith(yearPrefix)) {
      result.thisYear += e.amount
      kind.thisYear += e.amount
    }
    if (e.date.startsWith(monthPrefix)) {
      result.thisMonth += e.amount
      kind.thisMonth += e.amount
    }
  }
  return result
}

/** Pestaña del detalle del vehículo donde se edita cada tipo de movimiento. */
export function historyEntryLink(entry: HistoryEntry): string {
  const tab = entry.kind === 'fuel' ? '?tab=fuel' : entry.kind === 'expense' ? '?tab=expenses' : ''
  return `/app/vehicles/${entry.vehicleId}${tab}`
}
