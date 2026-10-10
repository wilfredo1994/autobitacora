import type { HistoryKind } from '../../lib/history'

/**
 * Color fijo de cada tipo de movimiento en los gráficos (slots 1–3 de la paleta categórica
 * validada para daltonismo). El color sigue al tipo, nunca a su posición: un filtro no los repinta.
 * El texto nunca usa estos colores; van solo en barras y muestras de leyenda.
 */
export const KIND_COLORS: Record<HistoryKind, string> = {
  maintenance: '#2a78d6',
  fuel: '#eb6834',
  expense: '#1baf7a',
}

/** Orden de apilado y de leyenda (de abajo hacia arriba en las columnas). */
export const KIND_ORDER: HistoryKind[] = ['maintenance', 'fuel', 'expense']

/** Gris neutro para "Otros rubros" (no es un tipo, no lleva color categórico). */
export const NEUTRAL_COLOR = '#a8b5ae'
