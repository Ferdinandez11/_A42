// ============================================================================
// BUDGET UTILITIES
// Functions for generating bills of materials and cost calculations
// ============================================================================

import type { SceneItem, ModelItem } from '@/types/editor';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Line item in a budget or bill of materials
 */
export interface BudgetLineItem {
  /** Product identifier */
  id: string;
  
  /** Product name */
  name: string;
  
  /** Product category/type */
  category: string;
  
  /** Quantity of this product */
  quantity: number;
  
  /** Unit price in euros */
  unitPrice: number;
  
  /** Total price (quantity × unitPrice) */
  totalPrice: number;
  
  /** Preview image URL */
  image?: string;
  
  /** Product description */
  description?: string;
  
  /** Additional metadata */
  metadata?: {
    url_tech?: string;
    url_cert?: string;
    url_inst?: string;
  };
}

/**
 * Budget summary with totals and breakdowns
 */
export interface BudgetSummary {
  /** Line items */
  items: BudgetLineItem[];
  
  /** Subtotal (before taxes/discounts) */
  subtotal: number;
  
  /** Tax amount (if applicable) */
  tax?: number;
  
  /** Tax rate (e.g., 0.21 for 21% VAT) */
  taxRate?: number;
  
  /** Discount amount */
  discount?: number;
  
  /** Grand total */
  total: number;
  
  /** Total number of items */
  itemCount: number;
  
  /** Number of unique products */
  uniqueProducts: number;
}

/**
 * Budget options for customization
 */
export interface BudgetOptions {
  /** Include tax in calculations */
  includeTax?: boolean;
  
  /** Tax rate (default: 0.21 for Spain) */
  taxRate?: number;
  
  /** Discount percentage (0-100) */
  discountPercentage?: number;
  
  /** Group similar items */
  groupItems?: boolean;
  
  /** Include images in line items */
  includeImages?: boolean;
  
