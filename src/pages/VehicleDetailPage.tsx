import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Fuel, Gauge, History, Plus, Receipt, Wrench } from 'lucide-react'
import { useVehicleDetail } from '../hooks/useVehicleDetail'
import { archiveMaintenance, createMaintenance, updateMaintenance } from '../services/maintenance'
import { setVehicleMileage } from '../services/vehicles'
import { buildUpcoming, sortHistory, summarize } from '../lib/maintenance'
import { buildHistory } from '../lib/history'
import { formatDate, formatKm, formatMoney } from '../lib/format'
import { VEHICLE_TYPE_LABELS, type MaintenanceInput, type MaintenanceRecord } from '../types/app'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import MaintenanceForm from '../components/MaintenanceForm'
import MaintenanceList from '../components/MaintenanceList'
import UpcomingList from '../components/UpcomingList'
import ConfirmDialog from '../components/ConfirmDialog'
import FuelSection from '../components/FuelSection'
import ExpenseSection from '../components/ExpenseSection'
import VehicleHistorySection from '../components/VehicleHistorySection'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; record: MaintenanceRecord }
type Tab = 'maintenance' | 'fuel' | 'expenses' | 'history'

const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: 'maintenance', label: 'Mantenimiento', icon: Wrench },
  { id: 'fuel', label: 'Combustible', icon: Fuel },
  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'history', label: 'Historial', icon: History },
]

/** La pestaña vive en la URL (?tab=fuel) para poder enlazarla; sin parámetro = mantenimiento. */
function parseTab(value: string | null): Tab {
  return TABS.some((t) => t.id === value) ? (value as Tab) : 'maintenance'
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { vehicle, records, fuelRecords, expenses, loading, notFound, error, reload } = useVehicleDetail(id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))

  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [toArchive, setToArchive] = useState<MaintenanceRecord | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])

  function selectTab(next: Tab) {
    setNotice(null)
    setActionError(null)
    setSearchParams(next === 'maintenance' ? {} : { tab: next }, { replace: true })
  }

  const totals = useMemo(() => summarize(records), [records])
  const history = useMemo(() => sortHistory(records), [records])
  const upcoming = useMemo(
    () => (vehicle ? buildUpcoming(records, vehicle.current_mileage) : []),
    [records, vehicle],
  )
  const timeline = useMemo(
    () => buildHistory({ maintenance: records, fuel: fuelRecords, expenses }),
    [records, fuelRecords, expenses],
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
      </div>

      <div role="tablist" aria-label="Secciones del vehículo" className="-mx-4 flex gap-1 overflow-x-auto border-b border-pine-100 px-4 sm:mx-0 sm:px-0">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={tab === tabId}
            onClick={() => selectTab(tabId)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === tabId ? 'border-emerald-600 text-pine-900' : 'border-transparent text-pine-600 hover:text-pine-900'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {notice && <Alert kind="success">{notice}</Alert>}
      {(error || actionError) && <Alert>{error ?? actionError}</Alert>}

      {tab === 'fuel' ? (
        <FuelSection vehicle={vehicle} records={fuelRecords} onNotice={setNotice} onError={setActionError} reload={reload} />
      ) : tab === 'expenses' ? (
        <ExpenseSection vehicle={vehicle} records={expenses} onNotice={setNotice} onError={setActionError} reload={reload} />
      ) : tab === 'history' ? (
        <VehicleHistorySection entries={timeline} />
      ) : (
        <>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-pine-900">Historial de mantenimiento</h2>
              {history.length > 0 && (
                <button type="button" className="btn-primary" onClick={() => { setNotice(null); setForm({ mode: 'create' }) }}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Registrar mantenimiento
                </button>
              )}
            </div>
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
              existingRecords={records}
              record={form.mode === 'edit' ? form.record : null}
              onSubmit={handleSubmit}
              onClose={closeForm}
            />
          )}

          {toArchive && (
            <ConfirmDialog
              title="¿Archivar este mantenimiento?"
              confirmLabel="Archivar"
              busyLabel="Archivando…"
              busy={archiving}
              onConfirm={confirmArchive}
              onCancel={() => setToArchive(null)}
            >
              <strong>{toArchive.service_type}</strong> del {formatDate(toArchive.service_date)} dejará de contar en el
              historial y en los costos. No se borra de forma definitiva.
            </ConfirmDialog>
          )}
        </>
      )}
    </div>
  )
}
