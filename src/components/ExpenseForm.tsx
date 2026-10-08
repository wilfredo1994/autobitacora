import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import Alert from './Alert'
import { formatKm, todayISO } from '../lib/format'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseInput, type Vehicle } from '../types/app'

interface Props {
  vehicle: Vehicle
  existingRecords: Expense[]
  /** Si se pasa un registro, el formulario edita; si no, crea. */
  record?: Expense | null
  onSubmit: (input: ExpenseInput) => Promise<void>
  onClose: () => void
}

export default function ExpenseForm({ vehicle, existingRecords, record, onSubmit, onClose }: Props) {
  const isEdit = Boolean(record)
  // Un gasto creado fuera de la app puede tener una categoría que no está en la lista: se conserva.
  const categories = record && !EXPENSE_CATEGORIES.includes(record.category)
    ? [record.category, ...EXPENSE_CATEGORIES]
    : EXPENSE_CATEGORIES

  const [expenseDate, setExpenseDate] = useState(record?.expense_date ?? todayISO())
  const [category, setCategory] = useState(record?.category ?? '')
  const [amount, setAmount] = useState(record ? String(record.amount) : '')
  const [mileage, setMileage] = useState(record?.mileage != null ? String(record.mileage) : '')
  const [description, setDescription] = useState(record?.description ?? '')
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

  const amountNum = amount.trim() === '' ? NaN : Number(amount.replace(',', '.'))
  const possibleDuplicate = !isEdit && existingRecords.some((existing) =>
    existing.category === category && existing.expense_date === expenseDate && Number(existing.amount) === amountNum,
  )

  function validate(): ExpenseInput | string {
    if (!expenseDate) return 'Indica la fecha del gasto.'
    if (expenseDate > todayISO()) return 'La fecha del gasto no puede estar en el futuro.'
    if (!category) return 'Elige una categoría.'
    const roundedAmount = Math.round(amountNum * 100) / 100
    if (!Number.isFinite(amountNum) || roundedAmount <= 0) return 'El monto debe ser de al menos S/ 0.01.'

    let mileageNum: number | null = null
    if (mileage !== '') {
      mileageNum = Number(mileage)
      if (!Number.isInteger(mileageNum) || mileageNum < 0) {
        return 'El kilometraje debe ser un número entero mayor o igual a 0.'
      }
    }

    return {
      expense_date: expenseDate,
      category,
      description: description || null,
      amount: roundedAmount,
      mileage: mileageNum,
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-pine-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-title"
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
            <h2 id="expense-form-title" className="text-xl font-bold text-pine-900">
              {isEdit ? 'Editar gasto' : 'Registrar gasto'}
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
              <label htmlFor="expense_date" className="field-label">Fecha <span className="text-red-700">(obligatorio)</span></label>
              <input id="expense_date" ref={firstFieldRef} type="date" className="field-input" value={expenseDate} max={todayISO()} required aria-required="true" onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="category" className="field-label">Categoría <span className="text-red-700">(obligatorio)</span></label>
              <select id="category" className="field-input" value={category} required aria-required="true" onChange={(e) => setCategory(e.target.value)}>
                <option value="" disabled>Elige una categoría</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="field-label">Monto (S/) <span className="text-red-700">(obligatorio)</span></label>
              <input id="amount" className="field-input" inputMode="decimal" value={amount} required aria-required="true" onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="e_mileage" className="field-label">Kilometraje <span className="font-normal text-pine-600">(opcional)</span></label>
              <input
                id="e_mileage"
                className="field-input"
                inputMode="numeric"
                value={mileage}
                aria-describedby="e_mileage_hint"
                onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))}
                placeholder={String(vehicle.current_mileage)}
              />
              <p id="e_mileage_hint" className="mt-1 text-xs text-pine-600">
                Solo como referencia; no cambia el kilometraje del vehículo ({formatKm(vehicle.current_mileage)}).
              </p>
            </div>
          </div>

          {possibleDuplicate && (
            <Alert kind="warning">
              Ya hay un gasto de la misma categoría, fecha y monto. Verifica que no sea un registro duplicado.
            </Alert>
          )}

          <div>
            <label htmlFor="e_description" className="field-label">Detalle <span className="font-normal text-pine-600">(opcional)</span></label>
            <textarea id="e_description" rows={2} className="field-input resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Renovación anual, póliza 12345" maxLength={500} />
          </div>

          {error && <Alert>{error}</Alert>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </form>
    </div>
  )
}
