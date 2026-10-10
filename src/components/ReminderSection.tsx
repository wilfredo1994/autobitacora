import { useCallback, useMemo, useState } from 'react'
import { Archive, Bell, Plus, RotateCcw } from 'lucide-react'
import { archiveReminder, createReminder, setReminderStatus, updateReminder } from '../services/reminders'
import { buildPendingReminders, sortClosedReminders } from '../lib/reminders'
import { formatDate, formatKm, formatTimestampDate } from '../lib/format'
import { REMINDER_STATUS_LABELS, type Reminder, type ReminderInput, type ReminderStatus, type Vehicle } from '../types/app'
import ReminderForm from './ReminderForm'
import ReminderList from './ReminderList'
import ConfirmDialog from './ConfirmDialog'
import PremiumNotice from './PremiumNotice'
import { usePlan } from '../plan/PlanProvider'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; reminder: Reminder }

interface Props {
  vehicle: Vehicle
  reminders: Reminder[]
  onNotice: (message: string | null) => void
  onError: (message: string | null) => void
  reload: () => Promise<void>
  /** El plan no permite editar este vehículo: sin altas ni cambios de estado. */
  readOnly: boolean
}

const STATUS_NOTICES: Record<ReminderStatus, string> = {
  completed: 'marcado como completado',
  dismissed: 'descartado',
  pending: 'reabierto',
}

