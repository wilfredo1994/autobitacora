import { formatMoney } from '../../lib/format'

export interface ShareRow {
  key: string
  label: string
  amount: number
  color: string
}

const percentFormatter = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 0 })

/**
 * Barras horizontales de participación: cada fila muestra su monto y su % del total.
 * El ancho de la barra es relativo a la fila más grande, para que las diferencias se lean bien.
 */
export default function ShareBars({ rows, total }: { rows: ShareRow[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.amount), 0)

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-pine-800">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} aria-hidden />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-pine-700">
              <strong className="text-pine-900">{formatMoney(row.amount)}</strong>
              <span className="ml-1.5 text-xs text-pine-600">{total > 0 ? percentFormatter.format(row.amount / total) : '—'}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-pine-50" aria-hidden>
            <div
              className="h-2 rounded-full"
              style={{ width: `${max > 0 ? Math.max(2, (row.amount / max) * 100) : 0}%`, backgroundColor: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
