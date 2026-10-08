import { useEffect, useState } from 'react'
import { listAllExpenses } from '../services/expenses'
import type { Expense } from '../types/app'

export function useAllExpenses() {
  const [records, setRecords] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listAllExpenses()
      .then((r) => active && setRecords(r))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudieron cargar los gastos.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { records, loading, error }
}
