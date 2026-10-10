import { todayISO } from './format'
import { HISTORY_KIND_LABELS, type HistoryEntry, type HistoryKind } from './history'

/**
 * Periodo de las estadísticas: los últimos N meses (incluido el actual) o un año calendario.
 * Free: últimos 6 meses. Premium: últimos 12 meses o cualquier año.
 */
export type StatsPeriod = { kind: 'recent'; months: number } | { kind: 'year'; year: number }

/** Distancia mínima medida para mostrar un costo por km (con menos, la cifra no es confiable). */
export const MIN_DISTANCE_KM = 500

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Los meses del periodo, en orden ('YYYY-MM'). */
export function periodMonths(period: StatsPeriod): string[] {
  const length = period.kind === 'year' ? 12 : period.months
  const first = period.kind === 'year' ? `${period.year}-01` : shiftMonth(todayISO().slice(0, 7), -(length - 1))
  return Array.from({ length }, (_, i) => shiftMonth(first, i))
}

/** Rango de fechas del periodo: desde el día 1 del primer mes hasta el fin del último (comparación de texto). */
export function periodRange(period: StatsPeriod): { from: string; to: string } {
  const months = periodMonths(period)
  return { from: `${months[0]}-01`, to: `${months[months.length - 1]}-31` }
}

export function filterByPeriod(entries: HistoryEntry[], period: StatsPeriod): HistoryEntry[] {
  const { from, to } = periodRange(period)
  return entries.filter((e) => e.date >= from && e.date <= to)
}

/** Años con movimientos, del más reciente al más antiguo (siempre incluye el actual). */
export function availableYears(entries: HistoryEntry[]): number[] {
  const years = new Set(entries.map((e) => Number(e.date.slice(0, 4))))
  years.add(Number(todayISO().slice(0, 4)))
  return [...years].sort((a, b) => b - a)
}

export type KindAmounts = Record<HistoryKind, number>

export interface MonthTotals extends KindAmounts {
  month: string // 'YYYY-MM'
  total: number
}

const emptyAmounts = (): KindAmounts => ({ maintenance: 0, fuel: 0, expense: 0 })

/** Gasto de cada mes del periodo, por tipo de movimiento (incluye meses en cero). */
export function monthlyTotals(entries: HistoryEntry[], period: StatsPeriod): MonthTotals[] {
  const byMonth = new Map(periodMonths(period).map((month) => [month, { month, total: 0, ...emptyAmounts() }]))
  for (const e of entries) {
    const row = byMonth.get(e.date.slice(0, 7))
    if (!row) continue
    row[e.kind] += e.amount
    row.total += e.amount
  }
  return [...byMonth.values()]
}

export function totalsByKind(entries: HistoryEntry[]): KindAmounts {
  const totals = emptyAmounts()
  for (const e of entries) totals[e.kind] += e.amount
  return totals
}

/**
 * Promedio mensual del periodo. Solo cuenta los meses transcurridos desde el primer registro
 * del usuario (allEntries): si empezó a usar la app hace 3 meses, se divide entre 3, no entre 12.
 * Devuelve null si no hay meses que promediar.
 */
export function monthlyAverage(
  periodEntries: HistoryEntry[],
  allEntries: HistoryEntry[],
  period: StatsPeriod,
): { value: number; months: number } | null {
  if (allEntries.length === 0) return null
  const firstMonth = allEntries.reduce((min, e) => (e.date < min ? e.date : min), allEntries[0].date).slice(0, 7)
  const currentMonth = todayISO().slice(0, 7)
  const months = periodMonths(period).filter((m) => m >= firstMonth && m <= currentMonth)
  if (months.length === 0) return null
  return { value: periodEntries.reduce((sum, e) => sum + e.amount, 0) / months.length, months: months.length }
}

export interface CategoryTotal {
  key: string
  label: string
  kind: HistoryKind
  amount: number
}

/**
 * Principales rubros del gasto: tipo de servicio (mantenimiento), categoría (otros gastos) y
 * el combustible como un solo rubro. Los que no entran en el top se agrupan en "Otros rubros".
 */
