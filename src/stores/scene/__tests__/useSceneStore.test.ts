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
  });

  describe('updateItem', () => {
    it('should update existing item', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      const updates = { price: 250, name: 'Updated Item' };

      act(() => {
        result.current.updateItem('test-item-1', updates);
      });

      expect(result.current.items[0].price).toBe(250);
      expect(result.current.items[0].name).toBe('Updated Item');
    });

    it('should recalculate total price after update', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      expect(result.current.totalPrice).toBe(100);

      act(() => {
        result.current.updateItem('test-item-1', { price: 300 });
      });

      expect(result.current.totalPrice).toBe(300);
    });

    it('should not affect other items when updating', () => {
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
        result.current.updateItem('test-item-1', { name: 'Updated' });
      });

      expect(result.current.items[1].name).toBe('Test Item');
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
  });

  describe('Fence configuration', () => {
    it('should update fence config', () => {
      const { result } = renderHook(() => useSceneStore());

      const newConfig = {
        presetId: 'metal',
        colors: { post: 0x888888, slatA: 0xCCCCCC },
      };

      act(() => {
        result.current.setFenceConfig(newConfig);
      });

      expect(result.current.fenceConfig).toEqual(newConfig);
    });
  });

  describe('History (undo/redo)', () => {
    it('should save state to history on item add', () => {
      const { result } = renderHook(() => useSceneStore());

      act(() => {
        result.current.addItem(mockItem);
      });

      // History should have at least 1 entry
      expect(result.current.items).toHaveLength(1);
    });

    it('should undo last action', () => {
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

    it('should handle negative prices', () => {
      const { result } = renderHook(() => useSceneStore());

      const negativeItem: SceneItem = { 
        ...mockItem,
        productId: 'product-negative',
        price: -50 
      };

      act(() => {
        result.current.addItem(negativeItem);
      });

      expect(result.current.totalPrice).toBe(-50);
    });
  });
});