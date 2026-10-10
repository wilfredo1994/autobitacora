import { HISTORY_KIND_LABELS } from '../../lib/history'
import { KIND_COLORS, KIND_ORDER } from './kindColors'

/** Leyenda de los tres tipos de movimiento: muestra de color + nombre en tinta de texto. */
export default function KindLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-pine-700" aria-label="Leyenda">
      {KIND_ORDER.map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: KIND_COLORS[kind] }} aria-hidden />
          {HISTORY_KIND_LABELS[kind]}
        </li>
      ))}
    </ul>
  )
}
