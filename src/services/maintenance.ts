import { supabase } from '../lib/supabase'
import type { MaintenanceInput, MaintenanceRecord } from '../types/app'

function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === 'P0001') {
    return new Error('El kilometraje no coincide con el orden de los registros de este vehículo.')
  }
  if (error.code === '23514') {
    return new Error('Revisa los datos: el costo, el kilometraje y las fechas del próximo mantenimiento no son válidos.')
  }
  if (error.code === '42501') return new Error('No tienes permiso para realizar esta acción.')
  return new Error(error.message)
}

function normalize(input: MaintenanceInput): MaintenanceInput {
  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null)
  return {
    ...input,
    service_type: input.service_type.trim(),
    description: clean(input.description),
    workshop: clean(input.workshop),
  }
}

/** Mantenimientos activos de un vehículo (RLS garantiza que sea del usuario). */
export async function listMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('service_date', { ascending: false })
    .order('mileage', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as MaintenanceRecord[]
}

/** Todos los mantenimientos activos del usuario (para el dashboard). RLS filtra por dueño. */
export async function listAllMaintenance(): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*')
    .is('deleted_at', null)
    .order('service_date', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as MaintenanceRecord[]
}

export async function createMaintenance(vehicleId: string, input: MaintenanceInput): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({ ...normalize(input), vehicle_id: vehicleId })
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as MaintenanceRecord
}

export async function updateMaintenance(id: string, input: MaintenanceInput): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(normalize(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as MaintenanceRecord
}

/** Archivar = borrado lógico. No hay policy DELETE en la base de datos. */
export async function archiveMaintenance(id: string): Promise<void> {
  const { error } = await supabase
    .from('maintenance_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}
