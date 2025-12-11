// utils.ts
export const formatMoney = (amount: number): string => {
  return amount.toLocaleString('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' €';
};

export const calculateDeliveryDate = (status: string, currentDate?: string): string => {
  const now = new Date();
  let calculatedDate: Date;

  if (status === 'presupuestado') {
    calculatedDate = new Date(now.getTime() + (48 * 60 * 60 * 1000));
  } else if (status === 'pedido') {
    calculatedDate = new Date(now.getTime() + (42 * 24 * 60 * 60 * 1000));
  } else {
    return currentDate || '';
  }

  calculatedDate.setMinutes(calculatedDate.getMinutes() - calculatedDate.getTimezoneOffset());
  return calculatedDate.toISOString().slice(0, 16);
};