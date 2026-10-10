import { supabase } from '../lib/supabase'
import { planError } from '../lib/plan'
import type { Expense, ExpenseInput } from '../types/app'

function toFriendlyError(error: { code?: string; message: string }): Error {
  const limitError = planError(error)
  if (limitError) return limitError
  if (error.code === '23514') {
    return new Error('Revisa los datos: la fecha, la categoría, el monto o el kilometraje no son válidos.')
  }
  if (error.code === '42501') return new Error('No tienes permiso para realizar esta acción.')
  return new Error(error.message)
}

function normalize(input: ExpenseInput): ExpenseInput {
  const description = input.description?.trim()
  return {
    ...input,
    category: input.category.trim(),
    description: description ? description : null,
  }
}

/** Gastos activos de un vehículo (RLS garantiza que sea del usuario). */
export async function listExpenses(vehicleId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as Expense[]
}

/** Todos los gastos activos del usuario (dashboard e historial). RLS filtra por dueño. */
export async function listAllExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })

  if (error) throw toFriendlyError(error)
  return (data ?? []) as Expense[]
}

export async function createExpense(vehicleId: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...normalize(input), vehicle_id: vehicleId })
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Expense
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(normalize(input))
    .eq('id', id)
    .select()
    .single()

  if (error) throw toFriendlyError(error)
  return data as Expense
}

/** Archivar = borrado lógico. No hay policy DELETE en la base de datos. */
export async function archiveExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toFriendlyError(error)
}
