import { supabase } from '../lib/supabase'
import { planError } from '../lib/plan'
import type { FuelInput, FuelRecord } from '../types/app'

function toFriendlyError(error: { code?: string; message: string }): Error {
  const limitError = planError(error)
  if (limitError) return limitError
  if (error.code === 'P0001') {
    return new Error('El kilometraje no coincide con el orden de los registros de este vehículo.')
  }
  if (error.code === '23514') {
    return new Error('Revisa los datos: la fecha, el kilometraje, la cantidad o el precio no son válidos.')
  }
  if (error.code === '42501') return new Error('No tienes permiso para realizar esta acción.')
  return new Error(error.message)
}

/** total_amount se envía por si la BD no tiene el trigger; con el trigger, la BD lo recalcula igual. */
function toRow(input: FuelInput) {
  const station = input.station?.trim()
  return {
    ...input,
    station: station ? station : null,
    total_amount: Math.round(input.liters * input.price_per_liter * 100) / 100,
  }
}

/** Cargas activas de un vehículo (RLS garantiza que sea del usuario). */
export async function listFuel(vehicleId: string): Promise<FuelRecord[]> {
  const { data, error } = await supabase
    .from('fuel_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('fuel_date', { ascending: false })
    .order('mileage', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as FuelRecord[]
}

/** Todas las cargas activas del usuario (para el dashboard). RLS filtra por dueño. */
export async function listAllFuel(): Promise<FuelRecord[]> {
  const { data, error } = await supabase
    .from('fuel_records')
    .select('*')
    .is('deleted_at', null)
    .order('fuel_date', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as FuelRecord[]
}

export async function createFuel(vehicleId: string, input: FuelInput): Promise<FuelRecord> {
  const { data, error } = await supabase
    .from('fuel_records')
    .insert({ ...toRow(input), vehicle_id: vehicleId })
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as FuelRecord
}

export async function updateFuel(id: string, input: FuelInput): Promise<FuelRecord> {
  const { data, error } = await supabase
    .from('fuel_records')
    .update(toRow(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as FuelRecord
}

/** Archivar = borrado lógico. No hay policy DELETE en la base de datos. */
export async function archiveFuel(id: string): Promise<void> {
  const { error } = await supabase
    .from('fuel_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}
