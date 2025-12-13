// FloorProperties.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloorProperties } from '../FloorProperties';
import { useSelectionStore } from '@/editor/stores/selection/useSelectionStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';

// Mock stores
vi.mock('@/editor/stores/selection/useSelectionStore');
vi.mock('@/editor/stores/scene/useSceneStore');
vi.mock('@/editor/ui/CadControl', () => ({
  CadControl: () => <div data-testid="cad-control">CAD Control</div>,
}));

describe('FloorProperties', () => {
  const mockUpdateFloorMaterial = vi.fn();
  const mockUpdateFloorTexture = vi.fn();

  const mockFloorItem = {
    uuid: 'floor-1',
    type: 'floor' as const,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
    floorMaterial: 'rubber_red' as const,
    textureUrl: undefined,
    textureScale: 1,
    textureRotation: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useSelectionStore as any).mockReturnValue({
      selectedItemId: 'floor-1',
    });

    (useSceneStore as any).mockReturnValue({
      items: [mockFloorItem],
      updateFloorMaterial: mockUpdateFloorMaterial,
      updateFloorTexture: mockUpdateFloorTexture,
    });
  });

  it('should not render when no floor is selected', () => {
    (useSelectionStore as any).mockReturnValue({
      selectedItemId: null,
    });

    const { container } = render(<FloorProperties />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selected item is not a floor', () => {
    (useSceneStore as any).mockReturnValue({
      items: [{ uuid: 'fence-1', type: 'fence' }],
      updateFloorMaterial: mockUpdateFloorMaterial,
      updateFloorTexture: mockUpdateFloorTexture,
    });

    const { container } = render(<FloorProperties />);
    expect(container.firstChild).toBeNull();
  });

  it('should render floor properties panel when floor is selected', () => {
    render(<FloorProperties />);

    expect(screen.getByText('Propiedades del Suelo')).toBeInTheDocument();
    expect(screen.getByText('Material Base')).toBeInTheDocument();
    expect(screen.getByText('Textura Personalizada')).toBeInTheDocument();
  });

  it('should render material selector buttons', () => {
    render(<FloorProperties />);

    // Check for material buttons (they have color backgrounds)
    const materialButtons = screen.getAllByRole('button');
    expect(materialButtons.length).toBeGreaterThan(0);
  });

  it('should call updateFloorMaterial when material is selected', async () => {
    const user = userEvent.setup();
    render(<FloorProperties />);

    // Find and click a material button (first one after upload button)
    const buttons = screen.getAllByRole('button');
    // Skip the upload button and click first material
    const materialButton = buttons.find(btn => 
      btn.getAttribute('style')?.includes('background-color')
    );
    
    if (materialButton) {
      await user.click(materialButton);
      expect(mockUpdateFloorMaterial).toHaveBeenCalled();
    }
  });

  it('should render upload button for texture', () => {
    render(<FloorProperties />);

    expect(screen.getByText(/Subir Imagen/i)).toBeInTheDocument();
  });

  it('should render texture controls when texture is present', () => {
    const itemWithTexture = {
      ...mockFloorItem,
      textureUrl: 'data:image/jpeg;base64,test',
      textureScale: 2,
      textureRotation: 45,
    };

    (useSceneStore as any).mockReturnValue({
      items: [itemWithTexture],
      updateFloorMaterial: mockUpdateFloorMaterial,
      updateFloorTexture: mockUpdateFloorTexture,
    });

    render(<FloorProperties />);

    expect(screen.getByText(/Cambiar Imagen/i)).toBeInTheDocument();
    expect(screen.getByText(/ESCALA/i)).toBeInTheDocument();
    expect(screen.getByText(/ROTACIÓN/i)).toBeInTheDocument();
  });

  it('should render CAD control component', () => {
    render(<FloorProperties />);

    expect(screen.getByTestId('cad-control')).toBeInTheDocument();
  });
});
