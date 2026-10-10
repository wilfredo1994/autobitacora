import { supabase } from '../lib/supabase'
import { planError } from '../lib/plan'
import type { Reminder, ReminderInput, ReminderStatus } from '../types/app'

function toFriendlyError(error: { code?: string; message: string }): Error {
  const limitError = planError(error)
  if (limitError) return limitError
  if (error.code === '23514') {
    return new Error('Revisa los datos: el recordatorio necesita un título y una fecha o un kilometraje válido.')
  }
  if (error.code === '42501') return new Error('No tienes permiso para realizar esta acción.')
  return new Error(error.message)
}

function normalize(input: ReminderInput): ReminderInput {
  const description = input.description?.trim()
  return {
    ...input,
    title: input.title.trim(),
    description: description ? description : null,
  }
}

/** Recordatorios activos (de cualquier estado) de un vehículo. RLS garantiza que sea del usuario. */
export async function listReminders(vehicleId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as Reminder[]
}

/** Recordatorios pendientes del usuario (dashboard y página de recordatorios). RLS filtra por dueño. */
export async function listPendingReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', 'pending')
    .is('deleted_at', null)

  if (error) throw toFriendlyError(error)
  return (data ?? []) as Reminder[]
}

export async function createReminder(vehicleId: string, input: ReminderInput): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...normalize(input), vehicle_id: vehicleId })
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Reminder
}

export async function updateReminder(id: string, input: ReminderInput): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update(normalize(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Reminder
}

/** Completar, descartar o reabrir. completed_at lo ajusta el trigger de la migración 002. */
export async function setReminderStatus(id: string, status: ReminderStatus): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ status })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}

/** Archivar = borrado lógico. No hay policy DELETE en la base de datos. */
export async function archiveReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}
