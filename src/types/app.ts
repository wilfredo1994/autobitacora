export type VehicleType = 'car' | 'motorcycle' | 'pickup' | 'van' | 'truck' | 'other'

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Auto',
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
