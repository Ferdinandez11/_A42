// constants.ts
import { PRICES } from '@/pdf/utils/PriceCalculator';
import type { CatalogItem } from './types';

export const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
  { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
  { id: 'slide_01', name: 'Tobogán Espiral', type: 'model', price: 2500 },
  { id: 'fence_wood', name: 'Valla de Madera', type: 'fence', price: PRICES.FENCE_M },
  { id: 'floor_rubber', name: 'Suelo de Caucho', type: 'floor', price: PRICES.FLOOR_M2 },
];

export const STATUS_OPTIONS = [
  { value: 'pendiente', label: '🟠 Pendiente' },
  { value: 'presupuestado', label: '🟣 Presupuestado (Auto: +48h)' },
  { value: 'pedido', label: '🔵 Pedido Aceptado (Auto: +6sem)' },
  { value: 'en_proceso', label: '🟡 En Fabricación' },
  { value: 'enviado', label: '🔵 Enviado' },
  { value: 'entregado', label: '🟢 Entregado' },
  { value: 'rechazado', label: '🔴 Rechazado' },
  { value: 'cancelado', label: '⚫ Cancelado' },
];