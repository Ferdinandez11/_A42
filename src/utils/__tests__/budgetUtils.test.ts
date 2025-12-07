import { describe, it, expect } from 'vitest';
import type { SceneItem } from '@/types/editor';
import {
  generateBillOfMaterials,
  calculateGrandTotal,
  calculateTax,
  calculateDiscount,
  generateBudgetSummary,
  formatPrice,
  exportBudgetToCSV,
  groupByCategory,
  calculateCategoryTotals,
  type BudgetLineItem,
} from '../budgetUtils';

describe('budgetUtils', () => {
  // Mock data helpers
  const createModelItem = (
    id: string, 
    name: string, 
    price: number, 
    productId: string = `product-${id}`
  ): SceneItem => ({
    uuid: id,
    type: 'model',
    name,
    productId,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    price,
    modelUrl: 'test.glb',
  });

  describe('generateBillOfMaterials', () => {
    it('should generate bill of materials with grouped items', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair', 100, 'chair-001'),
        createModelItem('2', 'Chair', 100, 'chair-001'),
        createModelItem('3', 'Table', 200, 'table-001'),
      ];

      const bom = generateBillOfMaterials(items);

      expect(bom).toHaveLength(2);
      
      const chair = bom.find(item => item.id === 'chair-001');
      expect(chair?.quantity).toBe(2);
      expect(chair?.unitPrice).toBe(100);
      expect(chair?.totalPrice).toBe(200);

      const table = bom.find(item => item.id === 'table-001');
      expect(table?.quantity).toBe(1);
      expect(table?.totalPrice).toBe(200);
    });

    it('should not group items when groupItems is false', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair', 100, 'chair-001'),
        createModelItem('2', 'Chair', 100, 'chair-001'),
      ];

      const bom = generateBillOfMaterials(items, { groupItems: false });

      expect(bom).toHaveLength(2);
      expect(bom[0].quantity).toBe(1);
      expect(bom[1].quantity).toBe(1);
    });

    it('should include images when includeImages is true', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair', 100, 'chair-001'),
      ];

      const bom = generateBillOfMaterials(items, { includeImages: true });

      expect(bom[0].image).toBe('test.glb');
    });

    it('should exclude images when includeImages is false', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair', 100, 'chair-001'),
      ];

      const bom = generateBillOfMaterials(items, { includeImages: false });

      expect(bom[0].image).toBeUndefined();
    });

    it('should handle items with same productId', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair A', 100, 'chair-001'),
        createModelItem('2', 'Chair B', 100, 'chair-001'),
      ];

      const bom = generateBillOfMaterials(items);

      // Should group by productId
      expect(bom).toHaveLength(1);
      expect(bom[0].quantity).toBe(2);
    });

    it('should set default name for unnamed items', () => {
      const item: SceneItem = {
        uuid: '1',
        type: 'model',
        name: '',
        productId: 'product-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 100,
        modelUrl: 'test.glb',
      };

      const bom = generateBillOfMaterials([item]);

      expect(bom[0].name).toBe('Producto sin nombre');
    });

    it('should include metadata when requested', () => {
      const itemWithMetadata: SceneItem = {
        uuid: '1',
        type: 'model',
        name: 'Item with docs',
        productId: 'product-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 100,
        modelUrl: 'test.glb',
        url_tech: 'https://example.com/tech.pdf',
        url_cert: 'https://example.com/cert.pdf',
      };

      const bom = generateBillOfMaterials([itemWithMetadata], { 
        includeMetadata: true 
      });

      expect(bom[0].metadata).toBeDefined();
      expect(bom[0].metadata?.url_tech).toBe('https://example.com/tech.pdf');
    });
  });

  describe('calculateGrandTotal', () => {
    it('should sum all line item totals', () => {
      const lines: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Item 1',
          category: 'model',
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
        },
        {
          id: '2',
          name: 'Item 2',
          category: 'model',
          quantity: 1,
          unitPrice: 300,
          totalPrice: 300,
        },
      ];

      const total = calculateGrandTotal(lines);
      expect(total).toBe(500);
    });

    it('should return 0 for empty array', () => {
      const total = calculateGrandTotal([]);
      expect(total).toBe(0);
    });

    it('should handle negative totals', () => {
      const lines: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Credit',
          category: 'model',
          quantity: 1,
          unitPrice: -100,
          totalPrice: -100,
        },
      ];

      const total = calculateGrandTotal(lines);
      expect(total).toBe(-100);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax with default rate (21%)', () => {
      const tax = calculateTax(1000);
      expect(tax).toBe(210);
    });

    it('should calculate tax with custom rate', () => {
      const tax = calculateTax(1000, 0.10);
      expect(tax).toBe(100);
    });

    it('should handle zero subtotal', () => {
      const tax = calculateTax(0);
      expect(tax).toBe(0);
    });

    it('should handle fractional tax rates', () => {
      const tax = calculateTax(1000, 0.165);
      expect(tax).toBe(165);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate discount percentage correctly', () => {
      const discount = calculateDiscount(1000, 20);
      expect(discount).toBe(200);
    });

    it('should handle 0% discount', () => {
      const discount = calculateDiscount(1000, 0);
      expect(discount).toBe(0);
    });

    it('should handle 100% discount', () => {
      const discount = calculateDiscount(1000, 100);
      expect(discount).toBe(1000);
    });

    it('should handle fractional percentages', () => {
      const discount = calculateDiscount(1000, 12.5);
      expect(discount).toBe(125);
    });

    it('should handle large subtotals', () => {
      const discount = calculateDiscount(999999, 15);
      expect(discount).toBe(149999.85);
    });
  });

  describe('generateBudgetSummary', () => {
    const items: SceneItem[] = [
      createModelItem('1', 'Chair', 100, 'chair-001'),
      createModelItem('2', 'Chair', 100, 'chair-001'),
      createModelItem('3', 'Table', 400, 'table-001'),
    ];

    it('should generate complete summary without tax or discount', () => {
      const summary = generateBudgetSummary(items);

      expect(summary.subtotal).toBe(600);
      expect(summary.total).toBe(600);
      expect(summary.tax).toBeUndefined();
      expect(summary.discount).toBeUndefined();
      expect(summary.itemCount).toBe(3);
      expect(summary.uniqueProducts).toBe(2);
    });

    it('should include tax when requested', () => {
      const summary = generateBudgetSummary(items, { includeTax: true });

      expect(summary.subtotal).toBe(600);
      expect(summary.tax).toBe(126); // 600 * 0.21
      expect(summary.total).toBe(726);
      expect(summary.taxRate).toBe(0.21);
    });

    it('should apply discount before tax', () => {
      const summary = generateBudgetSummary(items, {
        includeTax: true,
        discountPercentage: 10,
      });

      // Subtotal: 600
      // Discount (10%): 60
      // Subtotal after discount: 540
      // Tax (21% of 540): 113.4
      // Total: 653.4
      expect(summary.subtotal).toBe(600);
      expect(summary.discount).toBe(60);
      expect(summary.tax).toBeCloseTo(113.4, 1);
      expect(summary.total).toBeCloseTo(653.4, 1);
    });

    it('should use custom tax rate', () => {
      const summary = generateBudgetSummary(items, {
        includeTax: true,
        taxRate: 0.10,
      });

      expect(summary.tax).toBe(60); // 600 * 0.10
      expect(summary.taxRate).toBe(0.10);
    });

    it('should handle empty items array', () => {
      const summary = generateBudgetSummary([]);

      expect(summary.subtotal).toBe(0);
      expect(summary.total).toBe(0);
      expect(summary.itemCount).toBe(0);
      expect(summary.uniqueProducts).toBe(0);
    });
  });

  describe('formatPrice', () => {
    it('should format price in Spanish locale by default', () => {
      const formatted = formatPrice(1234.56);
      // El formato puede variar según el entorno, verificamos que contiene los elementos clave
      expect(formatted).toContain('1234');
      expect(formatted).toContain('56');
      expect(formatted).toContain('€');
    });

    it('should handle whole numbers', () => {
      const formatted = formatPrice(1000);
      expect(formatted).toContain('1000');
      expect(formatted).toContain('€');
    });

    it('should handle zero', () => {
      const formatted = formatPrice(0);
      expect(formatted).toContain('0');
      expect(formatted).toContain('€');
    });

    it('should handle large numbers', () => {
      const formatted = formatPrice(1234567.89);
      // Verifica que contiene los dígitos (pueden tener separadores)
      expect(formatted).toMatch(/1.*2.*3.*4.*5.*6.*7/);
      expect(formatted).toContain('89');
      expect(formatted).toContain('€');
    });

    it('should round to 2 decimal places', () => {
      const formatted = formatPrice(99.999);
      expect(formatted).toContain('100');
      expect(formatted).toContain('€');
    });

    it('should handle negative numbers', () => {
      const formatted = formatPrice(-500.50);
      expect(formatted).toContain('-');
      expect(formatted).toContain('500');
      expect(formatted).toContain('€');
    });
  });

  describe('exportBudgetToCSV', () => {
    it('should generate valid CSV string', () => {
      const summary = generateBudgetSummary([
        createModelItem('1', 'Chair', 100, 'chair-001'),
        createModelItem('2', 'Table', 200, 'table-001'),
      ]);

      const csv = exportBudgetToCSV(summary);

      expect(csv).toContain('ID,Nombre,Categoría,Cantidad,Precio Unitario,Total');
      expect(csv).toContain('chair-001,Chair,model,1,100.00,100.00');
      expect(csv).toContain('table-001,Table,model,1,200.00,200.00');
      expect(csv).toContain('Subtotal,,,,,300.00');
      expect(csv).toContain('Total,,,,,300.00');
    });

    it('should include discount in CSV when present', () => {
      const summary = generateBudgetSummary(
        [createModelItem('1', 'Chair', 100, 'chair-001')],
        { discountPercentage: 10 }
      );

      const csv = exportBudgetToCSV(summary);

      expect(csv).toContain('Descuento');
      expect(csv).toContain('10.00');
    });

    it('should include tax in CSV when present', () => {
      const summary = generateBudgetSummary(
        [createModelItem('1', 'Chair', 100, 'chair-001')],
        { includeTax: true }
      );

      const csv = exportBudgetToCSV(summary);

      expect(csv).toContain('IVA (21%)');
    });

    it('should handle empty summary', () => {
      const summary = generateBudgetSummary([]);
      const csv = exportBudgetToCSV(summary);

      expect(csv).toContain('ID,Nombre');
      expect(csv).toContain('Total,,,,,0.00');
    });
  });

  describe('groupByCategory', () => {
    it('should group items by category', () => {
      const items: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Chair',
          category: 'model',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        },
        {
          id: '2',
          name: 'Floor',
          category: 'floor',
          quantity: 1,
          unitPrice: 200,
          totalPrice: 200,
        },
        {
          id: '3',
          name: 'Table',
          category: 'model',
          quantity: 1,
          unitPrice: 150,
          totalPrice: 150,
        },
      ];

      const grouped = groupByCategory(items);

      expect(grouped.model).toHaveLength(2);
      expect(grouped.floor).toHaveLength(1);
    });

    it('should handle items without category', () => {
      const items: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Unknown',
          category: '',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        },
      ];

      const grouped = groupByCategory(items);

      expect(grouped.otros).toBeDefined();
      expect(grouped.otros).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = groupByCategory([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('calculateCategoryTotals', () => {
    it('should calculate totals per category', () => {
      const items: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Chair',
          category: 'model',
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
        },
        {
          id: '2',
          name: 'Table',
          category: 'model',
          quantity: 1,
          unitPrice: 300,
          totalPrice: 300,
        },
        {
          id: '3',
          name: 'Floor',
          category: 'floor',
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500,
        },
      ];

      const totals = calculateCategoryTotals(items);

      expect(totals.model).toBe(500);
      expect(totals.floor).toBe(500);
    });

    it('should handle empty array', () => {
      const totals = calculateCategoryTotals([]);
      expect(Object.keys(totals)).toHaveLength(0);
    });

    it('should handle single category', () => {
      const items: BudgetLineItem[] = [
        {
          id: '1',
          name: 'Item 1',
          category: 'test',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        },
        {
          id: '2',
          name: 'Item 2',
          category: 'test',
          quantity: 1,
          unitPrice: 200,
          totalPrice: 200,
        },
      ];

      const totals = calculateCategoryTotals(items);

      expect(Object.keys(totals)).toHaveLength(1);
      expect(totals.test).toBe(300);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty items array', () => {
      const bom = generateBillOfMaterials([]);
      expect(bom).toHaveLength(0);
    });

    it('should handle items with zero price', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Free Item', 0, 'free-001'),
      ];

      const summary = generateBudgetSummary(items);
      expect(summary.total).toBe(0);
    });

    it('should handle negative prices', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Credit', -100, 'credit-001'),
      ];

      const summary = generateBudgetSummary(items);
      expect(summary.total).toBe(-100);
    });

    it('should handle very large numbers', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Expensive', 999999.99, 'exp-001'),
      ];

      const summary = generateBudgetSummary(items);
      expect(summary.total).toBe(999999.99);
    });

    it('should handle mixed floor and model items', () => {
      const items: SceneItem[] = [
        createModelItem('1', 'Chair', 100, 'chair-001'),
        {
          uuid: 'floor-1',
          type: 'floor',
          name: 'Floor',
          productId: 'floor-001',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 350,
          points: [
            { x: 0, z: 0 },
            { x: 10, z: 0 },
            { x: 10, z: 10 },
            { x: 0, z: 10 },
          ],
        },
      ];

      const bom = generateBillOfMaterials(items);
      expect(bom).toHaveLength(2);
    });
  });
});