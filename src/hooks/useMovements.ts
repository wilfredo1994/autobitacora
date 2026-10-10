import { useMemo } from 'react'
import { useVehicles } from './useVehicles'
import { useAllMaintenance } from './useAllMaintenance'
import { useAllFuel } from './useAllFuel'
import { useAllExpenses } from './useAllExpenses'
import { buildHistory } from '../lib/history'

/**
 * Vehículos activos y la línea de tiempo de todos sus movimientos (mantenimiento, combustible
 * y otros gastos). Los movimientos de vehículos archivados quedan fuera.
 */
export function useMovements() {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles()
  const { records, loading: loadingRecords, error: recordsError } = useAllMaintenance()
  const { records: fuelRecords, loading: loadingFuel, error: fuelError } = useAllFuel()
  const { records: expenses, loading: loadingExpenses, error: expensesError } = useAllExpenses()

  const vehicleLabels = useMemo(
    () => new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model} · ${v.license_plate}`])),
    [vehicles],
  )

  const timeline = useMemo(
    () => buildHistory({ maintenance: records, fuel: fuelRecords, expenses }).filter((e) => vehicleLabels.has(e.vehicleId)),
    [records, fuelRecords, expenses, vehicleLabels],
  )

  return {
    vehicles,
    vehicleLabels,
    timeline,
    loading: loadingVehicles || loadingRecords || loadingFuel || loadingExpenses,
    vehiclesError,
    error: vehiclesError ?? recordsError ?? fuelError ?? expensesError,
  }
}
