import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, Pencil, Plus } from 'lucide-react'
import { useVehicles } from '../hooks/useVehicles'
import { archiveVehicle, createVehicle, updateVehicle } from '../services/vehicles'
import type { Vehicle, VehicleInput } from '../types/app'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import VehicleCard from '../components/VehicleCard'
import VehicleForm from '../components/VehicleForm'

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; vehicle: Vehicle }

export default function VehiclesPage() {
  const { vehicles, loading, error, reload } = useVehicles()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [toArchive, setToArchive] = useState<Vehicle | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // /app/vehicles?new=1 abre el formulario de creación (CTA del dashboard vacío)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm({ mode: 'create' })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const closeForm = useCallback(() => setForm({ mode: 'closed' }), [])

  async function handleSubmit(input: VehicleInput) {
    if (form.mode === 'edit') {
      await updateVehicle(form.vehicle.id, input)
      setNotice('Vehículo actualizado.')
    } else {
      await createVehicle(input)
      setNotice('Vehículo registrado.')
    }
    setActionError(null)
    closeForm()
    await reload()
  }

  async function confirmArchive() {
    if (!toArchive) return
    setArchiving(true)
    setActionError(null)
    try {
      await archiveVehicle(toArchive.id)
      setNotice(`${toArchive.brand} ${toArchive.model} fue archivado.`)
      setToArchive(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo archivar el vehículo.')
      setToArchive(null)
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-pine-900 sm:text-3xl">Vehículos</h1>
          <p className="mt-1 text-pine-600">Registra y administra los vehículos de tu bitácora.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setNotice(null); setForm({ mode: 'create' }) }}>
          <Plus className="h-4 w-4" aria-hidden />
          Registrar vehículo
        </button>
      </div>

      {notice && <Alert kind="success">{notice}</Alert>}
      {(error || actionError) && <Alert>{error ?? actionError}</Alert>}

      {loading ? (
        <Spinner />
      ) : vehicles.length === 0 && !error ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-semibold text-pine-900">No tienes vehículos activos.</p>
          <p className="mt-1 text-sm text-pine-600">Usa el botón “Registrar vehículo” para agregar el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              actions={
                <>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => { setNotice(null); setForm({ mode: 'edit', vehicle: v }) }}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Editar
                  </button>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setToArchive(v)}>
                    <Archive className="h-4 w-4" aria-hidden />
                    Archivar
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {form.mode !== 'closed' && (
        <VehicleForm
          key={form.mode === 'edit' ? form.vehicle.id : 'new'}
          vehicle={form.mode === 'edit' ? form.vehicle : null}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {toArchive && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-pine-900/40 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="archive-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h2 id="archive-title" className="text-lg font-bold text-pine-900">¿Archivar este vehículo?</h2>
            <p className="mt-2 text-sm text-pine-600">
              <strong>{toArchive.brand} {toArchive.model}</strong> ({toArchive.license_plate}) dejará de aparecer en tu
              lista. No se borra información: se conserva archivado.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" disabled={archiving} onClick={() => setToArchive(null)}>Cancelar</button>
              <button type="button" className="btn-danger" disabled={archiving} onClick={confirmArchive}>
                {archiving ? 'Archivando…' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
