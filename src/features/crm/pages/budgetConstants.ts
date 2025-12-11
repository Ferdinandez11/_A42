// budgetConstants.ts
import { PRICES } from '@/pdf/utils/PriceCalculator';
import type { CatalogItem } from './budgetTypes';

export const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
  { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
  { id: 'slide_01', name: 'Tobogán Espiral', type: 'model', price: 2500 },
  { id: 'fence_wood', name: 'Valla de Madera', type: 'fence', price: PRICES.FENCE_M },
  { id: 'floor_rubber', name: 'Suelo de Caucho', type: 'floor', price: PRICES.FLOOR_M2 },
];

export const STATUS_BADGES = {
  pendiente: { label: 'PENDIENTE DE REVISIÓN', color: '#e67e22' },
  presupuestado: { label: 'PRESUPUESTADO', color: '#8e44ad' },
  pedido: { label: 'PEDIDO CONFIRMADO', color: '#27ae60' },
  fabricacion: { label: 'EN FABRICACIÓN', color: '#d35400' },
  rechazado: { label: 'RECHAZADO', color: '#c0392b' },
  cancelado: { label: 'CANCELADO', color: '#7f8c8d' },
} as const;