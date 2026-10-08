import type { ReactNode } from 'react'
import { Car, Gauge } from 'lucide-react'
import { VEHICLE_TYPE_LABELS, type Vehicle } from '../types/app'

const kmFormatter = new Intl.NumberFormat('es-PE')

export default function VehicleCard({ vehicle, actions }: { vehicle: Vehicle; actions?: ReactNode }) {
  return (
    <article className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pine-900 text-emerald-400">
          <Car className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold leading-tight text-pine-900">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="mt-0.5 text-sm text-pine-600">
            {VEHICLE_TYPE_LABELS[vehicle.vehicle_type]} · {vehicle.year}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-pine-50 px-2.5 py-1 text-xs font-bold tracking-wider text-pine-800">
              {vehicle.license_plate}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-pine-800">
              <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
              {kmFormatter.format(vehicle.current_mileage)} km
            </span>
          </div>
        </div>
      </div>
      {actions && <div className="flex gap-2 sm:shrink-0">{actions}</div>}
    </article>
  )
}
