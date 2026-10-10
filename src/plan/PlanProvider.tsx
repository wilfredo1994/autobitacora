import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMyPlan } from '../services/plan'
import { FALLBACK_PLAN, historyCutoff } from '../lib/plan'
import type { PlanInfo } from '../types/app'

interface PlanContextValue {
  plan: PlanInfo
  isPremium: boolean
  /** Primer día visible del historial ('YYYY-MM-DD'); null = historial completo. */
  cutoff: string | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined)

/** Carga el plan una vez para toda la zona privada. Si falla, se usan los límites Free. */
export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanInfo>(FALLBACK_PLAN)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPlan(await getMyPlan())
      setError(null)
    } catch (e) {
      setPlan(FALLBACK_PLAN)
      setError(e instanceof Error ? e.message : 'No se pudo leer tu plan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      isPremium: plan.plan === 'premium',
      cutoff: historyCutoff(plan.history_months),
      loading,
      error,
      reload,
    }),
    [plan, loading, error, reload],
  )

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan debe usarse dentro de <PlanProvider>')
  return ctx
}
