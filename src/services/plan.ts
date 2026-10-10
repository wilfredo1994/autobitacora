import { supabase } from '../lib/supabase'
import type { PlanInfo } from '../types/app'

/** Plan efectivo del usuario autenticado y sus límites (función get_my_plan de la migración 004). */
export async function getMyPlan(): Promise<PlanInfo> {
  const { data, error } = await supabase.rpc('get_my_plan')

  if (error) {
    // PGRST202 / 42883: la función no existe → falta ejecutar la migración 004.
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Falta ejecutar la migración 004_plan_limits.sql en Supabase. Mientras tanto se aplican los límites del plan Free.')
    }
    throw new Error(error.message)
  }
  const row = (Array.isArray(data) ? data[0] : data) as PlanInfo | undefined
  if (!row) throw new Error('No se pudo leer tu plan.')
  return row
}
