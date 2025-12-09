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
  useAuthStore: Object.assign(
    vi.fn((selector) => {
      const state = {
        user: null,
        session: null,
        setUser: vi.fn(),
        setSession: vi.fn(),
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        user: null,
        session: null,
        setUser: vi.fn(),
        setSession: vi.fn(),
      }))
    }
  ),
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

  // --------------------------------------------------------------------------
  // LOGIN PAGE INTERACTIONS
  // --------------------------------------------------------------------------
  
  describe('LoginPage Interactions', () => {
    it('should switch to form step when clicking client role', async () => {
      render(createAppAtRoute('/login'));
      
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
      });
    });

    it('should switch to form step when clicking employee role', async () => {
      render(createAppAtRoute('/login'));
      
      const employeeButton = screen.getByText('Soy Empleado');
      employeeButton.click();
      
      await waitFor(() => {
        expect(screen.getByText('Acceso Empleados')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      });
    });

    it('should show registration form when toggling to register', async () => {
      render(createAppAtRoute('/login'));
      
      // Click client role
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        const registerLink = screen.getByText('Regístrate aquí');
        registerLink.click();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Nuevo Registro')).toBeInTheDocument();
        expect(screen.getByText('Crear Cuenta')).toBeInTheDocument();
      });
    });

    it('should go back to role selection when clicking back button', async () => {
      render(createAppAtRoute('/login'));
      
      // Go to form
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      });
      
      // Click back
      const backButton = screen.getByText('← Volver');
      backButton.click();
      
      await waitFor(() => {
        expect(screen.getByText('Bienvenido')).toBeInTheDocument();
        expect(screen.getByText('Soy Cliente')).toBeInTheDocument();
      });
    });

    it('should show loading state when submitting form', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      // Mock delayed response
      (supabase.auth.signInWithPassword as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ 
          data: { user: { id: 'test', email: 'test@test.com' }, session: {} }, 
          error: null 
        }), 100))
      );
      
      render(createAppAtRoute('/login'));
      
      // Go to form
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Email');
        const passwordInput = screen.getByPlaceholderText('Contraseña');
        const submitButton = screen.getByText('Entrar');
        
        // Fill form
        emailInput.setAttribute('value', 'test@example.com');
        passwordInput.setAttribute('value', 'password123');
        
        // Submit
        submitButton.click();
      });
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Procesando...')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should have required attribute on email and password inputs', async () => {
      render(createAppAtRoute('/login'));
      
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Email');
        const passwordInput = screen.getByPlaceholderText('Contraseña');
        
        expect(emailInput).toHaveAttribute('required');
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(passwordInput).toHaveAttribute('required');
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    it('should not show register option for employees', async () => {
      render(createAppAtRoute('/login'));
      
      const employeeButton = screen.getByText('Soy Empleado');
      employeeButton.click();
      
      await waitFor(() => {
        expect(screen.queryByText('Regístrate aquí')).not.toBeInTheDocument();
      });
    });

    it('should toggle between login and register modes', async () => {
      render(createAppAtRoute('/login'));
      
      // Go to client form
      const clientButton = screen.getByText('Soy Cliente');
      clientButton.click();
      
      await waitFor(() => {
        expect(screen.getByText('Entrar')).toBeInTheDocument();
      });
      
      // Toggle to register
      const registerLink = screen.getByText('Regístrate aquí');
      registerLink.click();
      
      await waitFor(() => {
        expect(screen.getByText('Crear Cuenta')).toBeInTheDocument();
      });
      
      // Toggle back to login
      const loginLink = screen.getByText('Inicia Sesión');
      loginLink.click();
      
      await waitFor(() => {
        expect(screen.getByText('Entrar')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // VIEWER PAGE EFFECTS
  // --------------------------------------------------------------------------
  
  describe('ViewerPage Effects', () => {
    it('should render ViewerPage with default state', async () => {
      render(createAppAtRoute('/'));
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-3d')).toBeInTheDocument();
      });
    });

    it('should show login link when no user is authenticated', async () => {
      render(createAppAtRoute('/'));
      
      await waitFor(() => {
        const loginLink = screen.getByText(/Acceso \/ Login/i);
        expect(loginLink).toBeInTheDocument();
        expect(loginLink.getAttribute('href')).toBe('/login');
      });
    });
  });
});
