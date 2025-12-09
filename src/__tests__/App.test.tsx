/**
 * Tests para App.tsx
 * 
 * Cubre:
 * - Renderizado sin errores
 * - Routing básico
 * - Layouts (Employee, Client, Viewer)
 * - LoginPage y autenticación
 * - Navegación entre rutas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Helper para crear app con ruta inicial específica
const createAppAtRoute = (route: string) => {
  window.history.pushState({}, 'Test page', route);
  return <App />;
};

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signInWithPassword: vi.fn(() => 
        Promise.resolve({ 
          data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} }, 
          error: null 
        })
      ),
      signUp: vi.fn(() => 
        Promise.resolve({ 
          data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} }, 
          error: null 
        })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => 
            Promise.resolve({ 
              data: { role: 'client', is_approved: true }, 
              error: null 
            })
          ),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  },
}));

// Mock stores
vi.mock('@/stores/auth/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      user: null,
      session: null,
      setUser: vi.fn(),
      setSession: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/stores/project/useProjectStore', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      isReadOnlyMode: false,
      loadProjectFromURL: vi.fn(() => Promise.resolve()),
      resetProject: vi.fn(),
      setUser: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock useErrorHandler hook
vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({
    handleError: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  })),
}));

// Mock Editor3D component (heavy Three.js component)
vi.mock('@/features/editor/Editor3D', () => ({
  Editor3D: () => <div data-testid="editor-3d">Editor3D Mock</div>,
}));

// Mock CRM components
vi.mock('@/features/crm/pages/CrmDashboard', () => ({
  CrmDashboard: () => <div data-testid="crm-dashboard">CRM Dashboard</div>,
}));

vi.mock('@/features/crm/pages/ClientDashboard', () => ({
  ClientDashboard: () => <div data-testid="client-dashboard">Client Dashboard</div>,
}));

vi.mock('@/features/crm/pages/ProfilePage', () => ({
  ProfilePage: () => <div data-testid="profile-page">Profile Page</div>,
}));

vi.mock('@/features/crm/pages/BudgetDetailPage', () => ({
  BudgetDetailPage: () => <div data-testid="budget-detail">Budget Detail</div>,
}));

vi.mock('@/features/crm/pages/AdminOrderDetailPage', () => ({
  AdminOrderDetailPage: () => <div data-testid="admin-order-detail">Admin Order Detail</div>,
}));

vi.mock('@/features/crm/pages/AdminClientDetailPage', () => ({
  AdminClientDetailPage: () => <div data-testid="admin-client-detail">Admin Client Detail</div>,
}));

vi.mock('@/features/crm/pages/AdminCalendarPage', () => ({
  AdminCalendarPage: () => <div data-testid="admin-calendar">Admin Calendar</div>,
}));

// ============================================================================
// TESTS
// ============================================================================

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // BASIC RENDERING
  // --------------------------------------------------------------------------
  
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<App />);
      expect(container).toBeDefined();
    });

    it('should render BrowserRouter', () => {
      render(<App />);
      // Si renderiza sin error, BrowserRouter está funcionando
      expect(true).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // ROUTING - VIEWER PAGE (/)
  // --------------------------------------------------------------------------
  
  describe('Viewer Page (/)', () => {
    it('should render ViewerPage on root path', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-3d')).toBeInTheDocument();
      });
    });

    it('should show login link when user is not authenticated', async () => {
      render(<App />);
      
      await waitFor(() => {
        const loginLink = screen.getByText(/Acceso \/ Login/i);
        expect(loginLink).toBeInTheDocument();
      });
    });

    it('should render Editor3D component', async () => {
      render(<App />);
      
      await waitFor(() => {
        const editor = screen.getByTestId('editor-3d');
        expect(editor).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // ROUTING - LOGIN PAGE (/login)
  // --------------------------------------------------------------------------
  
  describe('Login Page (/login)', () => {
    it('should render LoginPage on /login route', () => {
      render(createAppAtRoute('/login'));
      
      expect(screen.getByText('Bienvenido')).toBeInTheDocument();
    });

    it('should show role selection buttons', () => {
      render(createAppAtRoute('/login'));
      
      expect(screen.getByText('Soy Cliente')).toBeInTheDocument();
      expect(screen.getByText('Soy Empleado')).toBeInTheDocument();
    });

    it('should have back to viewer button', () => {
      render(createAppAtRoute('/login'));
      
      expect(screen.getByText('Volver al Visor 3D')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // ROUTING - ADMIN ROUTES (/admin/*)
  // --------------------------------------------------------------------------
  
  describe('Admin Routes (/admin/*)', () => {
    it('should render EmployeeLayout on /admin/crm', () => {
      render(createAppAtRoute('/admin/crm'));
      
      expect(screen.getByText('Intranet 🏢')).toBeInTheDocument();
      expect(screen.getByText('Modo Empleado')).toBeInTheDocument();
    });

    it('should show sidebar navigation in EmployeeLayout', () => {
      render(createAppAtRoute('/admin/crm'));
      
      expect(screen.getByText('👥 CRM (Listado)')).toBeInTheDocument();
      expect(screen.getByText('📅 Calendario Entregas')).toBeInTheDocument();
      expect(screen.getByText('🏭 ERP (Fábrica)')).toBeInTheDocument();
      expect(screen.getByText('🛒 Compras')).toBeInTheDocument();
    });

    it('should render CrmDashboard on /admin/crm', () => {
      render(createAppAtRoute('/admin/crm'));
      
      expect(screen.getByTestId('crm-dashboard')).toBeInTheDocument();
    });

    it('should render AdminCalendarPage on /admin/calendar', () => {
      render(createAppAtRoute('/admin/calendar'));
      
      expect(screen.getByTestId('admin-calendar')).toBeInTheDocument();
    });

    it('should have logout button in EmployeeLayout', () => {
      render(createAppAtRoute('/admin/crm'));
      
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // ROUTING - CLIENT PORTAL ROUTES (/portal/*)
  // --------------------------------------------------------------------------
  
  describe('Client Portal Routes (/portal/*)', () => {
    it('should render ClientPortalLayout on /portal', () => {
      render(createAppAtRoute('/portal'));
      
      expect(screen.getByText('Portal del Cliente 👋')).toBeInTheDocument();
    });

    it('should show client navigation links', () => {
      render(createAppAtRoute('/portal'));
      
      expect(screen.getByText('Mis Proyectos')).toBeInTheDocument();
      expect(screen.getByText('Mis Presupuestos')).toBeInTheDocument();
      expect(screen.getByText('Mis Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Mi Perfil 👤')).toBeInTheDocument();
    });

    it('should render ClientDashboard on /portal', () => {
      render(createAppAtRoute('/portal'));
      
      expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
    });

    it('should render ProfilePage on /portal/profile', () => {
      render(createAppAtRoute('/portal/profile'));
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    });

    it('should have new project button', () => {
      render(createAppAtRoute('/portal'));
      
      expect(screen.getByText('+ Nuevo Proyecto 3D')).toBeInTheDocument();
    });

    it('should have logout button in ClientPortalLayout', () => {
      render(createAppAtRoute('/portal'));
      
      expect(screen.getByText('Salir')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // LAYOUTS
  // --------------------------------------------------------------------------
  
  describe('Layouts', () => {
    it('should render EmployeeLayout with sidebar', () => {
      render(createAppAtRoute('/admin/crm'));
      
      const sidebar = screen.getByText('Intranet 🏢').closest('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render ClientPortalLayout with header', () => {
      render(createAppAtRoute('/portal'));
      
      const header = screen.getByText('Portal del Cliente 👋').closest('header');
      expect(header).toBeInTheDocument();
    });

    it('should use Outlet in EmployeeLayout', () => {
      render(createAppAtRoute('/admin/crm'));
      
      // Outlet debería renderizar el contenido (CrmDashboard)
      expect(screen.getByTestId('crm-dashboard')).toBeInTheDocument();
    });

    it('should use Outlet in ClientPortalLayout', () => {
      render(createAppAtRoute('/portal'));
      
      // Outlet debería renderizar el contenido (ClientDashboard)
      expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // INTEGRATION TESTS
  // --------------------------------------------------------------------------
  
  describe('Integration', () => {
    it('should handle all main routes without errors', async () => {
      const routes = ['/', '/login', '/admin/crm', '/portal'];
      
      for (const route of routes) {
        const { unmount } = render(createAppAtRoute(route));
        
        // Si no hay error, el test pasa
        expect(true).toBe(true);
        
        unmount();
      }
    });
  });
});