export function topCategories(entries: HistoryEntry[], limit = 6): { items: CategoryTotal[]; rest: number } {
  const groups = new Map<string, CategoryTotal>()
  for (const e of entries) {
    const title = e.kind === 'fuel' ? HISTORY_KIND_LABELS.fuel : e.title.trim()
    // "cambio de aceite" y "Cambio de aceite" son el mismo rubro; se muestra con mayúscula inicial.
    const label = title.charAt(0).toLocaleUpperCase() + title.slice(1)
    const key = `${e.kind}:${title.toLocaleLowerCase()}`
    const group = groups.get(key) ?? { key, label, kind: e.kind, amount: 0 }
    group.amount += e.amount
    groups.set(key, group)
  }
  const sorted = [...groups.values()].filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount)
  const items = sorted.slice(0, limit)
  const rest = sorted.slice(limit).reduce((sum, g) => sum + g.amount, 0)
  return { items, rest }
}

export interface CostPerKm {
  value: number
  cost: number
  distance: number
  from: string // fecha de la primera lectura de odómetro usada
  to: string // fecha de la última
  vehicles: number // vehículos con historial suficiente
}

export interface VehicleCost {
  vehicleId: string
  cost: number
  distance: number
  from: string
  to: string
}

/**
 * Costo total por km de UN vehículo dentro de un rango de fechas.
 *
 * Lecturas de odómetro: mantenimientos y cargas (la BD valida su orden). El kilometraje de los
 * gastos es opcional y no se valida, así que no se usa. Distancia = última lectura − primera.
 * Costo = todo lo gastado (mantenimiento + combustible + otros) DESPUÉS del día de la primera
 * lectura y hasta la última: lo pagado ese primer día corresponde a km anteriores o es la carga
 * que deja el tanque lleno de partida (mismo criterio que el costo por km de combustible).
 * Devuelve null si no hay dos lecturas distintas.
 */
export function vehicleCostPerKm(entries: HistoryEntry[], from: string, to: string): Omit<VehicleCost, 'vehicleId'> | null {
  const inRange = entries.filter((e) => e.date >= from && e.date <= to)
  const readings = inRange
    .filter((e) => e.kind !== 'expense' && e.mileage !== null)
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.mileage ?? 0) - (b.mileage ?? 0)))
  if (readings.length < 2) return null

  const first = readings[0]
  const last = readings[readings.length - 1]
  const distance = (last.mileage ?? 0) - (first.mileage ?? 0)
  if (distance <= 0 || last.date === first.date) return null

  const cost = inRange.filter((e) => e.date > first.date && e.date <= last.date).reduce((sum, e) => sum + e.amount, 0)
  return { cost, distance, from: first.date, to: last.date }
}

/** Costo por km de cada vehículo del rango (los que tienen dos lecturas distintas). */
export function costPerKmByVehicle(entries: HistoryEntry[], from: string, to: string): VehicleCost[] {
  const byVehicle = new Map<string, HistoryEntry[]>()
  for (const e of entries) {
    const list = byVehicle.get(e.vehicleId) ?? []
    list.push(e)
    byVehicle.set(e.vehicleId, list)
  }
  const result: VehicleCost[] = []
  for (const [vehicleId, list] of byVehicle) {
    const measured = vehicleCostPerKm(list, from, to)
    if (measured) result.push({ vehicleId, ...measured })
  }
  return result
}

/**
 * Costo total por km de un conjunto de vehículos: suma de costos / suma de km medidos.
 * Devuelve null si la distancia medida no llega a MIN_DISTANCE_KM: con poco historial la cifra
 * engañaría (sección 18 del documento maestro).
 */
export function aggregateCostPerKm(rows: VehicleCost[]): CostPerKm | null {
  const distance = rows.reduce((sum, r) => sum + r.distance, 0)
  if (distance < MIN_DISTANCE_KM) return null
  const cost = rows.reduce((sum, r) => sum + r.cost, 0)
  return {
    value: cost / distance,
    cost,
    distance,
    from: rows.reduce((min, r) => (r.from < min ? r.from : min), rows[0].from),
    to: rows.reduce((max, r) => (r.to > max ? r.to : max), rows[0].to),
    vehicles: rows.length,
  }
}
