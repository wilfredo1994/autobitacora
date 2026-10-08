import { useCallback, useEffect, useState } from 'react'
import { listVehicles } from '../services/vehicles'
import type { Vehicle } from '../types/app'

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      setVehicles(await listVehicles())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los vehículos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { vehicles, loading, error, reload }
}
