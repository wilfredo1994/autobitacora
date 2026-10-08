export type VehicleType = 'car' | 'suv' | 'motorcycle' | 'pickup' | 'van' | 'truck' | 'other'

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Auto',
  suv: 'SUV',
  motorcycle: 'Moto',
  pickup: 'Camioneta pickup',
  van: 'Van / Minivan',
  truck: 'Camión',  
  other: 'Otro',
}

export const VEHICLE_TYPES = Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]

/** Fila de public.vehicles tal como la devuelve Supabase. */
export interface Vehicle {
  id: string
  user_id: string
  brand: string
  model: string
  year: number
  license_plate: string
  vehicle_type: VehicleType
  current_mileage: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Datos que el usuario completa en el formulario (user_id lo asigna la BD). */
export interface VehicleInput {
  brand: string
  model: string
  year: number
  license_plate: string
  vehicle_type: VehicleType
  current_mileage: number
}

/** Fila de public.maintenance_records. */
export interface MaintenanceRecord {
  id: string
  vehicle_id: string
  service_type: string
  description: string | null
  service_date: string // 'YYYY-MM-DD'
  mileage: number
  cost: number
  workshop: string | null
  next_mileage: number | null
  next_date: string | null // 'YYYY-MM-DD'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Datos del formulario de mantenimiento (vehicle_id se pasa aparte). */
export interface MaintenanceInput {
  service_type: string
  description: string | null
  service_date: string
  mileage: number
  cost: number
  workshop: string | null
  next_mileage: number | null
  next_date: string | null
}

/** Sugerencias para el campo "tipo de servicio" (el usuario puede escribir otro). */
export const SERVICE_TYPE_SUGGESTIONS = [
  'Cambio de aceite',
  'Filtro de aceite',
  'Filtro de aire',
  'Filtro de combustible',
  'Filtro de cabina',
  'Frenos (pastillas/discos)',
  'Llantas (rotación/cambio)',
  'Alineamiento y balanceo',
  'Batería',
  'Bujías',
  'Correa de distribución',
  'Refrigerante',
  'Suspensión',
  'Revisión técnica',
  'Mantenimiento general',
]

export type FuelType = 'gasoline' | 'diesel' | 'glp' | 'gnv' | 'electric' | 'other'

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasoline: 'Gasolina',
  diesel: 'Diésel',
  glp: 'GLP',
  gnv: 'GNV',
  electric: 'Eléctrico',
  other: 'Otro',
}

export const FUEL_TYPES = Object.keys(FUEL_TYPE_LABELS) as FuelType[]

/**
 * Unidad de la cantidad cargada. La columna se llama `liters`, pero para GNV se registran m³
 * y para eléctrico kWh: así el consumo (km por unidad) sigue teniendo sentido.
 */
export const FUEL_UNIT_LABELS: Record<FuelType, string> = {
  gasoline: 'L',
  diesel: 'L',
  glp: 'L',
  gnv: 'm³',
  electric: 'kWh',
  other: 'L',
}

/** Fila de public.fuel_records. */
export interface FuelRecord {
  id: string
  vehicle_id: string
  fuel_date: string // 'YYYY-MM-DD'
  mileage: number
  fuel_type: FuelType
  liters: number
  price_per_liter: number
  total_amount: number // lo calcula la BD: round(liters * price_per_liter, 2)
  station: string | null
  full_tank: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Datos del formulario de carga (vehicle_id se pasa aparte; total_amount lo calcula la BD). */
export interface FuelInput {
  fuel_date: string
  mileage: number
  fuel_type: FuelType
  liters: number
  price_per_liter: number
  station: string | null
  full_tank: boolean
}
