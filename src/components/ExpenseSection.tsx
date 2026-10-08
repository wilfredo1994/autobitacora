import { useCallback, useMemo, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { archiveExpense, createExpense, updateExpense } from '../services/expenses'
import { sortExpenseHistory, summarizeExpenses } from '../lib/expenses'
import { formatDate, formatMoney } from '../lib/format'
import type { Expense, ExpenseInput, Vehicle } from '../types/app'
import ExpenseForm from './ExpenseForm'
import ExpenseList from './ExpenseList'
import ConfirmDialog from './ConfirmDialog'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; record: Expense }

interface Props {
  vehicle: Vehicle
  records: Expense[]
  onNotice: (message: string | null) => void
  onError: (message: string | null) => void
  reload: () => Promise<void>
}

export default function ExpenseSection({ vehicle, records, onNotice, onError, reload }: Props) {
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [toArchive, setToArchive] = useState<Expense | null>(null)
  const [archiving, setArchiving] = useState(false)

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])

  const history = useMemo(() => sortExpenseHistory(records), [records])
  const totals = useMemo(() => summarizeExpenses(records), [records])

  async function handleSubmit(input: ExpenseInput) {
    if (form.mode === 'edit') {
      await updateExpense(form.record.id, input)
      onNotice('Gasto actualizado.')
    } else {
      await createExpense(vehicle.id, input)
      onNotice('Gasto registrado.')
    }
    onError(null)
    closeForm()
    await reload()
  }

  async function confirmArchive() {
    if (!toArchive) return
    setArchiving(true)
    onError(null)
    try {
      await archiveExpense(toArchive.id)
      onNotice(`“${toArchive.category}” del ${formatDate(toArchive.expense_date)} fue archivado.`)
      setToArchive(null)
      await reload()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo archivar el gasto.')
      setToArchive(null)
    } finally {
      setArchiving(false)
    }
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Costos de otros gastos">
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Total en otros gastos</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.total)}</p>
          <p className="mt-1 text-xs text-pine-600">{totals.count} {totals.count === 1 ? 'gasto' : 'gastos'} registrados</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Este año</p>
          <p className="mt-2 text-2xl font-extrabold text-pine-900">{formatMoney(totals.thisYear)}</p>
          <p className="mt-1 text-xs text-pine-600">Este mes: {formatMoney(totals.thisMonth)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-pine-600">Categoría principal</p>
          {totals.topCategory ? (
            <>
              <p className="mt-2 truncate text-lg font-extrabold text-pine-900">{totals.topCategory.category}</p>
              <p className="mt-1 text-xs text-pine-600">{formatMoney(totals.topCategory.amount)} acumulados</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-pine-600">Aún sin registros</p>
          )}
        </div>
      </section>

      <section className="space-y-3" aria-label="Historial de otros gastos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-pine-900">Otros gastos</h2>
          {history.length > 0 && (
            <button type="button" className="btn-primary" onClick={() => { onNotice(null); setForm({ mode: 'create' }) }}>
              <Plus className="h-4 w-4" aria-hidden />
              Registrar gasto
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
              <Receipt className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-semibold text-pine-900">Todavía no registraste otros gastos</p>
            <p className="mt-1 max-w-sm text-sm text-pine-600">
              SOAT, seguro, impuesto vehicular, peajes, estacionamiento… Anótalos para conocer el costo real de tu vehículo.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => setForm({ mode: 'create' })}>
              <Plus className="h-4 w-4" aria-hidden />
              Registrar el primero
            </button>
          </div>
        ) : (
          <ExpenseList
            records={history}
            onEdit={(record) => { onNotice(null); setForm({ mode: 'edit', record }) }}
            onArchive={setToArchive}
          />
        )}
      </section>

      {form.mode !== 'closed' && (
        <ExpenseForm
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
          title="¿Archivar este gasto?"
          confirmLabel="Archivar"
          busyLabel="Archivando…"
          busy={archiving}
          onConfirm={confirmArchive}
          onCancel={() => setToArchive(null)}
        >
          <strong>{toArchive.category}</strong> del {formatDate(toArchive.expense_date)} ({formatMoney(Number(toArchive.amount))})
          dejará de contar en el historial y en los costos. No se borra de forma definitiva.
        </ConfirmDialog>
      )}
    </>
  )
}
