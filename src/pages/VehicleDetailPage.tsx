import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Gauge, Plus, Wrench } from 'lucide-react'
import { useVehicleDetail } from '../hooks/useVehicleDetail'
import { archiveMaintenance, createMaintenance, updateMaintenance } from '../services/maintenance'
import { setVehicleMileage } from '../services/vehicles'
import { buildUpcoming, sortHistory, summarize } from '../lib/maintenance'
import { formatDate, formatKm, formatMoney } from '../lib/format'
import { VEHICLE_TYPE_LABELS, type MaintenanceInput, type MaintenanceRecord } from '../types/app'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import MaintenanceForm from '../components/MaintenanceForm'
import MaintenanceList from '../components/MaintenanceList'
import UpcomingList from '../components/UpcomingList'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; record: MaintenanceRecord }

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { vehicle, records, loading, notFound, error, reload } = useVehicleDetail(id)

  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [toArchive, setToArchive] = useState<MaintenanceRecord | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])

  const totals = useMemo(() => summarize(records), [records])
  const history = useMemo(() => sortHistory(records), [records])
  const upcoming = useMemo(
    () => (vehicle ? buildUpcoming(records, vehicle.current_mileage) : []),
    [records, vehicle],
  )

  if (loading) return <Spinner />

  if (notFound || !vehicle) {
    return (
      <div className="space-y-4">
        <Link to="/app/vehicles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a vehículos
        </Link>
        {error ? (
          <Alert>{error}</Alert>
        ) : (
          <div className="card px-6 py-12 text-center">
            <p className="font-semibold text-pine-900">No encontramos este vehículo.</p>
            <p className="mt-1 text-sm text-pine-600">Puede haber sido archivado o el enlace no es correcto.</p>
          </div>
        )}
      </div>
    )
  }

  async function handleSubmit(input: MaintenanceInput, updateVehicleMileage: boolean) {
    if (!vehicle) return
    let message: string
    if (form.mode === 'edit') {
      await updateMaintenance(form.record.id, input)
      message = 'Mantenimiento actualizado.'
    } else {
      await createMaintenance(vehicle.id, input)
      message = 'Mantenimiento registrado.'
    }

    // El mantenimiento ya quedó guardado. Si falla solo el kilometraje, no se lanza error
    // (evita que el usuario reenvíe el formulario y duplique el registro).
    let mileageFailed = false
    if (updateVehicleMileage && input.mileage > vehicle.current_mileage) {
      try {
        await setVehicleMileage(vehicle.id, input.mileage)
      } catch {
        mileageFailed = true
      }
    }

    setNotice(mileageFailed ? `${message} No se pudo actualizar el kilometraje del vehículo; edítalo desde Vehículos.` : message)
    setActionError(null)
    closeForm()
    await reload()
  }

  async function confirmArchive() {
    if (!toArchive) return
    setArchiving(true)
    setActionError(null)
    try {
      await archiveMaintenance(toArchive.id)
      setNotice(`“${toArchive.service_type}” fue archivado.`)
      setToArchive(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo archivar el mantenimiento.')
      setToArchive(null)
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link to="/app/vehicles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Vehículos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-pine-600">
              <span>{VEHICLE_TYPE_LABELS[vehicle.vehicle_type]} · {vehicle.year}</span>
              <span className="rounded-lg bg-pine-50 px-2 py-0.5 text-xs font-bold tracking-wider text-pine-800">{vehicle.license_plate}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-pine-800">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                {formatKm(vehicle.current_mileage)}
              </span>
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setNotice(null); setForm({ mode: 'create' }) }}>
            <Plus className="h-4 w-4" aria-hidden />
            Registrar mantenimiento
          </button>
        </div>
      </div>

      {notice && <Alert kind="success">{notice}</Alert>}
      {(error || actionError) && <Alert>{error ?? actionError}</Alert>}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Costos de mantenimiento">
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Total en mantenimiento</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.total)}</p>
          <p className="mt-1 text-xs text-pine-600">{totals.count} {totals.count === 1 ? 'servicio' : 'servicios'} registrados</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Este año</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisYear)}</p>
          <p className="mt-1 text-xs text-pine-600">Este mes: {formatMoney(totals.thisMonth)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Último servicio</p>
          {totals.lastService ? (
            <>
              <p className="mt-2 truncate text-lg font-extrabold text-pine-900">{totals.lastService.service_type}</p>
              <p className="mt-1 text-xs text-pine-600">
                {formatDate(totals.lastService.service_date)} · {formatKm(totals.lastService.mileage)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-pine-600">Aún sin registros</p>
          )}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-3" aria-label="Próximos mantenimientos">
          <h2 className="text-lg font-bold text-pine-900">Próximos mantenimientos</h2>
          <UpcomingList entries={upcoming.map((item) => ({ item }))} />
        </section>
      )}

      <section className="space-y-3" aria-label="Historial de mantenimiento">
        <h2 className="text-lg font-bold text-pine-900">Historial de mantenimiento</h2>
        {history.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
              <Wrench className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-semibold text-pine-900">Todavía no registraste mantenimientos</p>
            <p className="mt-1 max-w-sm text-sm text-pine-600">
              Anota el último servicio que recuerdes (aceite, filtros, frenos…) y define cuándo toca el siguiente.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => setForm({ mode: 'create' })}>
              <Plus className="h-4 w-4" aria-hidden />
              Registrar el primero
            </button>
          </div>
        ) : (
          <MaintenanceList
            records={history}
            onEdit={(record) => { setNotice(null); setForm({ mode: 'edit', record }) }}
            onArchive={setToArchive}
          />
        )}
      </section>

      {form.mode !== 'closed' && (
        <MaintenanceForm
          key={form.mode === 'edit' ? form.record.id : 'new'}
          vehicle={vehicle}
          record={form.mode === 'edit' ? form.record : null}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {toArchive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-pine-900/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="archive-m-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h2 id="archive-m-title" className="text-lg font-bold text-pine-900">¿Archivar este mantenimiento?</h2>
            <p className="mt-2 text-sm text-pine-600">
              <strong>{toArchive.service_type}</strong> del {formatDate(toArchive.service_date)} dejará de contar en el
              historial y en los costos. No se borra de forma definitiva.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" disabled={archiving} onClick={() => setToArchive(null)}>Cancelar</button>
              <button type="button" className="btn-danger" disabled={archiving} onClick={confirmArchive}>
                {archiving ? 'Archivando…' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
