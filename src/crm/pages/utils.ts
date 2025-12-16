// utils.ts
export const formatMoney = (amount: number): string => {
  return amount.toLocaleString('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' €';
};

/**
 * Calcula la fecha de entrega estimada según el estado
 * - presupuestado: +48h desde ahora (fecha máxima de respuesta)
 * - pedido: +6 semanas (42 días) desde ahora (fecha de entrega)
 */
export const calculateDeliveryDate = (status: string, currentDate?: string): string => {
  const now = new Date();
  let calculatedDate: Date;

  if (status === 'presupuestado') {
    // Fecha máxima de respuesta: solicitud + 48h
    calculatedDate = new Date(now.getTime() + (48 * 60 * 60 * 1000));
  } else if (status === 'pedido') {
    // Fecha de entrega: aceptación + 6 semanas (42 días)
    calculatedDate = new Date(now.getTime() + (42 * 24 * 60 * 60 * 1000));
  } else {
    return currentDate || '';
  }

  calculatedDate.setMinutes(calculatedDate.getMinutes() - calculatedDate.getTimezoneOffset());
  return calculatedDate.toISOString().slice(0, 16);
};