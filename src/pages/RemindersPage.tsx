import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Car } from 'lucide-react'
import { useVehicles } from '../hooks/useVehicles'
import { usePendingReminders } from '../hooks/usePendingReminders'
import { setReminderStatus } from '../services/reminders'
import { buildPendingReminders } from '../lib/reminders'
import type { Reminder, ReminderStatus } from '../types/app'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import ReminderList from '../components/ReminderList'
import { usePlan } from '../plan/PlanProvider'
import { writableVehicleIds } from '../lib/plan'

/** Recordatorios pendientes de todos los vehículos activos, ordenados por proximidad. */
export default function RemindersPage() {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles()
  const { reminders, loading: loadingReminders, error: remindersError, reload } = usePendingReminders()

  const [vehicleId, setVehicleId] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { plan, reload: reloadPlan } = usePlan()
  const readOnlyIds = useMemo(() => {
    const writable = writableVehicleIds(vehicles, plan.vehicle_limit)
    return new Set(vehicles.filter((v) => !writable.has(v.id)).map((v) => v.id))
  }, [vehicles, plan.vehicle_limit])

  const vehicleLabels = useMemo(
    () => new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model} · ${v.license_plate}`])),
    [vehicles],
  )
  const pending = useMemo(() => buildPendingReminders(reminders, vehicles), [reminders, vehicles])
  const visible = useMemo(
    () => (vehicleId === 'all' ? pending : pending.filter((i) => i.reminder.vehicle_id === vehicleId)),
    [pending, vehicleId],
  )

  async function changeStatus(reminder: Reminder, status: ReminderStatus) {
    setBusyId(reminder.id)
    setNotice(null)
    setActionError(null)
    try {
      await setReminderStatus(reminder.id, status)
      setNotice(`“${reminder.title}” fue ${status === 'completed' ? 'marcado como completado' : 'descartado'}.`)
      await Promise.all([reload(), reloadPlan()])
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo actualizar el recordatorio.')
    } finally {
      setBusyId(null)
    }
  }

  if (loadingVehicles || loadingReminders) return <Spinner />

  const error = vehiclesError ?? remindersError ?? actionError
  const overdueCount = visible.filter((i) => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">Recordatorios</h1>
        <p className="mt-1 text-pine-600">Lo que vence por fecha o kilometraje, de lo más cercano a lo más lejano.</p>
      </div>

      {notice && <Alert kind="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      {!vehiclesError && vehicles.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Car className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Aún no tienes vehículos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">Registra un vehículo para crearle recordatorios.</p>
          <Link to="/app/vehicles?new=1" className="btn-primary mt-6">Registrar mi primer vehículo</Link>
        </section>
      ) : pending.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Bell className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">No tienes recordatorios pendientes</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">
            Abre un vehículo y entra a la pestaña <strong>Recordatorios</strong> para crear uno (SOAT, revisión técnica, impuesto…).
          </p>
          <Link to="/app/vehicles" className="btn-primary mt-6">Ir a mis vehículos</Link>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-pine-600">
              {visible.length} {visible.length === 1 ? 'pendiente' : 'pendientes'}
              {plan.reminder_limit !== null && ` · tu plan Free permite ${plan.reminder_limit}`}
              {overdueCount > 0 && <> · <span className="font-semibold text-red-700">{overdueCount} {overdueCount === 1 ? 'vencido' : 'vencidos'}</span></>}
            </p>
            {vehicles.length > 1 && (
              <div className="sm:w-64">
                <label htmlFor="reminders_vehicle" className="sr-only">Vehículo</label>
                <select id="reminders_vehicle" className="field-input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="all">Todos los vehículos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{vehicleLabels.get(v.id)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
              Este vehículo no tiene recordatorios pendientes.
            </p>
          ) : (
            <ReminderList
              items={visible}
              vehicleLabels={vehicleLabels}
              busyId={busyId}
              readOnlyVehicleIds={readOnlyIds}
              onComplete={(r) => void changeStatus(r, 'completed')}
              onDismiss={(r) => void changeStatus(r, 'dismissed')}
            />
          )}
          <p className="text-xs text-pine-600">
            Para editar un recordatorio o ver los completados, abre el vehículo desde su nombre.
          </p>
        </>
      )}
    </div>
  )
}
