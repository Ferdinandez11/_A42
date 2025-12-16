// budgetConstants.ts
// ✅ CATALOG_ITEMS movido a constants.ts para eliminar duplicación
// Este archivo ahora solo contiene constantes específicas de presupuestos

export const STATUS_BADGES = {
  pendiente: { label: 'PENDIENTE DE REVISIÓN', color: '#e67e22' },
  presupuestado: { label: 'PRESUPUESTADO', color: '#8e44ad' },
  pedido: { label: 'PEDIDO CONFIRMADO', color: '#27ae60' },
  en_proceso: { label: 'EN FABRICACIÓN', color: '#d35400' },
  enviado: { label: 'ENVIADO', color: '#3498db' },
  entregado: { label: 'ENTREGADO', color: '#27ae60' },
  rechazado: { label: 'RECHAZADO', color: '#c0392b' },
  cancelado: { label: 'CANCELADO', color: '#7f8c8d' },
} as const;