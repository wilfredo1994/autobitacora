const moneyFormatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const kmFormatter = new Intl.NumberFormat('es-PE')

export function formatMoney(value: number): string {
  return moneyFormatter.format(value)
}

export function formatKm(value: number): string {
  return `${kmFormatter.format(value)} km`
}

/** Convierte 'YYYY-MM-DD' en Date local (evita el desfase de zona horaria de new Date('YYYY-MM-DD')). */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Fecha de hoy en formato 'YYYY-MM-DD' según la zona horaria del usuario. */
export function todayISO(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** Días entre dos fechas ISO (to - from). Negativo si `to` es anterior. */
export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}
