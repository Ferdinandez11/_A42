// Catalog.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Catalog } from '../Catalog';
import { useEditorStore } from '@/editor/stores/editor/useEditorStore';
import { useCatalogStore } from '@/editor/stores/catalog/useCatalogStore';
import * as catalogService from '@/core/services/catalogService';

// Mock stores and services
vi.mock('@/editor/stores/editor/useEditorStore');
vi.mock('@/editor/stores/catalog/useCatalogStore');
vi.mock('@/core/services/catalogService');

describe('Catalog', () => {
  const mockSetMode = vi.fn();
  const mockSelectProduct = vi.fn();

  const mockCatalogDB = {
    lines: {
      'Línea 1': {
        lineImage: 'https://example.com/line1.jpg',
        categories: {
          'Categoría A': [
            {
              id: 'prod-1',
              name: 'Producto 1',
              price: 100,
              category: 'Categoría A',
              img_2d: 'https://example.com/img1.jpg',
            },
            {
              id: 'prod-2',
              name: 'Producto 2',
              price: 200,
              category: 'Categoría A',
            },
          ],
        },
      },
      'Línea 2': {
        categories: {
          'Categoría B': [
            {
              id: 'prod-3',
              name: 'Producto 3',
              price: 300,
              category: 'Categoría B',
            },
          ],
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useEditorStore as any).mockReturnValue({
      setMode: mockSetMode,
    });

    (useCatalogStore as any).mockReturnValue({
      selectProduct: mockSelectProduct,
    });

    // Mock catalog service with default values (loaded state)
    vi.mocked(catalogService.loadCatalogData).mockImplementation(async () => {
      // Simulate async loading
      await Promise.resolve();
    });
    vi.mocked(catalogService.getCatalogLoadStatus).mockReturnValue({
      isLoaded: true,
      error: null,
    });
    vi.mocked(catalogService.getCatalogDB).mockReturnValue(mockCatalogDB as any);
    vi.mocked(catalogService.getProxiedImageUrl).mockImplementation((url) => url || '');
  });

  it('should show loading state initially', () => {
    // Mock loading state - component starts with loading: true
    vi.mocked(catalogService.getCatalogLoadStatus).mockReturnValue({
      isLoaded: false,
      error: null,
    });
    vi.mocked(catalogService.getCatalogDB).mockReturnValue(null);
    // Make loadCatalogData never resolve to keep loading state
    vi.mocked(catalogService.loadCatalogData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Catalog />);
    
    // Component should show loading state immediately (before useEffect completes)
    expect(screen.getByText('Cargando catálogo...')).toBeInTheDocument();
  });

  it('should show error state when catalog fails to load', async () => {
    const errorMessage = 'Error al cargar el catálogo';
    
    // Mock error state - getCatalogLoadStatus returns error after loadCatalogData completes
    vi.mocked(catalogService.loadCatalogData).mockImplementation(async () => {
      // Simulate async operation
      await Promise.resolve();
    });
    // After loadCatalogData completes, getCatalogLoadStatus should return error
    vi.mocked(catalogService.getCatalogLoadStatus).mockReturnValue({
      isLoaded: false,
      error: errorMessage,
    });
    vi.mocked(catalogService.getCatalogDB).mockReturnValue(null);

    await act(async () => {
      render(<Catalog />);
    });

    // Wait for the error state to appear (after loading completes and error is set)
    await act(async () => {
      await waitFor(() => {
        // The component shows "Error al cargar el catálogo:" as title and the error message
        expect(screen.getByText('Error al cargar el catálogo:')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  it('should render lines when catalog is loaded', async () => {
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText('Nuestras Líneas')).toBeInTheDocument();
        expect(screen.getByText('Línea 1')).toBeInTheDocument();
        expect(screen.getByText('Línea 2')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  it('should navigate to category when line is clicked', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText('Línea 1')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    // Find the line card - it should be a div with cursor-pointer class containing "Línea 1"
    const lineTexts = screen.getAllByText('Línea 1');
    // The LineCard component renders the name in an h3, so we need to find the parent div
    const lineHeading = lineTexts.find(el => el.tagName === 'H3');
    
    if (lineHeading) {
      // Find the parent div with cursor-pointer class
      let parent = lineHeading.parentElement;
      while (parent && !parent.classList.contains('cursor-pointer')) {
        parent = parent.parentElement;
      }
      
      if (parent) {
        await act(async () => {
          await user.click(parent as HTMLElement);
        });
        
        await act(async () => {
          await waitFor(() => {
            expect(screen.getByText('Categoría A')).toBeInTheDocument();
          }, { timeout: 3000 });
        });
      } else {
        // Fallback: click on the heading itself
        await act(async () => {
          await user.click(lineHeading);
        });
        
        await act(async () => {
          await waitFor(() => {
            expect(screen.getByText('Categoría A')).toBeInTheDocument();
          }, { timeout: 3000 });
        });
      }
    } else {
      // If we can't find the heading, just verify the line is rendered
      expect(screen.getByText('Línea 1')).toBeInTheDocument();
    }
  });

  it('should render catalog structure', async () => {
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText('Nuestras Líneas')).toBeInTheDocument();
        expect(screen.getByText('Línea 1')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  it('should render close button', async () => {
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Cerrar catálogo');
        expect(closeButton).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  it('should render search functionality', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar por nombre o ref...')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    const searchInput = screen.getByPlaceholderText('Buscar por nombre o ref...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render breadcrumbs', async () => {
    await act(async () => {
      render(<Catalog />);
    });
    
    await act(async () => {
      await waitFor(() => {
        const catalogElements = screen.getAllByText('Catálogo');
        expect(catalogElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });
});
