import { useEffect, useState } from 'react'
import { listAllMaintenance } from '../services/maintenance'
import type { MaintenanceRecord } from '../types/app'

export function useAllMaintenance() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listAllMaintenance()
      .then((r) => active && setRecords(r))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudieron cargar los mantenimientos.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { records, loading, error }
}
