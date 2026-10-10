import { Archive, Fuel, Gauge, MapPin, Pencil } from 'lucide-react'
import { formatDate, formatDecimal, formatKm, formatMoney, formatUnitPrice } from '../lib/format'
import { FUEL_TYPE_LABELS, FUEL_UNIT_LABELS, type FuelRecord } from '../types/app'

interface Props {
  records: FuelRecord[]
  /** Consumo del tramo que termina en cada carga (solo cargas de tanque lleno con un lleno anterior). */
  efficiency: Map<string, number>
  /** Sin acciones (vehículo en solo lectura), la lista no muestra los botones. */
  onEdit?: (record: FuelRecord) => void
  onArchive?: (record: FuelRecord) => void
}

export default function FuelList({ records, efficiency, onEdit, onArchive }: Props) {
  return (
    <ul className="space-y-3">
      {records.map((r) => {
        const unit = FUEL_UNIT_LABELS[r.fuel_type]
        const kmPerUnit = efficiency.get(r.id)
        return (
          <li key={r.id} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-pine-900">
                  {formatDecimal(Number(r.liters))} {unit} de {FUEL_TYPE_LABELS[r.fuel_type].toLowerCase()}
                  {!r.full_tank && (
                    <span className="ml-2 rounded-md bg-pine-50 px-1.5 py-0.5 align-middle text-xs font-semibold text-pine-700">Parcial</span>
                  )}
                </h3>
                <p className="mt-0.5 text-sm text-pine-600">
                  {formatDate(r.fuel_date)} · {formatUnitPrice(Number(r.price_per_liter))}/{unit}
                </p>
              </div>
              <p className="shrink-0 text-lg font-extrabold text-pine-900">{formatMoney(Number(r.total_amount))}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-pine-700">
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                {formatKm(r.mileage)}
              </span>
              {kmPerUnit !== undefined && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-pine-800">
                  <Fuel className="h-4 w-4 text-emerald-600" aria-hidden />
                  {formatDecimal(kmPerUnit)} km/{unit}
                </span>
              )}
              {r.station && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" aria-hidden />
                  {r.station}
                </span>
              )}
            </div>

            {onEdit && onArchive && (
              <div className="mt-3 flex gap-2 border-t border-pine-50 pt-3">
                <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => onEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Editar
                </button>
                <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => onArchive(r)}>
                  <Archive className="h-3.5 w-3.5" aria-hidden />
                  Archivar
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
