import { useEffect, useState } from 'react'
import { listAllFuel } from '../services/fuel'
import type { FuelRecord } from '../types/app'

export function useAllFuel() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listAllFuel()
      .then((r) => active && setRecords(r))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudieron cargar las cargas de combustible.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { records, loading, error }
}
