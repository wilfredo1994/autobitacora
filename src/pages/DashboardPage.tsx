import { Link } from 'react-router-dom'
import { Car, Gauge, Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useVehicles } from '../hooks/useVehicles'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import VehicleCard from '../components/VehicleCard'

const kmFormatter = new Intl.NumberFormat('es-PE')

export default function DashboardPage() {
  const { user } = useAuth()
  const { vehicles, loading, error } = useVehicles()
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const firstName = fullName?.split(' ')[0]

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </h1>
        <p className="mt-1 text-pine-600">Este es el resumen de tus vehículos.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!error && vehicles.length === 0 && (
        <section className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-emerald-600">
            <Car className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-pine-900">Aún no tienes vehículos</h2>
          <p className="mt-1 max-w-sm text-sm text-pine-600">
            Registra tu primer vehículo para empezar a llevar su historial, costos y mantenimientos.
          </p>
          <Link to="/app/vehicles?new=1" className="btn-primary mt-6">
            <Plus className="h-4 w-4" aria-hidden />
            Registrar mi primer vehículo
          </Link>
        </section>
      )}

      {!error && vehicles.length > 0 && (
        <>
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Indicadores">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Car className="h-4 w-4 text-emerald-600" aria-hidden />
                Vehículos activos
              </div>
              <p className="mt-2 text-3xl font-extrabold text-pine-900">{vehicles.length}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-pine-600">
                <Gauge className="h-4 w-4 text-emerald-600" aria-hidden />
                Kilometraje registrado
              </div>
              <p className="mt-2 text-3xl font-extrabold text-pine-900">
                {kmFormatter.format(vehicles.reduce((sum, v) => sum + v.current_mileage, 0))}
                <span className="ml-1 text-base font-semibold text-pine-600">km</span>
              </p>
              {vehicles.length > 1 && <p className="mt-1 text-xs text-pine-600">Suma de todos tus vehículos</p>}
            </div>
          </section>

          <section aria-label="Mis vehículos" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-pine-900">Mis vehículos</h2>
              <Link to="/app/vehicles" className="text-sm font-semibold text-emerald-700 hover:underline">
                Administrar
              </Link>
            </div>
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </section>

          <p className="rounded-xl border border-dashed border-pine-200 px-4 py-3 text-sm text-pine-600">
            Los costos, mantenimientos y recordatorios aparecerán aquí cuando registres tus primeros movimientos.
          </p>
        </>
      )}
    </div>
  )
}
