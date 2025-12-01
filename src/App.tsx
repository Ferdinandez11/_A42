import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// --- IMPORTS DE TUS MÓDULOS ---
import { Editor3D } from './features/editor/Editor3D';
import { Catalog } from './features/editor/ui/Catalog';
import { useAppStore } from './stores/useAppStore';
import { CrmDashboard } from './features/crm/pages/CrmDashboard';

// --- ESTILOS COMPARTIDOS (DARK MODE) ---

const badgeStyle: React.CSSProperties = {
  backgroundColor: '#333',
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

const navLinkStyle: React.CSSProperties = {
  color: '#aaa',
  textDecoration: 'none',
  padding: '8px 12px',
  borderRadius: '6px',
  transition: 'color 0.2s',
  fontSize: '14px',
  display: 'block'
};

// --- LAYOUTS ---

// 1. Layout EMPLEADOS
const EmployeeLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
          <button onClick={handleLogout} style={{background:'transparent', border:'none', color:'#e74c3c', cursor:'pointer', textAlign:'left', padding:0}}>Cerrar Sesión</button>
          <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '13px' }}>← Volver al Visor 3D</Link>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

// 2. Layout CLIENTES
const ClientPortalLayout = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#1e1e1e', borderBottom: '1px solid #333', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>Portal del Cliente 👋</h3>
        <nav style={{ display: 'flex', gap: '20px', alignItems:'center' }}>
          <Link to="/portal/quotes" style={{ color: '#fff', textDecoration: 'none' }}>Mis Presupuestos</Link>
          <Link to="/portal/orders" style={{ color: '#bbb', textDecoration: 'none' }}>Mis Pedidos</Link>
          <Link to="/" style={{ ...badgeStyle, fontSize: '12px', padding: '6px 12px' }}>+ Nuevo Proyecto 3D</Link>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} style={{background:'none', border:'none', color:'#666', cursor:'pointer'}}>Salir</button>
        </nav>
      </header>
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// 3. PÁGINA DE LOGIN (CON LÓGICA DE ROLES)
const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'selection' | 'form'>('selection');
  const [targetRole, setTargetRole] = useState<'client' | 'employee'>('client');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Selección de Rol
  const selectRole = (role: 'client' | 'employee') => {
    setTargetRole(role);
    setStep('form');
    setErrorMsg('');
  };

  // 2. Proceso de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // A) Autenticar en Supabase (Email/Pass)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo obtener el usuario.");

      // B) Verificar Rol en la base de datos
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
         // Si no tiene perfil, es raro, pero lo tratamos como error
         await supabase.auth.signOut();
         throw new Error("Error obteniendo perfil de usuario.");
      }

      const userRole = profile?.role || 'client'; // Por defecto client

      // C) Comprobar si tiene permiso para donde quiere entrar
      if (targetRole === 'employee') {
        if (userRole === 'admin' || userRole === 'employee') {
          console.log("Acceso Empleado Correcto");
          navigate('/admin/crm');
        } else {
          // Es un cliente intentando entrar como empleado -> BLOQUEAR
          await supabase.auth.signOut();
          throw new Error("⛔ Acceso Denegado: Tu cuenta no tiene permisos de empleado.");
        }
      } else {
        // targetRole === 'client'
        // Dejamos entrar a cualquiera al portal (incluso admins pueden ver como se ve el portal)
        console.log("Acceso Portal Correcto");
        navigate('/portal');
      }
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO ---
  
  // VISTA 1: SELECCIÓN DE TIPO
  if (step === 'selection') {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '3rem', background: '#1e1e1e', borderRadius: '16px', border: '1px solid #333', textAlign: 'center', minWidth: '350px' }}>
          <h2 style={{ marginBottom: '10px' }}>Bienvenido</h2>
          <p style={{ marginBottom: '30px', color: '#888' }}>Selecciona tu tipo de acceso:</p>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
                onClick={() => selectRole('client')}
                style={{ ...badgeStyle, flexDirection:'column', padding: '20px', width: '140px', background: '#333' }}>
                <span style={{fontSize:'30px'}}>👋</span>
                <span>Soy Cliente</span>
            </button>

            <button 
                onClick={() => selectRole('employee')}
                style={{ ...badgeStyle, flexDirection:'column', padding: '20px', width: '140px', background: '#222', border:'1px solid #555' }}>
                <span style={{fontSize:'30px'}}>🏢</span>
                <span>Soy Empleado</span>
            </button>
          </div>

          <button onClick={() => navigate('/')} style={{ marginTop: '30px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>
            Volver al Visor
          </button>
        </div>
      </div>
    );
  }

  // VISTA 2: FORMULARIO
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '3rem', background: '#1e1e1e', borderRadius: '16px', border: '1px solid #333', textAlign: 'center', minWidth: '350px' }}>
        
        <h2 style={{ marginBottom: '5px' }}>
            {targetRole === 'employee' ? 'Acceso Empleados 🔒' : 'Acceso Clientes 👋'}
        </h2>
        <p style={{ marginBottom: '20px', color: '#888', fontSize: '13px' }}>
            Introduce tus credenciales
        </p>
        
        {errorMsg && (
            <div style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize:'13px', border: '1px solid #e74c3c' }}>
                {errorMsg}
            </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: 'white', outline:'none' }}
            required
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: 'white', outline:'none' }}
            required
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ ...badgeStyle, justifyContent: 'center', backgroundColor: targetRole==='employee'?'#e67e22':'#3b82f6', border: 'none', padding: '12px', marginTop: '10px' }}>
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <button 
          onClick={() => setStep('selection')} 
          style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>
          ← Cambiar tipo de cuenta
        </button>
      </div>
    </div>
  );
};

// 4. VISOR (HOME)
const ViewerPage = () => {
  const { mode } = useAppStore();
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', margin: 0, background: '#000' }}>
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
        <Route path="/" element={<ViewerPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* ZONA EMPLEADOS */}
        <Route path="/admin" element={<EmployeeLayout />}>
          <Route index element={<h2 style={{color:'white', padding:'20px'}}>Bienvenido al Panel de Control</h2>} />
          <Route path="crm" element={<CrmDashboard />} />
          <Route path="erp" element={<h2 style={{color:'white', padding:'20px'}}>Módulo ERP (En construcción)</h2>} />
          <Route path="purchases" element={<h2 style={{color:'white', padding:'20px'}}>Módulo Compras (En construcción)</h2>} />
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