import { describe, it, expect } from 'vitest';
import { PriceCalculator, PRICES } from '../PriceCalculator';
import type { SceneItem } from '@/domain/types/editor';

describe('PriceCalculator', () => {
  describe('getItemPrice', () => {
    it('should calculate floor price based on area', () => {
      const floorItem: SceneItem = {
        uuid: 'floor-1',
        type: 'floor',
        name: 'Test Floor',
        productId: 'floor-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
          { x: 0, z: 10 },
        ],
      };

      const price = PriceCalculator.getItemPrice(floorItem);
      
      // Area = 10 * 10 = 100 m²
      // Price = 100 * 35 = 3500
      expect(price).toBe(3500);
    });

    it('should use custom price per m² if provided', () => {
      const floorItem: SceneItem = {
        uuid: 'floor-2',
        type: 'floor',
        name: 'Premium Floor',
        productId: 'floor-premium-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 50, // Custom price per m²
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
          { x: 0, z: 10 },
        ],
      };

      const price = PriceCalculator.getItemPrice(floorItem);
      
      // Area = 100 m², Custom price = 50 €/m²
      // Total = 100 * 50 = 5000
      expect(price).toBe(5000);
    });

    it('should calculate fence price based on length', () => {
      const fenceItem: SceneItem = {
        uuid: 'fence-1',
        type: 'fence',
        name: 'Test Fence',
        productId: 'fence-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
        ],
        fenceConfig: {
          presetId: 'wood',
          colors: { post: 0x8B4513, slatA: 0xDEB887 },
        },
      };

      const price = PriceCalculator.getItemPrice(fenceItem);
      
      // Length = 10 + 10 = 20 m
      // Price = 20 * 45 = 900
      expect(price).toBe(900);
    });

    it('should return item price for model type', () => {
      const modelItem: SceneItem = {
        uuid: 'model-1',
        type: 'model',
        name: 'Test Model',
        productId: 'model-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 250,
        modelUrl: 'test.glb',
      };

      const price = PriceCalculator.getItemPrice(modelItem);
      expect(price).toBe(250);
    });

    it('should return 0 for item without price', () => {
      const modelItem: SceneItem = {
        uuid: 'model-2',
        type: 'model',
        name: 'Free Model',
        productId: 'model-free-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        modelUrl: 'test.glb',
      };

      const price = PriceCalculator.getItemPrice(modelItem);
      expect(price).toBe(0);
    });

    it('should handle triangular floor area correctly', () => {
      const triangleFloor: SceneItem = {
        uuid: 'floor-triangle',
        type: 'floor',
        name: 'Triangle Floor',
        productId: 'floor-triangle-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 5, z: 10 },
        ],
      };

      const price = PriceCalculator.getItemPrice(triangleFloor);
      
      // Triangle area = 50 m²
      // Price = 50 * 35 = 1750
      expect(price).toBe(1750);
    });
  });

  describe('getItemDimensions', () => {
    it('should return area in m² for floors', () => {
      const floorItem: SceneItem = {
        uuid: 'floor-1',
        type: 'floor',
        name: 'Test Floor',
        productId: 'floor-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 5 },
          { x: 0, z: 5 },
        ],
      };

      const dimensions = PriceCalculator.getItemDimensions(floorItem);
      expect(dimensions).toBe('50.00 m²');
    });

    it('should return length in ml for fences', () => {
      const fenceItem: SceneItem = {
        uuid: 'fence-1',
        type: 'fence',
        name: 'Test Fence',
        productId: 'fence-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
        ],
        fenceConfig: {
          presetId: 'wood',
          colors: { post: 0x8B4513, slatA: 0xDEB887 },
        },
      };

      const dimensions = PriceCalculator.getItemDimensions(fenceItem);
      expect(dimensions).toBe('10.00 ml');
    });

    it('should return "1 ud" for models', () => {
      const modelItem: SceneItem = {
        uuid: 'model-1',
        type: 'model',
        name: 'Test Model',
        productId: 'model-test-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 250,
        modelUrl: 'test.glb',
      };

      const dimensions = PriceCalculator.getItemDimensions(modelItem);
      expect(dimensions).toBe('1 ud');
    });
  });

  describe('calculateProjectTotal', () => {
    it('should sum all item prices', () => {
      const items: SceneItem[] = [
        {
          uuid: 'model-1',
          type: 'model',
          name: 'Model 1',
          productId: 'model-001',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 100,
          modelUrl: 'test1.glb',
        },
        {
          uuid: 'model-2',
          type: 'model',
          name: 'Model 2',
          productId: 'model-002',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 200,
          modelUrl: 'test2.glb',
        },
        {
          uuid: 'model-3',
          type: 'model',
          name: 'Model 3',
          productId: 'model-003',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 300,
          modelUrl: 'test3.glb',
        },
      ];

      const total = PriceCalculator.calculateProjectTotal(items);
      expect(total).toBe(600);
    });

    it('should return 0 for empty array', () => {
      const total = PriceCalculator.calculateProjectTotal([]);
      expect(total).toBe(0);
    });

    it('should calculate mixed items (floors, fences, models)', () => {
      const items: SceneItem[] = [
        {
          uuid: 'floor-1',
          type: 'floor',
          name: 'Floor',
          productId: 'floor-001',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 0,
          points: [
            { x: 0, z: 0 },
            { x: 10, z: 0 },
            { x: 10, z: 10 },
            { x: 0, z: 10 },
          ],
        },
        {
          uuid: 'model-1',
          type: 'model',
          name: 'Model',
          productId: 'model-001',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          price: 500,
          modelUrl: 'test.glb',
        },
      ];

      const total = PriceCalculator.calculateProjectTotal(items);
      // Floor: 100m² * 35 = 3500
      // Model: 500
      // Total: 4000
      expect(total).toBe(4000);
    });
  });

  describe('PRICES constants', () => {
    it('should have correct default prices', () => {
      expect(PRICES.FLOOR_M2).toBe(35);
      expect(PRICES.FENCE_M).toBe(45);
    });
  });

  describe('Edge cases', () => {
    it('should handle floor with less than 3 points', () => {
      const invalidFloor: SceneItem = {
        uuid: 'floor-invalid',
        type: 'floor',
        name: 'Invalid Floor',
        productId: 'floor-invalid-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
        ],
      };

      const price = PriceCalculator.getItemPrice(invalidFloor);
      expect(price).toBe(0);
    });

    it('should handle fence with less than 2 points', () => {
      const invalidFence: SceneItem = {
        uuid: 'fence-invalid',
        type: 'fence',
        name: 'Invalid Fence',
        productId: 'fence-invalid-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [{ x: 0, z: 0 }],
        fenceConfig: {
          presetId: 'wood',
          colors: { post: 0x8B4513, slatA: 0xDEB887 },
        },
      };

      const price = PriceCalculator.getItemPrice(invalidFence);
      expect(price).toBe(0);
    });

    it('should handle items without points', () => {
      const noPointsFloor: SceneItem = {
        uuid: 'floor-no-points',
        type: 'floor',
        name: 'No Points Floor',
        productId: 'floor-no-points-001',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        price: 0,
        points: [],
      };

      const price = PriceCalculator.getItemPrice(noPointsFloor);
      expect(price).toBe(0);
    });
  });
});