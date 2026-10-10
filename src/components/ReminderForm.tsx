import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import Alert from './Alert'
import { computeDue } from '../lib/due'
import { formatKm, todayISO } from '../lib/format'
import { REMINDER_SUGGESTIONS, type Reminder, type ReminderInput, type Vehicle } from '../types/app'

interface Props {
  vehicle: Vehicle
  /** Si se pasa un recordatorio, el formulario edita; si no, crea. */
  reminder?: Reminder | null
  onSubmit: (input: ReminderInput) => Promise<void>
  onClose: () => void
}

export default function ReminderForm({ vehicle, reminder, onSubmit, onClose }: Props) {
  const isEdit = Boolean(reminder)
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [dueDate, setDueDate] = useState(reminder?.due_date ?? '')
  const [dueMileage, setDueMileage] = useState(reminder?.due_mileage != null ? String(reminder.due_mileage) : '')
  const [description, setDescription] = useState(reminder?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const dueMileageNum = dueMileage === '' ? null : Number(dueMileage)
  const hasDue = Boolean(dueDate) || dueMileageNum !== null
  // Aviso (no bloquea): un recordatorio que nace vencido suele ser un error de tipeo.
  const alreadyOverdue = hasDue && computeDue(dueDate || null, dueMileageNum, vehicle.current_mileage).status === 'overdue'

  function validate(): ReminderInput | string {
    if (!title.trim()) return 'Indica qué hay que recordar.'
    if (!hasDue) return 'Indica una fecha, un kilometraje o ambos.'
    if (dueMileageNum !== null && (!Number.isInteger(dueMileageNum) || dueMileageNum < 0)) {
      return 'El kilometraje debe ser un número entero mayor o igual a 0.'
    }
    return {
      title,
      description: description || null,
      due_date: dueDate || null,
      due_mileage: dueMileageNum,
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recordatorio.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-pine-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-form-title"
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
            <h2 id="reminder-form-title" className="text-xl font-bold text-pine-900">
              {isEdit ? 'Editar recordatorio' : 'Nuevo recordatorio'}
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
            <label htmlFor="reminder_title" className="field-label">¿Qué hay que recordar? <span className="text-red-700">(obligatorio)</span></label>
            <input
              id="reminder_title"
              ref={firstFieldRef}
              required
              aria-required="true"
              list="reminder-title-options"
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Renovar SOAT"
              maxLength={80}
              autoComplete="off"
            />
            <datalist id="reminder-title-options">
              {REMINDER_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <fieldset className="rounded-2xl border border-pine-100 p-4">
            <legend className="px-1.5 text-sm font-bold text-pine-800">Vence <span className="font-normal text-red-700">(fecha, km o ambos)</span></legend>
            <p className="mb-3 text-xs text-pine-600">Si indicas ambos, se avisará por lo que ocurra primero.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="due_date" className="field-label">En la fecha</label>
                <input id="due_date" type="date" className="field-input" value={dueDate} min={isEdit ? undefined : todayISO()} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="due_mileage" className="field-label">A los (km)</label>
                <input
                  id="due_mileage"
                  className="field-input"
                  inputMode="numeric"
                  value={dueMileage}
                  aria-describedby="due_mileage_hint"
                  onChange={(e) => setDueMileage(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Ej. ${vehicle.current_mileage + 5000}`}
                />
                <p id="due_mileage_hint" className="mt-1 text-xs text-pine-600">Kilometraje actual: {formatKm(vehicle.current_mileage)}.</p>
              </div>
            </div>
          </fieldset>

          {alreadyOverdue && (
            <Alert kind="warning">
              Con estos datos el recordatorio ya estaría vencido. Revisa la fecha y el kilometraje.
            </Alert>
          )}

          <div>
            <label htmlFor="reminder_description" className="field-label">Detalle <span className="font-normal text-pine-600">(opcional)</span></label>
            <textarea id="reminder_description" rows={2} className="field-input resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Cotizar con dos aseguradoras antes de renovar" maxLength={500} />
          </div>

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear recordatorio'}
          </button>
        </div>
      </form>
    </div>
  )
}
