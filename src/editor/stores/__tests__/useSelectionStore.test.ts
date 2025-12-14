// useSelectionStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSelectionStore } from '../selection/useSelectionStore';
import { useSceneStore } from '../scene/useSceneStore';
import { useProjectStore } from '../project/useProjectStore';
import { editorErrorHandler } from '@/editor/services/EditorErrorHandler';

// Mock stores
vi.mock('../scene/useSceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      items: [
        { uuid: 'item-1', position: [0, 0, 0] },
        { uuid: 'item-2', position: [1, 0, 1] },
      ],
      addItem: vi.fn(),
      removeItem: vi.fn(),
    })),
  },
}));

vi.mock('../project/useProjectStore', () => ({
  useProjectStore: {
    getState: vi.fn(() => ({
      isReadOnlyMode: false,
    })),
  },
}));

vi.mock('@/editor/services/EditorErrorHandler', () => ({
  editorErrorHandler: {
    handleError: vi.fn(),
    createError: vi.fn((type, message, options) => ({
      type,
      message,
      ...options,
    })),
  },
}));

describe('useSelectionStore', () => {
  beforeEach(() => {
    // Reset store
    useSelectionStore.setState({
      selectedItemId: null,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    });
    
    vi.clearAllMocks();
  });

  describe('selectItem', () => {
    it('should select an item by UUID', () => {
      useSelectionStore.getState().selectItem('item-1');
      expect(useSelectionStore.getState().selectedItemId).toBe('item-1');
      expect(useSelectionStore.getState().selectedVertices).toEqual([]);
      expect(useSelectionStore.getState().measuredDistance).toBeNull();
    });

    it('should clear selection when set to null', () => {
      useSelectionStore.getState().selectItem('item-1');
      useSelectionStore.getState().selectItem(null);
      expect(useSelectionStore.getState().selectedItemId).toBeNull();
    });
  });

  describe('clearSelection', () => {
    it('should clear all selection state', () => {
      useSelectionStore.getState().selectItem('item-1');
      useSelectionStore.getState().setSelectedVertices([0, 1], 10, 45);
      
      useSelectionStore.getState().clearSelection();
      
      expect(useSelectionStore.getState().selectedItemId).toBeNull();
      expect(useSelectionStore.getState().selectedVertices).toEqual([]);
      expect(useSelectionStore.getState().measuredDistance).toBeNull();
      expect(useSelectionStore.getState().measuredAngle).toBeNull();
    });
  });

  describe('setSelectedVertices', () => {
    it('should set selected vertices with measurements', () => {
      useSelectionStore.getState().setSelectedVertices([0, 1, 2], 15.5, 90);
      
      expect(useSelectionStore.getState().selectedVertices).toEqual([0, 1, 2]);
      expect(useSelectionStore.getState().measuredDistance).toBe(15.5);
      expect(useSelectionStore.getState().measuredAngle).toBe(90);
    });

    it('should clear measurements when set to null', () => {
      useSelectionStore.getState().setSelectedVertices([0], 10, 45);
      useSelectionStore.getState().setSelectedVertices([], null, null);
      
      expect(useSelectionStore.getState().measuredDistance).toBeNull();
      expect(useSelectionStore.getState().measuredAngle).toBeNull();
    });
  });

  describe('duplicateSelection', () => {
    it('should duplicate selected item', () => {
      const sceneStore = useSceneStore.getState();
      useSelectionStore.getState().selectItem('item-1');
      
      useSelectionStore.getState().duplicateSelection();
      
      expect(sceneStore.addItem).toHaveBeenCalled();
      expect(useSelectionStore.getState().selectedItemId).not.toBe('item-1');
    });

    it('should not duplicate in read-only mode', () => {
      vi.mocked(useProjectStore.getState).mockReturnValue({
        isReadOnlyMode: true,
      } as any);
      
      useSelectionStore.getState().selectItem('item-1');
      useSelectionStore.getState().duplicateSelection();
      
      expect(editorErrorHandler.handleError).toHaveBeenCalled();
      expect(useSceneStore.getState().addItem).not.toHaveBeenCalled();
    });

    it('should not duplicate when no item is selected', () => {
      useSelectionStore.getState().duplicateSelection();
      expect(useSceneStore.getState().addItem).not.toHaveBeenCalled();
    });
  });

  describe('removeSelection', () => {
    it('should remove selected item', () => {
      const sceneStore = useSceneStore.getState();
      useSelectionStore.getState().selectItem('item-1');
      
      useSelectionStore.getState().removeSelection();
      
      expect(sceneStore.removeItem).toHaveBeenCalledWith('item-1');
      expect(useSelectionStore.getState().selectedItemId).toBeNull();
    });

    it('should not remove in read-only mode', () => {
      vi.mocked(useProjectStore.getState).mockReturnValue({
        isReadOnlyMode: true,
      } as any);
      
      useSelectionStore.getState().selectItem('item-1');
      useSelectionStore.getState().removeSelection();
      
      expect(editorErrorHandler.handleError).toHaveBeenCalled();
      expect(useSceneStore.getState().removeItem).not.toHaveBeenCalled();
    });

    it('should not remove when no item is selected', () => {
      useSelectionStore.getState().removeSelection();
      expect(useSceneStore.getState().removeItem).not.toHaveBeenCalled();
    });
  });
});

