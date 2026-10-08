import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import Alert from './Alert'
import { todayISO, formatKm } from '../lib/format'
import { SERVICE_TYPE_SUGGESTIONS, type MaintenanceInput, type MaintenanceRecord, type Vehicle } from '../types/app'

interface Props {
  vehicle: Vehicle
  existingRecords: MaintenanceRecord[]
  /** Si se pasa un registro, el formulario edita; si no, crea. */
  record?: MaintenanceRecord | null
  /** updateVehicleMileage: el usuario aceptó actualizar el kilometraje del vehículo. */
  onSubmit: (input: MaintenanceInput, updateVehicleMileage: boolean) => Promise<void>
  onClose: () => void
}

const toText = (n: number | null | undefined) => (n == null ? '' : String(n))

export default function MaintenanceForm({ vehicle, existingRecords, record, onSubmit, onClose }: Props) {
  const isEdit = Boolean(record)
  const [serviceType, setServiceType] = useState(record?.service_type ?? '')
  const [serviceDate, setServiceDate] = useState(record?.service_date ?? todayISO())
  const [mileage, setMileage] = useState(record ? String(record.mileage) : String(vehicle.current_mileage))
  const [cost, setCost] = useState(record ? String(record.cost) : '')
  const [workshop, setWorkshop] = useState(record?.workshop ?? '')
  const [description, setDescription] = useState(record?.description ?? '')
  const [nextMileage, setNextMileage] = useState(toText(record?.next_mileage))
  const [nextDate, setNextDate] = useState(record?.next_date ?? '')
  const [updateVehicleMileage, setUpdateVehicleMileage] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const mileageNum = mileage === '' ? NaN : Number(mileage)
  const offerMileageUpdate = Number.isInteger(mileageNum) && mileageNum > vehicle.current_mileage
  const possibleDuplicate = !isEdit && existingRecords.some((existing) =>
    existing.service_type.trim().toLocaleLowerCase() === serviceType.trim().toLocaleLowerCase()
    && existing.service_date === serviceDate
    && existing.mileage === mileageNum,
  )

  function validate(): MaintenanceInput | string {
    if (!serviceType.trim()) return 'Indica el tipo de servicio.'
    if (!serviceDate) return 'Indica la fecha del servicio.'
    if (serviceDate > todayISO()) return 'La fecha del servicio no puede estar en el futuro.'
    if (!Number.isInteger(mileageNum) || mileageNum < 0) {
      return 'El kilometraje del servicio debe ser un número entero mayor o igual a 0.'
    }

    const costNum = cost.trim() === '' ? 0 : Number(cost.replace(',', '.'))
    if (!Number.isFinite(costNum) || costNum < 0) return 'El costo debe ser un número mayor o igual a 0.'

    let nextMileageNum: number | null = null
    if (nextMileage !== '') {
      nextMileageNum = Number(nextMileage)
      if (!Number.isInteger(nextMileageNum) || nextMileageNum < mileageNum) {
        return 'El próximo kilometraje no puede ser menor al kilometraje de este servicio.'
      }
    }
    if (nextDate && nextDate < serviceDate) {
      return 'La fecha del próximo mantenimiento no puede ser anterior a la fecha del servicio.'
    }

    return {
      service_type: serviceType,
      description: description || null,
      service_date: serviceDate,
      mileage: mileageNum,
      cost: Math.round(costNum * 100) / 100,
      workshop: workshop || null,
      next_mileage: nextMileageNum,
      next_date: nextDate || null,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const result = validate()
    if (typeof result === 'string') {
      setError(result)
      return
    }
    setSaving(true)
    try {
      await onSubmit(result, offerMileageUpdate && updateVehicleMileage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el mantenimiento.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-pine-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-xl sm:rounded-3xl"
        noValidate
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="maintenance-form-title" className="text-xl font-bold text-pine-900">
              {isEdit ? 'Editar mantenimiento' : 'Registrar mantenimiento'}
            </h2>
            <p className="mt-0.5 text-sm text-pine-600">
              {vehicle.brand} {vehicle.model} · {vehicle.license_plate}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 text-pine-600 hover:bg-pine-50" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="service_type" className="field-label">Tipo de servicio <span className="text-red-700">(obligatorio)</span></label>
            <input
              id="service_type"
              ref={firstFieldRef}
              required
              aria-required="true"
              list="service-type-options"
              className="field-input"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="Ej. Cambio de aceite"
              maxLength={80}
              autoComplete="off"
            />
            <datalist id="service-type-options">
              {SERVICE_TYPE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="service_date" className="field-label">Fecha <span className="text-red-700">(obligatorio)</span></label>
              <input id="service_date" type="date" className="field-input" value={serviceDate} max={todayISO()} required aria-required="true" onChange={(e) => setServiceDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="m_mileage" className="field-label">Kilometraje <span className="text-red-700">(obligatorio)</span></label>
              <input id="m_mileage" className="field-input" inputMode="numeric" value={mileage} required aria-required="true" onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div>
              <label htmlFor="cost" className="field-label">Costo (S/) <span className="font-normal text-pine-600">(opcional; vacío = S/ 0)</span></label>
              <input id="cost" className="field-input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" />
            </div>
          </div>

          {possibleDuplicate && (
            <Alert kind="warning">
              Ya hay un mantenimiento del mismo tipo, fecha y kilometraje. Verifica que no sea un registro duplicado.
            </Alert>
          )}

          {offerMileageUpdate && (
            <label className="flex items-start gap-2.5 rounded-xl bg-pine-50 px-3.5 py-3 text-sm text-pine-800">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-pine-200 text-emerald-600 focus:ring-emerald-500"
                checked={updateVehicleMileage}
                onChange={(e) => setUpdateVehicleMileage(e.target.checked)}
              />
              <span>
                Actualizar el kilometraje del vehículo a <strong>{formatKm(mileageNum)}</strong> (hoy figura{' '}
                {formatKm(vehicle.current_mileage)}).
              </span>
            </label>
          )}

          <div>
            <label htmlFor="workshop" className="field-label">Taller <span className="font-normal text-pine-600">(opcional)</span></label>
            <input id="workshop" className="field-input" value={workshop} onChange={(e) => setWorkshop(e.target.value)} placeholder="Ej. Taller Los Andes" maxLength={100} />
          </div>

          <div>
            <label htmlFor="description" className="field-label">Detalle <span className="font-normal text-pine-600">(opcional)</span></label>
            <textarea id="description" rows={2} className="field-input resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Aceite 5W-30 sintético, 4 litros" maxLength={500} />
          </div>

          <fieldset className="rounded-2xl border border-pine-100 p-4">
            <legend className="px-1.5 text-sm font-bold text-pine-800">Próximo mantenimiento <span className="font-normal text-pine-600">(opcional)</span></legend>
            <p className="mb-3 text-xs text-pine-600">Indica cuándo debería repetirse este servicio. Se avisará por lo que ocurra primero.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="next_mileage" className="field-label">A los (km)</label>
                <input id="next_mileage" className="field-input" inputMode="numeric" value={nextMileage} onChange={(e) => setNextMileage(e.target.value.replace(/\D/g, ''))} placeholder="Ej. 232000" />
              </div>
              <div>
                <label htmlFor="next_date" className="field-label">O en la fecha</label>
                <input id="next_date" type="date" className="field-input" value={nextDate} min={serviceDate || undefined} onChange={(e) => setNextDate(e.target.value)} />
              </div>
            </div>
          </fieldset>

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar mantenimiento'}
          </button>
        </div>
      </form>
    </div>
  )
}
