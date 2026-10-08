import { useCallback, useEffect, useState } from 'react'
import { getVehicle } from '../services/vehicles'
import { listMaintenance } from '../services/maintenance'
import { listFuel } from '../services/fuel'
import type { FuelRecord, MaintenanceRecord, Vehicle } from '../types/app'

export function useVehicleDetail(vehicleId: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!vehicleId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [v, r, f] = await Promise.all([getVehicle(vehicleId), listMaintenance(vehicleId), listFuel(vehicleId)])
      setVehicle(v)
      setRecords(r)
      setFuelRecords(f)
      setNotFound(v === null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el vehículo.')
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  return { vehicle, records, fuelRecords, loading, notFound, error, reload }
}
