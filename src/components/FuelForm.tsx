import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import Alert from './Alert'
import { formatKm, formatMoney, todayISO } from '../lib/format'
import {
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  FUEL_UNIT_LABELS,
  type FuelInput,
  type FuelRecord,
  type FuelType,
  type Vehicle,
} from '../types/app'

interface Props {
  vehicle: Vehicle
  existingRecords: FuelRecord[]
  /** Si se pasa un registro, el formulario edita; si no, crea. */
  record?: FuelRecord | null
  onSubmit: (input: FuelInput) => Promise<void>
  onClose: () => void
}

/** Acepta coma o punto decimal. Vacío → NaN. */
const parseDecimal = (text: string) => (text.trim() === '' ? NaN : Number(text.replace(',', '.')))

export default function FuelForm({ vehicle, existingRecords, record, onSubmit, onClose }: Props) {
  const isEdit = Boolean(record)
  // En una carga nueva se propone el combustible de la última carga registrada.
  const lastType = existingRecords[0]?.fuel_type ?? 'gasoline'

  const [fuelDate, setFuelDate] = useState(record?.fuel_date ?? todayISO())
  const [mileage, setMileage] = useState(record ? String(record.mileage) : '')
  const [fuelType, setFuelType] = useState<FuelType>(record?.fuel_type ?? lastType)
  const [quantity, setQuantity] = useState(record ? String(record.liters) : '')
  const [price, setPrice] = useState(record ? String(record.price_per_liter) : '')
  const [station, setStation] = useState(record?.station ?? '')
  const [fullTank, setFullTank] = useState(record?.full_tank ?? true)
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

  const unit = FUEL_UNIT_LABELS[fuelType]
  const mileageNum = mileage === '' ? NaN : Number(mileage)
  const quantityNum = parseDecimal(quantity)
  const priceNum = parseDecimal(price)
  const total = Number.isFinite(quantityNum) && Number.isFinite(priceNum) ? Math.round(quantityNum * priceNum * 100) / 100 : null
  const possibleDuplicate = !isEdit && existingRecords.some((existing) =>
    existing.fuel_date === fuelDate && existing.mileage === mileageNum,
  )

  function validate(): FuelInput | string {
    if (!fuelDate) return 'Indica la fecha de la carga.'
    if (fuelDate > todayISO()) return 'La fecha de la carga no puede estar en el futuro.'
    if (!Number.isInteger(mileageNum) || mileageNum < 0) {
      return 'El kilometraje debe ser un número entero mayor o igual a 0.'
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) return `La cantidad (${unit}) debe ser mayor a 0.`
    if (!Number.isFinite(priceNum) || priceNum < 0) return 'El precio debe ser un número mayor o igual a 0.'

    return {
      fuel_date: fuelDate,
      mileage: mileageNum,
      fuel_type: fuelType,
      liters: Math.round(quantityNum * 1000) / 1000,
      price_per_liter: Math.round(priceNum * 1000) / 1000,
      station: station || null,
      full_tank: fullTank,
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
      await onSubmit(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la carga.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-pine-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fuel-form-title"
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
            <h2 id="fuel-form-title" className="text-xl font-bold text-pine-900">
              {isEdit ? 'Editar carga' : 'Registrar carga de combustible'}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fuel_date" className="field-label">Fecha <span className="text-red-700">(obligatorio)</span></label>
              <input id="fuel_date" ref={firstFieldRef} type="date" className="field-input" value={fuelDate} max={todayISO()} required aria-required="true" onChange={(e) => setFuelDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="f_mileage" className="field-label">Kilometraje <span className="text-red-700">(obligatorio)</span></label>
              <input
                id="f_mileage"
                className="field-input"
                inputMode="numeric"
                value={mileage}
                required
                aria-required="true"
                aria-describedby="f_mileage_hint"
                onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))}
                placeholder={String(vehicle.current_mileage)}
              />
              <p id="f_mileage_hint" className="mt-1 text-xs text-pine-600">
                Lo que marca el odómetro al cargar. Último registrado: {formatKm(vehicle.current_mileage)}.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="fuel_type" className="field-label">Combustible</label>
            <select id="fuel_type" className="field-input" value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>{FUEL_TYPE_LABELS[t]} ({FUEL_UNIT_LABELS[t]})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="quantity" className="field-label">Cantidad ({unit}) <span className="text-red-700">(obligatorio)</span></label>
              <input id="quantity" className="field-input" inputMode="decimal" value={quantity} required aria-required="true" onChange={(e) => setQuantity(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.000" />
            </div>
            <div>
              <label htmlFor="price" className="field-label">Precio por {unit} (S/) <span className="text-red-700">(obligatorio)</span></label>
              <input id="price" className="field-input" inputMode="decimal" value={price} required aria-required="true" onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.000" />
            </div>
            <div>
              <p className="field-label">Total</p>
              <p className="flex h-[42px] items-center text-lg font-extrabold text-pine-900" aria-live="polite">
                {total !== null ? formatMoney(total) : '—'}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl bg-pine-50 px-3.5 py-3 text-sm text-pine-800">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-pine-200 text-emerald-600 focus:ring-emerald-500"
              checked={fullTank}
              onChange={(e) => setFullTank(e.target.checked)}
            />
            <span>
              <strong>Llené el tanque.</strong> El consumo se calcula entre dos cargas de tanque lleno; las cargas
              parciales intermedias también se suman.
            </span>
          </label>

          {possibleDuplicate && (
            <Alert kind="warning">
              Ya hay una carga con la misma fecha y kilometraje. Verifica que no sea un registro duplicado.
            </Alert>
          )}

          <div>
            <label htmlFor="station" className="field-label">Grifo / estación <span className="font-normal text-pine-600">(opcional)</span></label>
            <input id="station" className="field-input" value={station} onChange={(e) => setStation(e.target.value)} placeholder="Ej. Primax Av. Arequipa" maxLength={100} />
          </div>

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar carga'}
          </button>
        </div>
      </form>
    </div>
  )
}
