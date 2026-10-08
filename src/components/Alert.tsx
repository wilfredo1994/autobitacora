import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export default function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'warning'; children: ReactNode }) {
  const Icon = kind === 'error' ? AlertCircle : kind === 'warning' ? TriangleAlert : CheckCircle2
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : kind === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-emerald-200 bg-emerald-50 text-pine-800'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