  /** Include metadata (tech docs, etc.) */
  includeMetadata?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TAX_RATE = 0.21; // 21% VAT (Spain)
const DEFAULT_PRODUCT_NAME = 'Producto sin nombre';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts image URL from scene item
 */
const extractImageUrl = (item: SceneItem): string | undefined => {
  if (item.type === 'model') {
    return (item as ModelItem).modelUrl;
  }
  return undefined;
};

/**
 * Creates a grouping key for scene items
 */
const createGroupingKey = (item: SceneItem): string => {
  return item.productId || `${item.type}_${item.name}`;
};

/**
 * Extracts metadata from scene item
 */
const extractMetadata = (item: SceneItem): BudgetLineItem['metadata'] => {
  return {
    url_tech: item.url_tech,
    url_cert: item.url_cert,
    url_inst: item.url_inst,
  };
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generates a bill of materials from scene items
 * Groups identical products and calculates quantities and totals
 * 
 * @param items - Array of scene items to process
 * @param options - Optional configuration for the bill of materials
 * @returns Array of budget line items
 */
export const generateBillOfMaterials = (
  items: SceneItem[],
  options: BudgetOptions = {}
): BudgetLineItem[] => {
  const {
    groupItems = true,
    includeImages = true,
    includeMetadata = false,
  } = options;

  if (!groupItems) {
    // Return individual items without grouping
    return items.map((item, index) => ({
      id: item.productId || `item_${index}`,
      name: item.name || DEFAULT_PRODUCT_NAME,
      category: item.type,
      quantity: 1,
      unitPrice: item.price || 0,
      totalPrice: item.price || 0,
      image: includeImages ? extractImageUrl(item) : undefined,
      description: item.description,
      metadata: includeMetadata ? extractMetadata(item) : undefined,
    }));
  }

  // Group identical items
  const groupedItems: Record<string, BudgetLineItem> = {};

  items.forEach((item) => {
    const key = createGroupingKey(item);

    if (!groupedItems[key]) {
      groupedItems[key] = {
        id: item.productId || key,
        name: item.name || DEFAULT_PRODUCT_NAME,
        category: item.type,
        quantity: 0,
        unitPrice: item.price || 0,
        totalPrice: 0,
        image: includeImages ? extractImageUrl(item) : undefined,
        description: item.description,
        metadata: includeMetadata ? extractMetadata(item) : undefined,
      };
    }

    groupedItems[key].quantity += 1;
    groupedItems[key].totalPrice = groupedItems[key].quantity * groupedItems[key].unitPrice;
  });

  return Object.values(groupedItems);
};

/**
 * Calculates the grand total from budget line items
 * 
 * @param lines - Array of budget line items
 * @returns Total cost in euros
 */
export const calculateGrandTotal = (lines: BudgetLineItem[]): number => {
  return lines.reduce((acc, line) => acc + line.totalPrice, 0);
};

/**
 * Calculates tax amount based on subtotal
 * 
 * @param subtotal - Subtotal before tax
 * @param taxRate - Tax rate (default: 0.21)
 * @returns Tax amount
 */
export const calculateTax = (subtotal: number, taxRate: number = DEFAULT_TAX_RATE): number => {
  return subtotal * taxRate;
};

/**
 * Calculates discount amount based on subtotal
 * 
 * @param subtotal - Subtotal before discount
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Discount amount
 */
export const calculateDiscount = (subtotal: number, discountPercentage: number): number => {
  return subtotal * (discountPercentage / 100);
};

/**
 * Generates a complete budget summary with all calculations
 * 
 * @param items - Scene items to process
 * @param options - Budget options
 * @returns Complete budget summary
 */
export const generateBudgetSummary = (
  items: SceneItem[],
  options: BudgetOptions = {}
): BudgetSummary => {
  const {
    includeTax = false,
    taxRate = DEFAULT_TAX_RATE,
    discountPercentage = 0,
  } = options;

  const lineItems = generateBillOfMaterials(items, options);
  const subtotal = calculateGrandTotal(lineItems);
  const discount = discountPercentage > 0 ? calculateDiscount(subtotal, discountPercentage) : 0;
  const subtotalAfterDiscount = subtotal - discount;
  const tax = includeTax ? calculateTax(subtotalAfterDiscount, taxRate) : 0;
  const total = subtotalAfterDiscount + tax;

  return {
    items: lineItems,
    subtotal,
    tax: includeTax ? tax : undefined,
    taxRate: includeTax ? taxRate : undefined,
    discount: discount > 0 ? discount : undefined,
    total,
    itemCount: items.length,
    uniqueProducts: lineItems.length,
  };
};

/**
 * Formats a price for display
 * 
 * @param price - Price in euros
 * @param locale - Locale for formatting (default: 'es-ES')
 * @returns Formatted price string
 */
export const formatPrice = (price: number, locale: string = 'es-ES'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Exports budget to CSV format
 * 
 * @param summary - Budget summary to export
 * @returns CSV string
 */
export const exportBudgetToCSV = (summary: BudgetSummary): string => {
  const headers = ['ID', 'Nombre', 'Categoría', 'Cantidad', 'Precio Unitario', 'Total'];
  const rows = summary.items.map(item => [
    item.id,
    item.name,
    item.category,
    item.quantity.toString(),
    item.unitPrice.toFixed(2),
    item.totalPrice.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    `Subtotal,,,,,${summary.subtotal.toFixed(2)}`,
    summary.discount ? `Descuento,,,,,${summary.discount.toFixed(2)}` : '',
    summary.tax ? `IVA (${(summary.taxRate! * 100).toFixed(0)}%),,,,,${summary.tax.toFixed(2)}` : '',
    `Total,,,,,${summary.total.toFixed(2)}`,
  ].filter(Boolean).join('\n');

  return csvContent;
};

/**
 * Groups budget items by category
 * 
 * @param items - Budget line items
 * @returns Items grouped by category
 */
export const groupByCategory = (
  items: BudgetLineItem[]
): Record<string, BudgetLineItem[]> => {
  return items.reduce((acc, item) => {
    const category = item.category || 'otros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BudgetLineItem[]>);
};

/**
 * Calculates category totals
 * 
 * @param items - Budget line items
 * @returns Category totals map
 */
export const calculateCategoryTotals = (
  items: BudgetLineItem[]
): Record<string, number> => {
  const grouped = groupByCategory(items);
  return Object.entries(grouped).reduce((acc, [category, categoryItems]) => {
    acc[category] = calculateGrandTotal(categoryItems);
    return acc;
  }, {} as Record<string, number>);
};