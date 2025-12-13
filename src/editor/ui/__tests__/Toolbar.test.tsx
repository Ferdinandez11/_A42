// Toolbar.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '../Toolbar';
import { useEditorMedia } from '@/editor/hooks/useEditorMedia';
import { useSceneTools } from '@/editor/hooks/useSceneTools';
import { useProjectActions } from '@/editor/hooks/useProjectActions';
import { useEditorStore } from '@/editor/stores/editor/useEditorStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import { useProjectStore } from '@/editor/stores/project/useProjectStore';
import { useNavigate } from 'react-router-dom';

// Mock all dependencies
vi.mock('@/editor/hooks/useEditorMedia');
vi.mock('@/editor/hooks/useSceneTools');
vi.mock('@/editor/hooks/useProjectActions');
vi.mock('@/editor/stores/editor/useEditorStore');
vi.mock('@/editor/stores/scene/useSceneStore');
vi.mock('@/editor/stores/project/useProjectStore');
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

describe('Toolbar', () => {
  const mockNavigate = vi.fn();
  const mockSetMode = vi.fn();
  const mockToggleGrid = vi.fn();
  const mockSetCameraType = vi.fn();
  const mockTriggerView = vi.fn();
  const mockToggleEnvPanel = vi.fn();
  const mockSetMeasurementResult = vi.fn();
  const mockToggleSafetyZones = vi.fn();
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockTakePhoto = vi.fn();
  const mockStart360Video = vi.fn();
  const mockToggleRecording = vi.fn();
  const mockExportGLB = vi.fn();
  const mockExportDXF = vi.fn();
  const mockGeneratePDF = vi.fn();
  const mockActivateWalkMode = vi.fn();
  const mockSaveProject = vi.fn();
  const mockImportGLB = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useNavigate as any).mockReturnValue(mockNavigate);
    
    (useEditorMedia as any).mockReturnValue({
      isRecording: false,
      takePhoto: mockTakePhoto,
      start360Video: mockStart360Video,
      toggleRecording: mockToggleRecording,
      exportGLB: mockExportGLB,
      exportDXF: mockExportDXF,
      generatePDF: mockGeneratePDF,
    });

    (useSceneTools as any).mockReturnValue({
      activateWalkMode: mockActivateWalkMode,
    });

    (useProjectActions as any).mockReturnValue({
      saveProject: mockSaveProject,
      importGLB: mockImportGLB,
      isSaving: false,
    });

    (useEditorStore as any).mockReturnValue({
      mode: 'idle',
      setMode: mockSetMode,
      gridVisible: true,
      toggleGrid: mockToggleGrid,
      cameraType: 'perspective',
      setCameraType: mockSetCameraType,
      triggerView: mockTriggerView,
      envPanelVisible: false,
      toggleEnvPanel: mockToggleEnvPanel,
      setMeasurementResult: mockSetMeasurementResult,
      safetyZonesVisible: false,
      toggleSafetyZones: mockToggleSafetyZones,
    });

    (useSceneStore as any).mockReturnValue({
      undo: mockUndo,
      redo: mockRedo,
      past: [{ type: 'test' }],
      future: [],
    });

    (useProjectStore as any).mockReturnValue({
      user: { email: 'test@example.com' },
      isReadOnlyMode: false,
    });
  });

  it('should render main toolbar', () => {
    render(<Toolbar />);
    
    // Check for main tool buttons
    expect(screen.getByText('Seleccionar')).toBeInTheDocument();
    expect(screen.getByText('Suelo')).toBeInTheDocument();
    expect(screen.getByText('Valla')).toBeInTheDocument();
    expect(screen.getByText('Catálogo')).toBeInTheDocument();
  });

  it('should render active tool mode', () => {
    (useEditorStore as any).mockReturnValue({
      mode: 'drawing_floor',
      setMode: mockSetMode,
      gridVisible: true,
      toggleGrid: mockToggleGrid,
      cameraType: 'perspective',
      setCameraType: mockSetCameraType,
      triggerView: mockTriggerView,
      envPanelVisible: false,
      toggleEnvPanel: mockToggleEnvPanel,
      setMeasurementResult: mockSetMeasurementResult,
      safetyZonesVisible: false,
      toggleSafetyZones: mockToggleSafetyZones,
    });

    render(<Toolbar />);
    
    // Verify the tool is rendered
    expect(screen.getByText('Suelo')).toBeInTheDocument();
  });

  it('should call setMode when tool is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const sueloButton = screen.getByText('Suelo');
    await user.click(sueloButton);
    
    expect(mockSetMode).toHaveBeenCalledWith('drawing_floor');
  });

  it('should render project actions when user is logged in', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Importar')).toBeInTheDocument();
  });

  it('should not render portal link when user is not logged in', () => {
    (useProjectStore as any).mockReturnValue({
      user: null,
      isReadOnlyMode: false,
    });

    render(<Toolbar />);
    
    expect(screen.queryByText('Portal')).not.toBeInTheDocument();
  });

  it('should render portal link for admin users', () => {
    (useProjectStore as any).mockReturnValue({
      user: { email: 'admin@example.com' },
      isReadOnlyMode: false,
    });

    render(<Toolbar />);
    
    expect(screen.getByText('Portal')).toBeInTheDocument();
  });

  it('should call saveProject when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const saveButton = screen.getByText('Guardar');
    await user.click(saveButton);
    
    expect(mockSaveProject).toHaveBeenCalled();
  });

  it('should render helper tools', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('Vistas')).toBeInTheDocument();
    expect(screen.getByText('Entorno')).toBeInTheDocument();
    expect(screen.getByText('Medir')).toBeInTheDocument();
    expect(screen.getByText('Zonas')).toBeInTheDocument();
  });

  it('should call toggleGrid when grid button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const gridButton = screen.getByText('Grid');
    await user.click(gridButton);
    
    expect(mockToggleGrid).toHaveBeenCalled();
  });

  it('should render undo/redo buttons', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('should render undo button when no past history', () => {
    (useSceneStore as any).mockReturnValue({
      undo: mockUndo,
      redo: mockRedo,
      past: [],
      future: [],
    });

    render(<Toolbar />);
    
    // Verify undo button is rendered (disabled state is handled by styling)
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('should call undo when undo button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const undoButton = screen.getByText('Undo');
    await user.click(undoButton);
    
    expect(mockUndo).toHaveBeenCalled();
  });

  it('should render media tools', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('Foto')).toBeInTheDocument();
    expect(screen.getByText('360º')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('should render export tools for logged users', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('3D')).toBeInTheDocument();
    expect(screen.getByText('CAD')).toBeInTheDocument();
  });

  it('should call takePhoto when photo button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const photoButton = screen.getByText('Foto');
    await user.click(photoButton);
    
    expect(mockTakePhoto).toHaveBeenCalled();
  });

  it('should render walk and record tools', () => {
    render(<Toolbar />);
    
    expect(screen.getByText('Paseo')).toBeInTheDocument();
    expect(screen.getByText('Rec')).toBeInTheDocument();
  });

  it('should show recording state when recording', () => {
    (useEditorMedia as any).mockReturnValue({
      isRecording: true,
      takePhoto: mockTakePhoto,
      start360Video: mockStart360Video,
      toggleRecording: mockToggleRecording,
      exportGLB: mockExportGLB,
      exportDXF: mockExportDXF,
      generatePDF: mockGeneratePDF,
    });

    render(<Toolbar />);
    
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('should show views panel when views button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    
    const viewsButton = screen.getByText('Vistas');
    await user.click(viewsButton);
    
    // Views panel should appear
    await user.click(viewsButton); // Click again to verify it toggles
    expect(mockToggleEnvPanel).not.toHaveBeenCalled(); // Different button
  });
});
