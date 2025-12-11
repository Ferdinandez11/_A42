// budgetUtils.ts
import { STATUS_BADGES } from './budgetConstants';

export const formatMoney = (amount: number): string => {
  return amount.toLocaleString('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }) + ' €';
};

export const getStatusBadge = (status: string) => {
  return STATUS_BADGES[status as keyof typeof STATUS_BADGES] || { 
    label: status.toUpperCase(), 
    color: '#95a5a6' 
  };
};