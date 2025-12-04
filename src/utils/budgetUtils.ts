import type { SceneItem } from '@/types/editor';

export interface BudgetLineItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

export const generateBillOfMaterials = (items: SceneItem[]): BudgetLineItem[] => {
  const groupedItems: Record<string, BudgetLineItem> = {};

  items.forEach((item) => {
    if (!item.productId) return;

    const key = item.productId;

    if (!groupedItems[key]) {
      groupedItems[key] = {
        id: item.productId,
        name: item.name || 'Producto sin nombre',
        category: item.type,
        quantity: 0,
        unitPrice: item.price || 0,
        totalPrice: 0,
        image: item.modelUrl
      };
    }

    groupedItems[key].quantity += 1;
    groupedItems[key].totalPrice += item.price || 0;
  });

  return Object.values(groupedItems);
};

export const calculateGrandTotal = (lines: BudgetLineItem[]) => {
  return lines.reduce((acc, line) => acc + line.totalPrice, 0);
};
