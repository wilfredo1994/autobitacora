import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { formatMoney, formatMonth } from '../../lib/format'
import { HISTORY_KIND_LABELS } from '../../lib/history'
import type { MonthTotals } from '../../lib/stats'
import { KIND_COLORS, KIND_ORDER } from './kindColors'
import KindLegend from './KindLegend'

const PLOT_HEIGHT = 200 // px
const SEGMENT_GAP = 2 // px de superficie entre segmentos apilados
const axisFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** Escala "limpia": 4 divisiones de 1, 2, 2.5 o 5 × 10^k que cubren el máximo. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 100, ticks: [0, 25, 50, 75, 100] }
  const rough = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const top = step * 4
  return { top, ticks: [0, step, step * 2, step * 3, top] }
}

function shortMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
}

interface Props {
  months: MonthTotals[]
}

/** Columnas apiladas de gasto por mes (6 o 12) (mantenimiento, combustible y otros), con tooltip y vista de tabla. */
export default function MonthlySpendChart({ months }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [active, setActive] = useState<number | null>(null)
  const { top, ticks } = niceScale(Math.max(...months.map((m) => m.total)))
  const spansYears = months[0].month.slice(0, 4) !== months[months.length - 1].month.slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <KindLegend />
        <button
          type="button"
          className="btn-secondary !px-3 !py-1.5 !text-xs"
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
        >
          {view === 'chart' ? <Table2 className="h-3.5 w-3.5" aria-hidden /> : <BarChart3 className="h-3.5 w-3.5" aria-hidden />}
          {view === 'chart' ? 'Ver como tabla' : 'Ver gráfico'}
        </button>
      </div>

      {view === 'table' ? (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-pine-100 text-left text-xs font-semibold text-pine-600">
                <th scope="col" className="px-1 py-2">Mes</th>
                {KIND_ORDER.map((kind) => (
                  <th key={kind} scope="col" className="px-1 py-2 text-right">{HISTORY_KIND_LABELS[kind]}</th>
                ))}
                <th scope="col" className="px-1 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {months.map((m) => (
                <tr key={m.month} className="border-b border-pine-50">
                  <th scope="row" className="px-1 py-2 text-left font-semibold text-pine-800">{formatMonth(m.month)}</th>
                  {KIND_ORDER.map((kind) => (
                    <td key={kind} className="px-1 py-2 text-right text-pine-700">{formatMoney(m[kind])}</td>
                  ))}
                  <td className="px-1 py-2 text-right font-bold text-pine-900">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Eje Y: valores redondos, alineados con las líneas de la cuadrícula */}
          <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-pine-600" style={{ height: PLOT_HEIGHT }} aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {axisFormatter.format(t)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: PLOT_HEIGHT }} onMouseLeave={() => setActive(null)}>
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-pine-100" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
              ))}

              <ul className="absolute inset-0 flex" aria-label="Gasto por mes">
                {months.map((m, i) => {
                  const segments = KIND_ORDER.filter((kind) => m[kind] > 0)
                  return (
                    <li
                      key={m.month}
                      tabIndex={0}
                      aria-label={`${formatMonth(m.month)}: ${formatMoney(m.total)}`}
                      className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      onClick={() => setActive(active === i ? null : i)}
                    >
                      {/* Banda de hover: toda la altura del mes es zona de contacto */}
                      <div className={`absolute inset-y-0 inset-x-0.5 rounded-md transition-colors ${active === i ? 'bg-pine-50' : ''} group-focus-visible:ring-2 group-focus-visible:ring-emerald-500`} aria-hidden />
                      <div className="relative flex w-[min(24px,60%)] flex-col-reverse" style={{ gap: SEGMENT_GAP }} aria-hidden>
                        {segments.map((kind, s) => (
                          <div
                            key={kind}
                            className={s === segments.length - 1 ? 'rounded-t-[4px]' : ''}
                            style={{
                              backgroundColor: KIND_COLORS[kind],
                              height: Math.max(1, (m[kind] / top) * PLOT_HEIGHT - (s > 0 ? SEGMENT_GAP : 0)),
                            }}
                          />
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {active !== null && <Tooltip month={months[active]} index={active} count={months.length} />}
            </div>

            <div className="mt-1.5 flex" aria-hidden>
              {months.map((m) => (
                <div key={m.month} className="flex-1 text-center text-[11px] leading-tight text-pine-600">
                  {shortMonth(m.month)}
                  {spansYears && m.month.endsWith('-01') && <span className="block font-semibold text-pine-700">{m.month.slice(0, 4)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tooltip({ month, index, count }: { month: MonthTotals; index: number; count: number }) {
  // Cerca de los bordes se ancla al lado para no salirse del gráfico.
  const edge = Math.max(1, Math.floor(count / 6))
  const position =
    index < edge
      ? { left: 0 }
      : index >= count - edge
        ? { right: 0 }
        : { left: `${((index + 0.5) / count) * 100}%`, transform: 'translateX(-50%)' }

  return (
    <div className="pointer-events-none absolute top-0 z-10 w-48 rounded-xl border border-pine-100 bg-white p-3 text-xs shadow-card" style={position} role="status">
      <p className="font-bold text-pine-900">{formatMonth(month.month)}</p>
      <ul className="mt-1.5 space-y-1">
        {KIND_ORDER.map((kind) => (
          <li key={kind} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-pine-700">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: KIND_COLORS[kind] }} aria-hidden />
              {HISTORY_KIND_LABELS[kind]}
            </span>
            <span className="tabular-nums text-pine-900">{formatMoney(month[kind])}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 flex justify-between border-t border-pine-50 pt-1.5 font-bold text-pine-900">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(month.total)}</span>
      </p>
    </div>
  )
}
