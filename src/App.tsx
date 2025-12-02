import React from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// --- IMPORTS ---
import { Editor3D } from './features/editor/Editor3D';
import { Catalog } from './features/editor/ui/Catalog';
import { useAppStore } from './stores/useAppStore';
import { CrmDashboard } from './features/crm/pages/CrmDashboard';
import { ClientDashboard } from './features/crm/pages/ClientDashboard';
import { ProfilePage } from './features/crm/pages/ProfilePage';
import { BudgetDetailPage } from './features/crm/pages/BudgetDetailPage';
import { AdminOrderDetailPage } from './features/crm/pages/AdminOrderDetailPage'; 

// --- ESTILOS ---
const badgeStyle: React.CSSProperties = {
  backgroundColor: '#333', color: 'white', padding: '8px 16px', borderRadius: '20px',
  textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #444', cursor: 'pointer', transition: 'all 0.2s ease'
};
const navLinkStyle: React.CSSProperties = {
  color: '#aaa', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px', transition: 'color 0.2s', fontSize: '14px', display: 'block'
};

// --- FUNCIÓN DE LOGOUT (EFECTO F5) ---
const performLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/"; 
};

// --- LAYOUTS (Mantenidos Iguales) ---
// ... EmployeeLayout y ClientPortalLayout sin cambios ...
const EmployeeLayout = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#121212', color: '#e0e0e0' }}>
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
        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid #333', display:'flex', flexDirection:'column', gap:'10px' }}>
          <button onClick={performLogout} style={{background:'transparent', border:'none', color:'#e74c3c', cursor:'pointer', textAlign:'left', padding:0}}>Cerrar Sesión</button>
          <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '13px' }}>← Volver al Visor 3D</Link>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}><Outlet /></main>
    </div>
  );
};

const ClientPortalLayout = () => {
  return (
    // 1. Contenedor principal fijo al 100% de la altura de la pantalla
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#121212', 
      color: '#e0e0e0', 
      fontFamily: 'sans-serif',
      overflow: 'hidden' // Evita doble scroll en algunos navegadores
    }}>
      
      {/* HEADER (Se queda fijo arriba) */}
      <header style={{ 
        background: '#1e1e1e', 
        borderBottom: '1px solid #333', 
        padding: '15px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0 // Evita que el header se aplaste
      }}>
        <h3 style={{ margin: 0, color: '#fff' }}>Portal del Cliente 👋</h3>
        <nav style={{ display: 'flex', gap: '20px', alignItems:'center' }}>
           <Link to="/portal?tab=projects" style={{ color: '#fff', textDecoration: 'none' }}>Mis Proyectos</Link>
            {/* Cambio de ruta y nombre */}
            <Link to="/portal?tab=budgets" style={{ color: '#bbb', textDecoration: 'none' }}>Mis Presupuestos</Link>
            {/* Nuevo enlace */}
            <Link to="/portal?tab=orders" style={{ color: '#bbb', textDecoration: 'none' }}>Mis Pedidos</Link>
          <Link to="/portal/profile" style={{ color: '#bbb', textDecoration: 'none' }}>Mi Perfil 👤</Link>
          <Link to="/" style={{ ...badgeStyle, fontSize: '12px', padding: '6px 12px' }}>+ Nuevo Proyecto 3D</Link>
          <button onClick={performLogout} style={{background:'none', border:'none', color:'#666', cursor:'pointer'}}>Salir</button>
        </nav>
      </header>

      {/* MAIN (Esta es la parte que hará SCROLL) */}
      <main style={{ 
        flex: 1,            // Ocupa el resto del espacio
        overflowY: 'auto',  // Activa el scroll vertical aquí
        padding: '40px' 
      }}>
        {/* Contenedor para centrar y limitar ancho */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

// 3. PÁGINA DE LOGIN (Mantenida Igual)
const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<'selection' | 'form'>('selection');
  const [targetRole, setTargetRole] = React.useState<'client' | 'employee'>('client');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const selectRole = (role: 'client' | 'employee') => { setTargetRole(role); setStep('form'); setErrorMsg(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo obtener el usuario.");

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
      const userRole = profile?.role || 'client';

      if (targetRole === 'employee') {
        if (userRole === 'admin' || userRole === 'employee') navigate('/admin/crm');
        else { await supabase.auth.signOut(); throw new Error("⛔ Acceso Denegado: Cuenta sin permisos."); }
      } else {
        navigate('/portal');
      }
    } catch (error: any) { setErrorMsg(error.message); } finally { setLoading(false); }
  };

  if (step === 'selection') {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '3rem', background: '#1e1e1e', borderRadius: '16px', border: '1px solid #333', textAlign: 'center', minWidth: '350px' }}>
          <h2 style={{ marginBottom: '10px' }}>Bienvenido</h2>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', margin: '30px 0' }}>
            <button onClick={() => selectRole('client')} style={{ ...badgeStyle, flexDirection:'column', padding: '20px', width: '140px', background: '#333' }}>
                <span style={{fontSize:'30px'}}>👋</span><span>Soy Cliente</span>
            </button>
            <button onClick={() => selectRole('employee')} style={{ ...badgeStyle, flexDirection:'column', padding: '20px', width: '140px', background: '#222', border:'1px solid #555' }}>
                <span style={{fontSize:'30px'}}>🏢</span><span>Soy Empleado</span>
            </button>
          </div>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>Volver al Visor</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '3rem', background: '#1e1e1e', borderRadius: '16px', border: '1px solid #333', textAlign: 'center', minWidth: '350px' }}>
        <h2 style={{ marginBottom: '5px' }}>{targetRole === 'employee' ? 'Acceso Empleados' : 'Acceso Clientes'}</h2>
        {errorMsg && <div style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize:'13px' }}>{errorMsg}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: 'white', outline:'none' }} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: 'white', outline:'none' }} required />
          <button type="submit" disabled={loading} style={{ ...badgeStyle, justifyContent: 'center', backgroundColor: targetRole==='employee'?'#e67e22':'#3b82f6', border: 'none', padding: '12px', marginTop: '10px' }}>{loading ? 'Verificando...' : 'Entrar'}</button>
        </form>
        <button onClick={() => setStep('selection')} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>← Cambiar</button>
      </div>
    </div>
  );
};

