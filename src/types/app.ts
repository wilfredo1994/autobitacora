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
