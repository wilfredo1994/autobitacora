import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { formatDate } from '../lib/format'

/** Aviso de una función o límite de Premium, con enlace a "Mi plan". */
export default function PremiumNotice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-pine-100 bg-pine-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-900 text-emerald-300">
          <Crown className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-sm">
          <p className="font-bold text-pine-900">{title}</p>
          {children && <p className="mt-0.5 text-pine-700">{children}</p>}
        </div>
      </div>
      <Link to="/app/account" className="btn-primary !px-3 !py-2 !text-xs sm:shrink-0">
        Ver Premium
      </Link>
    </div>
  )
}

/** Aviso de registros ocultos por el límite de historial del plan Free. No se muestra si no hay. */
export function HiddenHistoryNotice({ count, cutoff }: { count: number; cutoff: string | null }) {
  if (count === 0 || cutoff === null) return null
  return (
    <PremiumNotice title={`${count} ${count === 1 ? 'registro anterior' : 'registros anteriores'} al ${formatDate(cutoff)}`}>
      Tu plan Free muestra los últimos 6 meses. Siguen guardados y se usan en tus alertas; con Premium ves el historial completo.
    </PremiumNotice>
  )
}
