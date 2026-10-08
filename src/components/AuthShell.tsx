import type { ReactNode } from 'react'
import Logo from './Logo'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <Logo className="text-3xl" />
        <p className="mt-2 text-sm text-pine-600">
          Conoce el historial, costo y próximo mantenimiento de tu vehículo en un solo lugar.
        </p>
      </div>
      <div className="card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-pine-900">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-pine-600">{subtitle}</p>
        {children}
      </div>
    </main>
  )
}
