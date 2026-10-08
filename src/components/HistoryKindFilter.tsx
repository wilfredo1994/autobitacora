import { HISTORY_KIND_LABELS, type HistoryKind } from '../lib/history'

export type KindFilter = HistoryKind | 'all'

const OPTIONS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'maintenance', label: HISTORY_KIND_LABELS.maintenance },
  { id: 'fuel', label: HISTORY_KIND_LABELS.fuel },
  { id: 'expense', label: HISTORY_KIND_LABELS.expense },
]

interface Props {
  value: KindFilter
  onChange: (value: KindFilter) => void
}

/** Filtro por tipo de movimiento del historial. */
export default function HistoryKindFilter({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Tipo de movimiento" className="flex flex-wrap gap-2">
      {OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            value === id
              ? 'border-pine-900 bg-pine-900 text-white'
              : 'border-pine-100 bg-white text-pine-700 hover:border-pine-200 hover:text-pine-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