export default function ReminderSection({ vehicle, reminders, onNotice, onError, reload, readOnly }: Props) {
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toArchive, setToArchive] = useState<Reminder | null>(null)
  const [archiving, setArchiving] = useState(false)

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])
  const { plan, isPremium, reload: reloadPlan } = usePlan()
  // El límite es por usuario (todos sus vehículos), no por vehículo.
  const limit = plan.reminder_limit
  const atLimit = limit !== null && plan.pending_reminders >= limit
  const canCreate = !readOnly && !atLimit

  /** Recarga los recordatorios del vehículo y el uso del plan (contador "2 de 3"). */
  async function reloadAll() {
    await Promise.all([reload(), reloadPlan()])
  }

  const pending = useMemo(() => buildPendingReminders(reminders, [vehicle]), [reminders, vehicle])
  const closed = useMemo(() => sortClosedReminders(reminders), [reminders])

  async function handleSubmit(input: ReminderInput) {
    if (form.mode === 'edit') {
      await updateReminder(form.reminder.id, input)
      onNotice('Recordatorio actualizado.')
    } else {
      await createReminder(vehicle.id, input)
      onNotice('Recordatorio creado.')
    }
    onError(null)
    closeForm()
    await reloadAll()
  }

  async function changeStatus(reminder: Reminder, status: ReminderStatus) {
    setBusyId(reminder.id)
    onError(null)
    try {
      await setReminderStatus(reminder.id, status)
      onNotice(`“${reminder.title}” fue ${STATUS_NOTICES[status]}.`)
      await reloadAll()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo actualizar el recordatorio.')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmArchive() {
    if (!toArchive) return
    setArchiving(true)
    onError(null)
    try {
      await archiveReminder(toArchive.id)
      onNotice(`“${toArchive.title}” fue archivado.`)
      setToArchive(null)
      await reloadAll()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo archivar el recordatorio.')
      setToArchive(null)
    } finally {
      setArchiving(false)
    }
  }

  const overdueCount = pending.filter((i) => i.status === 'overdue').length

  return (
    <>
      <section className="space-y-3" aria-label="Recordatorios pendientes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-pine-900">Recordatorios pendientes</h2>
            {limit !== null ? (
              <p className="text-sm text-pine-600">
                {plan.pending_reminders} de {limit} pendientes en tu plan Free
                {overdueCount > 0 && <> · <span className="font-semibold text-red-700">{overdueCount} {overdueCount === 1 ? 'vencido' : 'vencidos'}</span></>}
              </p>
            ) : pending.length > 0 && (
              <p className="text-sm text-pine-600">
                {pending.length} {pending.length === 1 ? 'pendiente' : 'pendientes'}
                {overdueCount > 0 && <> · <span className="font-semibold text-red-700">{overdueCount} {overdueCount === 1 ? 'vencido' : 'vencidos'}</span></>}
              </p>
            )}
          </div>
          {reminders.length > 0 && canCreate && (
            <button type="button" className="btn-primary" onClick={() => { onNotice(null); setForm({ mode: 'create' }) }}>
              <Plus className="h-4 w-4" aria-hidden />
              Nuevo recordatorio
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
              <Bell className="h-6 w-6" aria-hidden />
            </div>
            <p className="font-semibold text-pine-900">Todavía no tienes recordatorios</p>
            <p className="mt-1 max-w-sm text-sm text-pine-600">
              SOAT, revisión técnica, impuesto, seguro… Indica la fecha o el kilometraje y te avisaremos cuando se acerque.
            </p>
            {canCreate && (
              <button type="button" className="btn-primary mt-5" onClick={() => setForm({ mode: 'create' })}>
                <Plus className="h-4 w-4" aria-hidden />
                Crear el primero
              </button>
            )}
          </div>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
            No tienes recordatorios pendientes para este vehículo.
          </p>
        ) : (
          <ReminderList
            items={pending}
            busyId={busyId}
            onComplete={readOnly ? undefined : (r) => void changeStatus(r, 'completed')}
            onDismiss={readOnly ? undefined : (r) => void changeStatus(r, 'dismissed')}
            onEdit={readOnly ? undefined : (reminder) => { onNotice(null); setForm({ mode: 'edit', reminder }) }}
          />
        )}

        {atLimit && !readOnly && !isPremium && (
          <PremiumNotice title={`Tienes ${plan.pending_reminders} de ${limit} recordatorios pendientes`}>
            Completa o descarta uno para crear otro, o pásate a Premium para tener recordatorios ilimitados.
          </PremiumNotice>
        )}
      </section>

      {closed.length > 0 && (
        <details className="group space-y-3">
          <summary className="cursor-pointer select-none text-sm font-bold text-pine-700 hover:text-pine-900">
            Completados y descartados ({closed.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {closed.map((r) => (
              <li key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-pine-900">
                    {r.title}
                    <span className="ml-2 rounded-md bg-pine-50 px-1.5 py-0.5 align-middle text-xs font-semibold text-pine-700">
                      {REMINDER_STATUS_LABELS[r.status]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-pine-600">
                    {[
                      r.due_date && `Vencía ${formatDate(r.due_date)}`,
                      r.due_mileage != null && `a los ${formatKm(r.due_mileage)}`,
                      r.completed_at && `completado el ${formatTimestampDate(r.completed_at)}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className={`flex gap-2 sm:shrink-0 ${readOnly ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                    disabled={busyId === r.id || atLimit}
                    title={atLimit ? 'Llegaste al límite de recordatorios pendientes de tu plan' : undefined}
                    onClick={() => void changeStatus(r, 'pending')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Reabrir
                  </button>
                  <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === r.id} onClick={() => setToArchive(r)}>
                    <Archive className="h-3.5 w-3.5" aria-hidden />
                    Archivar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {form.mode !== 'closed' && (
        <ReminderForm
          key={form.mode === 'edit' ? form.reminder.id : 'new'}
          vehicle={vehicle}
          reminder={form.mode === 'edit' ? form.reminder : null}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {toArchive && (
        <ConfirmDialog
          title="¿Archivar este recordatorio?"
          confirmLabel="Archivar"
          busyLabel="Archivando…"
          busy={archiving}
          onConfirm={confirmArchive}
          onCancel={() => setToArchive(null)}
        >
          <strong>{toArchive.title}</strong> dejará de aparecer en la lista. No se borra de forma definitiva.
        </ConfirmDialog>
      )}
    </>
  )
}
