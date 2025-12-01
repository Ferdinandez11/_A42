import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate } from 'react-router-dom';
import { Editor3D } from './features/editor/Editor3D';
import { useAppStore } from './stores/useAppStore';
import { Catalog } from './features/editor/ui/Catalog';

// --- ESTILOS COMPARTIDOS (DARK MODE) ---

// Estilo "Pastilla" (Botones flotantes y acciones principales)
const badgeStyle: React.CSSProperties = {
  backgroundColor: '#333', // Gris oscuro
  color: 'white',
  padding: '8px 16px',
  borderRadius: '20px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  border: '1px solid #444',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

// Enlaces de navegación
const navLinkStyle: React.CSSProperties = {
  color: '#aaa',
  textDecoration: 'none',
  padding: '8px 12px',
  borderRadius: '6px',
  transition: 'color 0.2s',
  fontSize: '14px'
};

// --- LAYOUTS POR ROL ---

// 1. Layout para EMPLEADOS (Panel Admin - Dark)
const EmployeeLayout = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#121212', color: '#e0e0e0' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', background: '#1e1e1e', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Intranet 🏢</h3>
          <small style={{ color: '#666' }}>Modo Empleado</small>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '15px', gap: '5px' }}>
          <Link to="/admin/crm" style={{ ...navLinkStyle, color: '#fff', background: '#2a2a2a' }}>👥 CRM (Clientes)</Link>
          <Link to="/admin/erp" style={navLinkStyle}>🏭 ERP (Fábrica)</Link>
          <Link to="/admin/purchases" style={navLinkStyle}>🛒 Compras</Link>
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid #333' }}>
          <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '13px' }}>← Volver al Visor 3D</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

// 2. Layout para CLIENTES (Portal - Dark)
const ClientPortalLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#1e1e1e', borderBottom: '1px solid #333', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>Portal del Cliente 👋</h3>
        <nav style={{ display: 'flex', gap: '20px' }}>
          <Link to="/portal/quotes" style={{ color: '#fff', textDecoration: 'none' }}>Mis Presupuestos</Link>
          <Link to="/portal/orders" style={{ color: '#bbb', textDecoration: 'none' }}>Mis Pedidos</Link>
          <Link to="/" style={{ ...badgeStyle, fontSize: '12px', padding: '6px 12px' }}>+ Nuevo Proyecto 3D</Link>
        </nav>
      </header>

      {/* Main Body */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// 3. Página de Login (Simulada - Dark)
const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '3rem', background: '#1e1e1e', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', textAlign: 'center', minWidth: '350px' }}>
        <h2 style={{ marginBottom: '10px' }}>Iniciar Sesión</h2>
        <p style={{ marginBottom: '30px', color: '#888', fontSize: '14px' }}>Selecciona tu perfil para acceder:</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button 
            onClick={() => navigate('/portal')} 
            style={{ ...badgeStyle, justifyContent: 'center', backgroundColor: '#3b82f6', border: 'none', padding: '12px' }}>
            Soy Cliente
          </button>
          
          <button 
            onClick={() => navigate('/admin/crm')} 
            style={{ ...badgeStyle, justifyContent: 'center', backgroundColor: '#10b981', border: 'none', padding: '12px' }}>
            Soy Empleado
          </button>

          <button 
            onClick={() => navigate('/')} 
            style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>
            Cancelar / Volver
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Wrapper del Visor (Página Principal)
const ViewerPage = () => {
  const { mode } = useAppStore();
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', margin: 0, background: '#000' }}>
      
      {/* BOTÓN LOGIN: Arriba Izquierda */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
        <Link to="/login" style={badgeStyle}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>Acceso / Login</span>
        </Link>
      </div>

      <Editor3D />
      {mode === 'catalog' && <Catalog />}
    </div>
  );
};


// --- APP PRINCIPAL ---

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/" element={<ViewerPage />} />

        {/* LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* ZONA EMPLEADOS */}
        <Route path="/admin" element={<EmployeeLayout />}>
          <Route index element={<h2 style={{color:'white'}}>Panel Resumen</h2>} />
          <Route path="crm" element={<h2 style={{color:'white'}}>Módulo CRM</h2>} />
          <Route path="erp" element={<h2 style={{color:'white'}}>Módulo ERP</h2>} />
          <Route path="purchases" element={<h2 style={{color:'white'}}>Módulo Compras</h2>} />
        </Route>

        {/* ZONA CLIENTES */}
        <Route path="/portal" element={<ClientPortalLayout />}>
           <Route index element={<h2 style={{color:'white'}}>Bienvenido a tu área personal</h2>} />
           <Route path="quotes" element={<h2 style={{color:'white'}}>Historial de Presupuestos</h2>} />
           <Route path="orders" element={<h2 style={{color:'white'}}>Seguimiento de Pedidos</h2>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;