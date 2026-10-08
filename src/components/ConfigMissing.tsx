import { KeyRound } from 'lucide-react'
import Logo from './Logo'

/** Pantalla guía cuando faltan las variables de entorno de Supabase. */
export default function ConfigMissing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <Logo className="mb-6 text-3xl" />
      <div className="card p-6">
        <div className="mb-3 flex items-center gap-2 text-pine-900">
          <KeyRound className="h-5 w-5 text-emerald-600" aria-hidden />
          <h1 className="text-lg font-bold">Falta configurar Supabase</h1>
        </div>
        <p className="mb-4 text-sm text-pine-700">
          Crea el archivo <code className="rounded bg-pine-50 px-1.5 py-0.5">.env.local</code> en la raíz del proyecto
          con los datos de tu proyecto (Project Settings → API) y reinicia <code className="rounded bg-pine-50 px-1.5 py-0.5">npm run dev</code>:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-pine-900 p-4 text-xs leading-relaxed text-emerald-100">
{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON`}
        </pre>
        <p className="mt-4 text-xs text-pine-600">
          Usa solo la clave pública (anon/publishable). Nunca pegues la clave service_role en el frontend.
        </p>
      </div>
    </main>
  )
}