// 4. VISOR (HOME)
const ViewerPage = () => {
  // 💡 CAMBIO: Leemos 'isReadOnlyMode' y 'loadProjectFromURL'
  const { mode, user, isReadOnlyMode, loadProjectFromURL, resetProjectId } = useAppStore();
  
  // --- LÓGICA DE CARGA PARA QR ---
  React.useEffect(() => {
    // Si ya estamos logueados, o el modo lectura ya está activo, no hacemos nada.
    if (user || isReadOnlyMode) return; 

    const params = new URLSearchParams(window.location.search);
    const projectIdFromUrl = params.get('project_id');
    const isCloneMode = params.get('mode') === 'clone';

    if (projectIdFromUrl) {
      // Llamamos a la acción del store para cargar el proyecto públicamente
      loadProjectFromURL(projectIdFromUrl).then(() => {
         // Y si es modo clon, borramos el ID inmediatamente después de cargar
         if (isCloneMode && resetProjectId) {
             console.log("Modo CLON activado: Reseteando ID para crear copia.");
             resetProjectId(); 
         }
      });
    }
  }, [loadProjectFromURL, resetProjectId]); // Añade dependencias

  // --- FIN LÓGICA DE CARGA PARA QR ---

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', margin: 0, background: '#000' }}>
      
      {/* 💡 CAMBIO: Mostrar mensaje si es Solo Lectura */}
      {isReadOnlyMode ? (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, color:'white', background:'rgba(0,0,0,0.7)', padding:'8px 16px', borderRadius:'10px', border:'1px solid #3b82f6', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{fontSize:'18px'}}>👁️</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>MODO VISOR (Solo Lectura)</span>
        </div>
      ) : (
        // Muestra el botón de Login SOLO si no hay usuario Y no estamos en modo lectura
        !user && (
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
                <Link to="/login" style={badgeStyle}>
                    <span style={{ fontSize: '18px' }}>👤</span>
                    <span>Acceso / Login</span>
                </Link>
            </div>
        )
      )}


      <Editor3D />
      {mode === 'catalog' && <Catalog />}
    </div>
  );
};

// --- APP ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/admin" element={<EmployeeLayout />}>
          <Route index element={<h2 style={{color:'white', padding:'20px'}}>Bienvenido al Panel</h2>} />
          <Route path="crm" element={<CrmDashboard />} />
          <Route path="order/:id" element={<AdminOrderDetailPage />} />
          <Route path="erp" element={<h2 style={{color:'white', padding:'20px'}}>ERP en construcción</h2>} />
          <Route path="purchases" element={<h2 style={{color:'white', padding:'20px'}}>Compras en construcción</h2>} />
        </Route>

        <Route path="/portal" element={<ClientPortalLayout />}>
           <Route index element={<ClientDashboard />} />
           <Route path="profile" element={<ProfilePage />} /> {/* <--- NUEVA RUTA */}
           <Route path="order/:id" element={<BudgetDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;