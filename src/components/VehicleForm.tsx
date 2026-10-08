import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import Alert from './Alert'
import { VEHICLE_TYPES, VEHICLE_TYPE_LABELS, type Vehicle, type VehicleInput, type VehicleType } from '../types/app'

interface Props {
  /** Si se pasa un vehículo, el formulario edita; si no, crea. */
  vehicle?: Vehicle | null
  onSubmit: (input: VehicleInput) => Promise<void>
  onClose: () => void
}

const currentYear = new Date().getFullYear()

export default function VehicleForm({ vehicle, onSubmit, onClose }: Props) {
  const isEdit = Boolean(vehicle)
  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [year, setYear] = useState(vehicle ? String(vehicle.year) : '')
  const [plate, setPlate] = useState(vehicle?.license_plate ?? '')
  const [type, setType] = useState<VehicleType>(vehicle?.vehicle_type ?? 'car')
  const [mileage, setMileage] = useState(vehicle ? String(vehicle.current_mileage) : '')
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

  function validate(): VehicleInput | string {
    if (!brand.trim()) return 'La marca es obligatoria.'
    if (!model.trim()) return 'El modelo es obligatorio.'
    const yearNum = Number(year)
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      return `El año debe estar entre 1900 y ${currentYear + 1}.`
    }
    if (!plate.trim()) return 'La placa es obligatoria.'
    const mileageNum = Number(mileage === '' ? 0 : mileage)
    if (!Number.isInteger(mileageNum) || mileageNum < 0) {
      return 'El kilometraje debe ser un número entero mayor o igual a 0.'
    }
    return {
      brand,
      model,
      year: yearNum,
      license_plate: plate,
      vehicle_type: type,
      current_mileage: mileageNum,
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el vehículo.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-pine-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-form-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-3xl"
        noValidate
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="vehicle-form-title" className="text-xl font-bold text-pine-900">
            {isEdit ? 'Editar vehículo' : 'Registrar vehículo'}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 text-pine-600 hover:bg-pine-50" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="brand" className="field-label">Marca</label>
              <input id="brand" ref={firstFieldRef} className="field-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej. Toyota" maxLength={60} />
            </div>
            <div>
              <label htmlFor="model" className="field-label">Modelo</label>
              <input id="model" className="field-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej. Camry" maxLength={60} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="year" className="field-label">Año</label>
              <input id="year" className="field-input" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ej. 2026" />
            </div>
            <div>
              <label htmlFor="plate" className="field-label">Placa</label>
              <input id="plate" className="field-input uppercase" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Ej. ABC-123" maxLength={12} autoCapitalize="characters" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="field-label">Tipo</label>
              <select id="type" className="field-input" value={type} onChange={(e) => setType(e.target.value as VehicleType)}>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mileage" className="field-label">Kilometraje actual</label>
              <input id="mileage" className="field-input" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))} placeholder="Ej. 227000" />
            </div>
          </div>

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar vehículo'}
          </button>
        </div>
      </form>
    </div>
  )
}
