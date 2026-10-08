import { todayISO } from './format'
import type { Expense } from '../types/app'

export interface CategoryTotal {
  category: string
  amount: number
}

export interface ExpenseTotals {
  total: number
  thisYear: number
  thisMonth: number
  count: number
  /** Categoría con más gasto acumulado (null si no hay gastos con monto). */
  topCategory: CategoryTotal | null
}

function sortNewestFirst(a: Expense, b: Expense): number {
  if (a.expense_date !== b.expense_date) return a.expense_date < b.expense_date ? 1 : -1
  return a.created_at < b.created_at ? 1 : -1
}

export function summarizeExpenses(records: Expense[]): ExpenseTotals {
  const today = todayISO()
  const yearPrefix = today.slice(0, 4)
  const monthPrefix = today.slice(0, 7)

  let total = 0
  let thisYear = 0
  let thisMonth = 0
  const byCategory = new Map<string, number>()
  for (const r of records) {
    const amount = Number(r.amount)
    total += amount
    if (r.expense_date.startsWith(yearPrefix)) thisYear += amount
    if (r.expense_date.startsWith(monthPrefix)) thisMonth += amount
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + amount)
  }

  let topCategory: CategoryTotal | null = null
  for (const [category, amount] of byCategory) {
    if (amount > 0 && (!topCategory || amount > topCategory.amount)) topCategory = { category, amount }
  }

  return { total, thisYear, thisMonth, count: records.length, topCategory }
}

/** Ordena para mostrar el historial: más reciente primero. */
export function sortExpenseHistory(records: Expense[]): Expense[] {
  return [...records].sort(sortNewestFirst)
}
