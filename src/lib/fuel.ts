import { todayISO } from './format'
import type { FuelRecord, FuelType } from '../types/app'

/**
 * Tramo entre dos cargas de tanque lleno del mismo tipo de combustible.
 * La cantidad del tramo es todo lo cargado después del primer lleno, incluido el segundo
 * (también las cargas parciales intermedias): eso es lo que se consumió en `distance` km.
 */
export interface FuelSegment {
  endId: string
  fuelType: FuelType
  distance: number
  quantity: number
  amount: number
}

export interface FuelEfficiency {
  fuelType: FuelType
  /** Promedio ponderado: km totales de los tramos / cantidad total de los tramos. */
  average: number
  /** Consumo del tramo más reciente. */
  last: number
  segments: number
}

function sortOldestFirst(a: FuelRecord, b: FuelRecord): number {
  if (a.fuel_date !== b.fuel_date) return a.fuel_date < b.fuel_date ? -1 : 1
  if (a.mileage !== b.mileage) return a.mileage - b.mileage
  return a.created_at < b.created_at ? -1 : 1
}

/**
 * Método "tanque lleno a tanque lleno", por tipo de combustible (km/l no se mezcla con km/m³).
 * Las cargas parciales antes del primer tanque lleno no forman tramo: no se sabe desde dónde partió el tanque.
 */
export function buildSegments(records: FuelRecord[]): FuelSegment[] {
  const byType = new Map<FuelType, FuelRecord[]>()
  for (const r of [...records].sort(sortOldestFirst)) {
    const list = byType.get(r.fuel_type) ?? []
    list.push(r)
    byType.set(r.fuel_type, list)
  }

  const segments: FuelSegment[] = []
  for (const [fuelType, list] of byType) {
    let start: FuelRecord | null = null
    let quantity = 0
    let amount = 0
    for (const r of list) {
      if (start) {
        quantity += Number(r.liters)
        amount += Number(r.total_amount)
      }
      if (r.full_tank) {
        const distance = start ? r.mileage - start.mileage : 0
        if (start && distance > 0 && quantity > 0) {
          segments.push({ endId: r.id, fuelType, distance, quantity, amount })
        }
        start = r
        quantity = 0
        amount = 0
      }
    }
  }
  return segments
}

/** Consumo por tipo de combustible. Solo aparece un tipo si tiene al menos un tramo completo. */
export function buildEfficiency(segments: FuelSegment[]): FuelEfficiency[] {
  const byType = new Map<FuelType, FuelSegment[]>()
  for (const s of segments) {
    const list = byType.get(s.fuelType) ?? []
    list.push(s)
    byType.set(s.fuelType, list)
  }

  const result: FuelEfficiency[] = []
  for (const [fuelType, list] of byType) {
    const distance = list.reduce((sum, s) => sum + s.distance, 0)
    const quantity = list.reduce((sum, s) => sum + s.quantity, 0)
    const lastSegment = list[list.length - 1]
    result.push({
      fuelType,
      average: distance / quantity,
      last: lastSegment.distance / lastSegment.quantity,
      segments: list.length,
    })
  }
  return result.sort((a, b) => b.segments - a.segments)
}

/** Consumo (km por unidad) del tramo que termina en cada carga, para mostrarlo en el historial. */
export function efficiencyByRecord(segments: FuelSegment[]): Map<string, number> {
  return new Map(segments.map((s) => [s.endId, s.distance / s.quantity]))
}

export interface FuelCostPerKm {
  value: number
  distance: number
}

/**
 * Costo de combustible por km, entre el primer y el último tanque lleno (de cualquier tipo):
 * lo pagado en las cargas posteriores al primer lleno / km recorridos hasta el último lleno.
 * Devuelve null si aún no hay dos llenos con kilometraje distinto (historial insuficiente).
 */
export function fuelCostPerKm(records: FuelRecord[]): FuelCostPerKm | null {
  const sorted = [...records].sort(sortOldestFirst)
  const first = sorted.findIndex((r) => r.full_tank)
  let last = -1
  for (let i = sorted.length - 1; i > first; i--) {
    if (sorted[i].full_tank) {
      last = i
      break
    }
  }
  if (first === -1 || last === -1) return null

  const distance = sorted[last].mileage - sorted[first].mileage
  if (distance <= 0) return null

  let amount = 0
  for (let i = first + 1; i <= last; i++) amount += Number(sorted[i].total_amount)
  return { value: amount / distance, distance }
}

export interface FuelTotals {
  total: number
  thisYear: number
  thisMonth: number
  count: number
  lastFill: FuelRecord | null
}

export function summarizeFuel(records: FuelRecord[]): FuelTotals {
  const today = todayISO()
  const yearPrefix = today.slice(0, 4)
  const monthPrefix = today.slice(0, 7)

  let total = 0
  let thisYear = 0
  let thisMonth = 0
  for (const r of records) {
    const amount = Number(r.total_amount)
    total += amount
    if (r.fuel_date.startsWith(yearPrefix)) thisYear += amount
    if (r.fuel_date.startsWith(monthPrefix)) thisMonth += amount
  }

  const sorted = sortFuelHistory(records)
  return { total, thisYear, thisMonth, count: records.length, lastFill: sorted[0] ?? null }
}

/** Ordena para mostrar el historial: más reciente primero. */
export function sortFuelHistory(records: FuelRecord[]): FuelRecord[] {
  return [...records].sort((a, b) => sortOldestFirst(b, a))
}
