import { supabase } from '../lib/supabase'
import type { Vehicle, VehicleInput } from '../types/app'

/** Normaliza el texto del formulario antes de guardarlo. */
function normalize(input: VehicleInput): VehicleInput {
  return {
    ...input,
    brand: input.brand.trim(),
    model: input.model.trim(),
    license_plate: input.license_plate.trim().toUpperCase(),
  }
}

/** Traduce errores de PostgreSQL/PostgREST a mensajes entendibles. */
function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('Ya tienes un vehículo activo con esa placa.')
  }
  if (error.code === '23514') {
    return new Error('Revisa los datos: año, kilometraje o placa no son válidos.')
  }
  if (error.code === '42501') {
    return new Error('No tienes permiso para realizar esta acción.')
  }
  return new Error(error.message)
}

/** Vehículos activos (no archivados) del usuario autenticado. RLS filtra por dueño. */
export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as Vehicle[]
}

/** user_id lo completa la BD con auth.uid(); RLS valida que sea el del usuario. */
export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(normalize(input))
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Vehicle
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(normalize(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Vehicle
}

/** Archivar = borrado lógico (deleted_at). El historial futuro se conserva. */
export async function archiveVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}
