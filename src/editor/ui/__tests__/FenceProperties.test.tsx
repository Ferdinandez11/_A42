// FenceProperties.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FenceProperties } from '../FenceProperties';
import { useSelectionStore } from '@/editor/stores/selection/useSelectionStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import { FENCE_PRESETS } from '@/editor/data/fence_presets';

// Mock stores
vi.mock('@/editor/stores/selection/useSelectionStore', () => ({
  useSelectionStore: vi.fn((selector) => {
    const state = {
      selectedItemId: 'fence-1',
    };
    return selector(state);
  }),
}));

vi.mock('@/editor/stores/scene/useSceneStore', () => ({
  useSceneStore: vi.fn((selector) => {
    const state = {
      items: [{
        uuid: 'fence-1',
        type: 'fence' as const,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        fenceConfig: {
          presetId: 'wood',
          colors: {
            post: 0x8b4513,
            slatA: 0x654321,
          },
        },
      }],
      updateItemFenceConfig: mockUpdateItemFenceConfig,
    };
    return selector(state);
  }),
}));
vi.mock('@/editor/ui/CadControl', () => ({
  CadControl: () => <div data-testid="cad-control">CAD Control</div>,
}));

describe('FenceProperties', () => {
  const mockUpdateItemFenceConfig = vi.fn();

  const mockFenceItem = {
    uuid: 'fence-1',
    type: 'fence' as const,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
    fenceConfig: {
      presetId: 'wood',
      colors: {
        post: 0x8b4513,
        slatA: 0x654321,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks
    (useSelectionStore as any).mockImplementation((selector: any) => {
      const state = {
        selectedItemId: 'fence-1',
      };
      return selector(state);
    });

    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        items: [mockFenceItem],
        updateItemFenceConfig: mockUpdateItemFenceConfig,
      };
      return selector(state);
    });
  });

  it('should not render when no fence is selected', () => {
    (useSelectionStore as any).mockImplementation((selector: any) => {
      const state = {
        selectedItemId: null,
      };
      return selector(state);
    });

    const { container } = render(<FenceProperties />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selected item is not a fence', () => {
    (useSelectionStore as any).mockImplementation((selector: any) => {
      const state = {
        selectedItemId: 'floor-1',
      };
      return selector(state);
    });

    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        items: [{ uuid: 'floor-1', type: 'floor' }],
        updateItemFenceConfig: mockUpdateItemFenceConfig,
      };
      return selector(state);
    });

    const { container } = render(<FenceProperties />);
    expect(container.firstChild).toBeNull();
  });

  it('should render fence properties panel when fence is selected', () => {
    render(<FenceProperties />);

    expect(screen.getByText('Editar Valla')).toBeInTheDocument();
    expect(screen.getByText('Modelo')).toBeInTheDocument();
    expect(screen.getByText('Personalización')).toBeInTheDocument();
  });

  it('should render preset selector buttons', () => {
    render(<FenceProperties />);

    // Check that preset buttons are rendered
    const presetButtons = screen.getAllByRole('button');
    const presetNames = Object.values(FENCE_PRESETS).map(p => p.name);
    
    presetNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('should render selected preset', () => {
    render(<FenceProperties />);

    // The wood preset should be rendered (from mockFenceItem)
    const woodButton = screen.getByText(FENCE_PRESETS.wood.name);
    expect(woodButton).toBeInTheDocument();
  });

  it('should call updateItemFenceConfig when preset is changed', async () => {
    const user = userEvent.setup();
    render(<FenceProperties />);

    // Click on a different preset (metal_slats instead of metal)
    const metalPreset = screen.getByText(FENCE_PRESETS.metal_slats.name);
    await user.click(metalPreset);

    expect(mockUpdateItemFenceConfig).toHaveBeenCalledWith(
      'fence-1',
      expect.objectContaining({
        presetId: 'metal_slats',
      })
    );
  });

  it('should render color controls', () => {
    render(<FenceProperties />);

    expect(screen.getByText('Postes / Estructura')).toBeInTheDocument();
    expect(screen.getByText('Lamas Principales')).toBeInTheDocument();
  });

  it('should render additional color controls for multi-color presets', () => {
    const multiColorItem = {
      ...mockFenceItem,
      fenceConfig: {
        presetId: 'metal_slats', // Use a preset that actually has multiColor: true
        colors: {
          post: 0x1a1a1a,
          slatA: 0xcccccc,
          slatB: 0x888888,
          slatC: 0x444444,
        },
      },
    };

    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        items: [multiColorItem],
        updateItemFenceConfig: mockUpdateItemFenceConfig,
      };
      return selector(state);
    });

    render(<FenceProperties />);

    expect(screen.getByText('Lamas Secundarias')).toBeInTheDocument();
    expect(screen.getByText('Lamas Terciarias')).toBeInTheDocument();
  });

  it('should render CAD control component', () => {
    render(<FenceProperties />);

    expect(screen.getByTestId('cad-control')).toBeInTheDocument();
  });

  it('should render help text', () => {
    render(<FenceProperties />);

    expect(screen.getByText(/Clic Izq: Dibujar • Clic Dcho: Terminar/i)).toBeInTheDocument();
  });
});
