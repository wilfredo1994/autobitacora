import { useCallback, useMemo, useState } from 'react'
import { Fuel, Plus } from 'lucide-react'
import { archiveFuel, createFuel, updateFuel } from '../services/fuel'
import { buildEfficiency, buildSegments, efficiencyByRecord, fuelCostPerKm, sortFuelHistory, summarizeFuel } from '../lib/fuel'
import { formatDate, formatDecimal, formatKm, formatMoney, formatUnitPrice } from '../lib/format'
import { FUEL_TYPE_LABELS, FUEL_UNIT_LABELS, type FuelInput, type FuelRecord, type Vehicle } from '../types/app'
import FuelForm from './FuelForm'
import FuelList from './FuelList'
import ConfirmDialog from './ConfirmDialog'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; record: FuelRecord }

interface Props {
  vehicle: Vehicle
  records: FuelRecord[]
  onNotice: (message: string | null) => void
  onError: (message: string | null) => void
  reload: () => Promise<void>
}

export default function FuelSection({ vehicle, records, onNotice, onError, reload }: Props) {
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [toArchive, setToArchive] = useState<FuelRecord | null>(null)
  const [archiving, setArchiving] = useState(false)

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])

  const history = useMemo(() => sortFuelHistory(records), [records])
  const totals = useMemo(() => summarizeFuel(records), [records])
  const segments = useMemo(() => buildSegments(records), [records])
  const efficiency = useMemo(() => buildEfficiency(segments), [segments])
  const perRecord = useMemo(() => efficiencyByRecord(segments), [segments])
  const costPerKm = useMemo(() => fuelCostPerKm(records), [records])

  async function handleSubmit(input: FuelInput) {
    if (form.mode === 'edit') {
      await updateFuel(form.record.id, input)
      onNotice('Carga actualizada.')
    } else {
      await createFuel(vehicle.id, input)
      onNotice('Carga registrada.')
    }
    onError(null)
    closeForm()
    // Recarga también el vehículo: la BD sube su kilometraje si la carga es más reciente.
    await reload()
  }

  async function confirmArchive() {
    if (!toArchive) return
    setArchiving(true)
    onError(null)
    try {
      await archiveFuel(toArchive.id)
      onNotice(`La carga del ${formatDate(toArchive.fuel_date)} fue archivada.`)
      setToArchive(null)
      await reload()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo archivar la carga.')
      setToArchive(null)
    } finally {
      setArchiving(false)
    }
  }

  const mainEfficiency = efficiency[0]

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Costos de combustible">
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Total en combustible</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.total)}</p>
          <p className="mt-1 text-xs text-pine-600">
            Este año: {formatMoney(totals.thisYear)} · Este mes: {formatMoney(totals.thisMonth)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Consumo promedio</p>
          {mainEfficiency ? (
            <>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">
                {formatDecimal(mainEfficiency.average)} km/{FUEL_UNIT_LABELS[mainEfficiency.fuelType]}
              </p>
              <p className="mt-1 text-xs text-pine-600">
                {efficiency.length > 1 && `${FUEL_TYPE_LABELS[mainEfficiency.fuelType]} · `}
                Último tramo: {formatDecimal(mainEfficiency.last)} km/{FUEL_UNIT_LABELS[mainEfficiency.fuelType]}
              </p>
              {efficiency.slice(1).map((e) => (
                <p key={e.fuelType} className="mt-0.5 text-xs text-pine-600">
                  {FUEL_TYPE_LABELS[e.fuelType]}: {formatDecimal(e.average)} km/{FUEL_UNIT_LABELS[e.fuelType]}
                </p>
              ))}
            </>
          ) : (
            <p className="mt-2 text-sm text-pine-600">Necesitas dos cargas de tanque lleno para calcularlo.</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Costo por km</p>
          {costPerKm ? (
            <>
              <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatUnitPrice(costPerKm.value)}</p>
              <p className="mt-1 text-xs text-pine-600">Solo combustible, en {formatKm(costPerKm.distance)} medidos</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-pine-600">Necesitas dos cargas de tanque lleno para calcularlo.</p>
          )}
        </div>
      </section>

      <section className="space-y-3" aria-label="Historial de combustible">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-pine-900">Historial de combustible</h2>
          {history.length > 0 && (
            <button type="button" className="btn-primary" onClick={() => { onNotice(null); setForm({ mode: 'create' }) }}>
              <Plus className="h-4 w-4" aria-hidden />
              Registrar carga
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
              <Fuel className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-semibold text-pine-900">Todavía no registraste cargas de combustible</p>
            <p className="mt-1 max-w-sm text-sm text-pine-600">
              Llena el tanque y anota el kilometraje. Desde la segunda carga de tanque lleno verás tu consumo y costo por km.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => setForm({ mode: 'create' })}>
              <Plus className="h-4 w-4" aria-hidden />
              Registrar la primera
            </button>
          </div>
        ) : (
          <FuelList
            records={history}
            efficiency={perRecord}
            onEdit={(record) => { onNotice(null); setForm({ mode: 'edit', record }) }}
            onArchive={setToArchive}
          />
        )}
      </section>

      {form.mode !== 'closed' && (
        <FuelForm
          key={form.mode === 'edit' ? form.record.id : 'new'}
          vehicle={vehicle}
          existingRecords={history}
          record={form.mode === 'edit' ? form.record : null}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {toArchive && (
        <ConfirmDialog
          title="¿Archivar esta carga?"
          confirmLabel="Archivar"
          busyLabel="Archivando…"
          busy={archiving}
          onConfirm={confirmArchive}
          onCancel={() => setToArchive(null)}
        >
          La carga del {formatDate(toArchive.fuel_date)} ({formatMoney(Number(toArchive.total_amount))},{' '}
          {formatUnitPrice(Number(toArchive.price_per_liter))}/{FUEL_UNIT_LABELS[toArchive.fuel_type]}) dejará de contar en el
          historial, el consumo y los costos. No se borra de forma definitiva.
        </ConfirmDialog>
      )}
    </>
  )
}
