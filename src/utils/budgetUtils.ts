import type { SceneItem } from '../stores/useAppStore';

export interface BudgetLineItem {
  id: string; // ID del producto (ej: 'bench_01')
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
    // Ignoramos elementos que no tengan precio o ID de producto válido
    if (!item.productId) return;

    // Clave única para agrupar (por ID de producto)
    const key = item.productId;

    if (!groupedItems[key]) {
      // Si es la primera vez que vemos este producto, lo inicializamos
      groupedItems[key] = {
        id: item.productId,
        name: item.name || 'Producto sin nombre',
        category: item.type,
        quantity: 0,
        unitPrice: item.price || 0,
        totalPrice: 0,
        image: item.modelUrl // O una imagen 2D si la tienes en el item
      };
    }

    // Sumamos cantidad y precio
    // NOTA: Para suelos y vallas, la lógica puede ser distinta (metros vs unidades)
    // Aquí asumimos unidades por defecto. Si el item tiene una propiedad 'length' o 'area', habría que usarla.
    groupedItems[key].quantity += 1; 
    groupedItems[key].totalPrice += item.price || 0;
  });

  // Convertimos el objeto en un array
  return Object.values(groupedItems);
};

export const calculateGrandTotal = (lines: BudgetLineItem[]) => {
    return lines.reduce((acc, line) => acc + line.totalPrice, 0);
};