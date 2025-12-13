// FenceProperties.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FenceProperties } from '../FenceProperties';
import { useSelectionStore } from '@/editor/stores/selection/useSelectionStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import { FENCE_PRESETS } from '@/editor/data/fence_presets';

// Mock stores
vi.mock('@/editor/stores/selection/useSelectionStore');
vi.mock('@/editor/stores/scene/useSceneStore');
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
    
    (useSelectionStore as any).mockReturnValue({
      selectedItemId: 'fence-1',
    });

    (useSceneStore as any).mockReturnValue({
      items: [mockFenceItem],
      updateItemFenceConfig: mockUpdateItemFenceConfig,
    });
  });

  it('should not render when no fence is selected', () => {
    (useSelectionStore as any).mockReturnValue({
      selectedItemId: null,
    });

    const { container } = render(<FenceProperties />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selected item is not a fence', () => {
    (useSceneStore as any).mockReturnValue({
      items: [{ uuid: 'floor-1', type: 'floor' }],
      updateItemFenceConfig: mockUpdateItemFenceConfig,
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

    // Click on a different preset
    const metalPreset = screen.getByText(FENCE_PRESETS.metal.name);
    await user.click(metalPreset);

    expect(mockUpdateItemFenceConfig).toHaveBeenCalledWith(
      'fence-1',
      expect.objectContaining({
        presetId: 'metal',
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
        presetId: 'multi_wood',
        colors: {
          post: 0x8b4513,
          slatA: 0x654321,
          slatB: 0x543210,
          slatC: 0x432109,
        },
      },
    };

    (useSceneStore as any).mockReturnValue({
      items: [multiColorItem],
      updateItemFenceConfig: mockUpdateItemFenceConfig,
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
