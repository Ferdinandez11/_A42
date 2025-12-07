import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSceneStore } from '../useSceneStore';
import type { SceneItem } from '@/types/editor';

describe('useSceneStore', () => {
  const mockItem: SceneItem = {
    uuid: 'test-item-1',
    type: 'model',
    name: 'Test Item',
    productId: 'product-001',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    price: 100,
    modelUrl: 'test.glb',
  };

  beforeEach(() => {
    const { result } = renderHook(() => useSceneStore());
    act(() => {
      result.current.resetScene();
    });
  });

  describe('Initial state', () => {
    it('should initialize with empty items', () => {
      const { result } = renderHook(() => useSceneStore());
      expect(result.current.items).toEqual([]);
    });

    it('should initialize with 0 total price', () => {
      const { result } = renderHook(() => useSceneStore());
      expect(result.current.totalPrice).toBe(0);
    });

    it('should initialize with default fence config', () => {
      const { result } = renderHook(() => useSceneStore());
      expect(result.current.fenceConfig).toBeDefined();
      expect(result.current.fenceConfig.presetId).toBe('wood');
    });

    it('should initialize with empty history', () => {
      const { result } = renderHook(() => useSceneStore());
      expect(result.current.past).toEqual([]);
      expect(result.current.future).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('should add item to scene', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual(mockItem);
    });

    it('should update total price when adding item', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.totalPrice).toBe(100);
    });

    it('should add multiple items', () => {
      const { result } = renderHook(() => useSceneStore());

      const item2: SceneItem = { 
        ...mockItem, 
        uuid: 'test-item-2', 
        productId: 'product-002',
        price: 200 
      };

      act(() => {
        result.current.addItem(mockItem);
        result.current.addItem(item2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.totalPrice).toBe(300);
    });

    it('should save snapshot to history when adding', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      // Past should have one snapshot (the empty state)
      expect(result.current.past).toHaveLength(1);
    });
  });

  describe('removeItem', () => {
    it('should remove item by uuid', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.removeItem('test-item-1');
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should update total price when removing item', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.totalPrice).toBe(100);

      act(() => {
        result.current.removeItem('test-item-1');
      });

      expect(result.current.totalPrice).toBe(0);
    });

    it('should not affect store when removing non-existent item', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const itemsBefore = result.current.items.length;

      act(() => {
        result.current.removeItem('non-existent-uuid');
      });

      expect(result.current.items).toHaveLength(itemsBefore);
    });

    it('should save snapshot to history when removing', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const pastLengthBefore = result.current.past.length;

      act(() => {
        result.current.removeItem('test-item-1');
      });

      expect(result.current.past.length).toBeGreaterThan(pastLengthBefore);
    });
  });

  describe('updateItemTransform', () => {
    it('should update item position', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const newPosition = [5, 10, 15];

      act(() => {
        result.current.updateItemTransform(
          'test-item-1',
          newPosition,
          [0, 0, 0],
          [1, 1, 1]
        );
      });

      expect(result.current.items[0].position).toEqual(newPosition);
    });

    it('should update item rotation', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const newRotation = [0, Math.PI / 2, 0];

      act(() => {
        result.current.updateItemTransform(
          'test-item-1',
          [0, 0, 0],
          newRotation,
          [1, 1, 1]
        );
      });

      expect(result.current.items[0].rotation).toEqual(newRotation);
    });

    it('should update item scale', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const newScale = [2, 2, 2];

      act(() => {
        result.current.updateItemTransform(
          'test-item-1',
          [0, 0, 0],
          [0, 0, 0],
          newScale
        );
      });

      expect(result.current.items[0].scale).toEqual(newScale);
    });

    it('should not affect other items', () => {
      const { result } = renderHook(() => useSceneStore());

      const item2: SceneItem = { 
        ...mockItem, 
        uuid: 'test-item-2',
        productId: 'product-002' 
      };

      act(() => {
        result.current.addItem(mockItem);
        result.current.addItem(item2);
      });

      act(() => {
        result.current.updateItemTransform(
          'test-item-1',
          [5, 5, 5],
          [0, 0, 0],
          [1, 1, 1]
        );
      });

      expect(result.current.items[1].position).toEqual([0, 0, 0]);
    });
  });

  describe('updateFloorMaterial', () => {
    it('should update floor material', () => {
      const { result } = renderHook(() => useSceneStore());

      const floorItem: SceneItem = {
        uuid: 'floor-1',
        type: 'floor',
        name: 'Test Floor',
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
      };

      act(() => {
        result.current.addItem(floorItem);
      });

      act(() => {
        result.current.updateFloorMaterial('floor-1', 'grass');
      });

      const updatedFloor = result.current.items[0];
      if (updatedFloor.type === 'floor') {
        expect(updatedFloor.floorMaterial).toBe('grass');
      }
    });

    it('should clear texture when updating material', () => {
      const { result } = renderHook(() => useSceneStore());

      const floorItem: SceneItem = {
        uuid: 'floor-1',
        type: 'floor',
        name: 'Test Floor',
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
        textureUrl: 'test-texture.jpg',
      };

      act(() => {
        result.current.addItem(floorItem);
      });

      act(() => {
        result.current.updateFloorMaterial('floor-1', 'concrete');
      });

      const updatedFloor = result.current.items[0];
      if (updatedFloor.type === 'floor') {
        expect(updatedFloor.textureUrl).toBeUndefined();
      }
    });
  });

  describe('setItems', () => {
    it('should set all items at once', () => {
      const { result } = renderHook(() => useSceneStore());

      const items: SceneItem[] = [
        mockItem,
        { ...mockItem, uuid: 'item-2', productId: 'product-002', price: 200 },
      ];

      act(() => {
        result.current.setItems(items);
      });

      expect(result.current.items).toEqual(items);
      expect(result.current.totalPrice).toBe(300);
    });

    it('should clear history when setting items', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      act(() => {
        result.current.setItems([]);
      });

      expect(result.current.past).toEqual([]);
      expect(result.current.future).toEqual([]);
    });
  });

  describe('resetScene', () => {
    it('should clear all items', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
        result.current.addItem({ 
          ...mockItem, 
          uuid: 'test-item-2',
          productId: 'product-002'
        });
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.resetScene();
      });

      expect(result.current.items).toEqual([]);
    });

    it('should reset total price to 0', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.totalPrice).toBe(100);

      act(() => {
        result.current.resetScene();
      });

      expect(result.current.totalPrice).toBe(0);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      act(() => {
        result.current.resetScene();
      });

      expect(result.current.past).toEqual([]);
      expect(result.current.future).toEqual([]);
    });
  });

  describe('Fence configuration', () => {
    it('should update global fence config', () => {
      const { result } = renderHook(() => useSceneStore());

      const newConfig = {
        presetId: 'metal',
        colors: { post: 0x888888, slatA: 0xCCCCCC },
      };

      act(() => {
        result.current.setFenceConfig(newConfig);
      });

      expect(result.current.fenceConfig.presetId).toBe('metal');
      expect(result.current.fenceConfig.colors).toEqual(newConfig.colors);
    });

    it('should partially update fence config', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.setFenceConfig({ presetId: 'custom' });
      });

      expect(result.current.fenceConfig.presetId).toBe('custom');
      // Colors should remain from default
      expect(result.current.fenceConfig.colors).toBeDefined();
    });
  });

  describe('History (undo/redo)', () => {
    it('should undo to previous state', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should redo undone action', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.items).toHaveLength(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.items).toHaveLength(1);
    });

    it('should not undo when no history', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.undo();
      });

      expect(result.current.items).toEqual([]);
    });

    it('should not redo when no future', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle items with 0 price', () => {
      const { result } = renderHook(() => useSceneStore());

      const freeItem: SceneItem = { 
        ...mockItem, 
        productId: 'product-free',
        price: 0 
      };

      act(() => {
        result.current.addItem(freeItem);
      });

      expect(result.current.totalPrice).toBe(0);
    });

    it('should recalculate total price correctly with multiple items', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem({ ...mockItem, price: 100 });
        result.current.addItem({ 
          ...mockItem, 
          uuid: 'item-2', 
          productId: 'product-002',
          price: 200 
        });
        result.current.addItem({ 
          ...mockItem, 
          uuid: 'item-3', 
          productId: 'product-003',
          price: 300 
        });
      });

      expect(result.current.totalPrice).toBe(600);
    });
  });
});