import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmación de una acción destructiva (por ejemplo, archivar un registro). */
export default function ConfirmDialog({ title, children, confirmLabel, busyLabel, busy, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-pine-900/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-pine-900">{title}</h2>
        <p className="mt-2 text-sm text-pine-600">{children}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn-danger" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
