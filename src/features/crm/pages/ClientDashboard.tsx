import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom'; // <--- IMPORTANTE
import { supabase } from '../../../lib/supabase';

// --- ESTILOS (Dark Mode) ---
const containerStyle = { color: '#e0e0e0', padding: '20px', fontFamily: 'sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' };

const tabContainerStyle = { display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #333' };
const tabStyle = (isActive: boolean) => ({
  cursor: 'pointer',
  padding: '10px 15px',
  borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
  color: isActive ? '#fff' : '#888',
  fontWeight: isActive ? 'bold' : 'normal',
  transition: 'all 0.2s',
  marginBottom: '-2px' // Para que la línea pise el borde
});

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const cardStyle = { background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const };
const cardImgStyle = { height: '140px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#555' };
const cardBodyStyle = { padding: '15px' };
const btnActionStyle = { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left' as const, padding: '15px', background: '#252525', color: '#aaa', borderBottom: '1px solid #333' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #333' };

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // <--- Para leer la URL
  
  // Leemos la pestaña de la URL o usamos 'projects' por defecto
  const initialTab = searchParams.get('tab') as 'projects' | 'orders' | 'tickets' || 'projects';
  const [activeTab, setActiveTab] = useState<'projects' | 'orders' | 'tickets'>(initialTab);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Sincronizar URL cuando cambia activeTab
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Cargar Datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      try {
        if (activeTab === 'projects') {
          const { data } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
          setProjects(data || []);
        }
        else if (activeTab === 'orders') {
          const { data } = await supabase.from('orders').select('*, projects(name)').order('created_at', { ascending: false });
          setOrders(data || []);
        }
        else if (activeTab === 'tickets') {
          const { data } = await supabase.from('tickets').select('*, orders(order_ref)').order('created_at', { ascending: false });
          setTickets(data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, navigate]);

  // --- HANDLERS (Iguales que antes) ---
  const handleEditProject = (projectId: string) => navigate(`/?project_id=${projectId}`);
  const handleDeleteProject = async (id: string) => {
    if(!confirm('¿Borrar?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };
  const handleRequestQuote = async (project: any) => {
    if(!confirm(`¿Pedir presupuesto para "${project.name}"?`)) return;
    const ref = 'PED-' + Math.floor(1000 + Math.random() * 9000);
    const { error } = await supabase.from('orders').insert([{ user_id: userId, project_id: project.id, order_ref: ref, total_price: project.total_price || 0, status: 'pendiente' }]);
    if(!error) { alert("Solicitud enviada"); setActiveTab('orders'); }
  };
  const handleNewTicket = async () => {
    if (orders.length === 0) return alert("Sin pedidos previos.");
    const desc = prompt("Describe el problema:");
    if (!desc) return;
    await supabase.from('tickets').insert([{ user_id: userId, order_id: orders[0].id, type: 'mantenimiento', description: desc, status: 'abierto' }]);
    alert("Incidencia creada");
    // Recargar
    const { data } = await supabase.from('tickets').select('*, orders(order_ref)').order('created_at', { ascending: false });
    setTickets(data || []);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: '#fff' }}>Mi Espacio Personal</h2>
        <Link to="/" style={{ background: '#27ae60', color: 'white', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}>
          + Nuevo Proyecto 3D
        </Link>
      </div>

      <div style={tabContainerStyle}>
        <div onClick={() => setActiveTab('projects')} style={tabStyle(activeTab === 'projects')}>📂 Mis Proyectos</div>
        <div onClick={() => setActiveTab('orders')} style={tabStyle(activeTab === 'orders')}>📦 Mis Pedidos</div>
        <div onClick={() => setActiveTab('tickets')} style={tabStyle(activeTab === 'tickets')}>🛠️ Incidencias</div>
      </div>

      {loading ? <p style={{color:'#666'}}>Cargando...</p> : (
        <>
            {activeTab === 'projects' && (
                <div style={gridStyle}>
                    {projects.map(p => (
                        <div key={p.id} style={cardStyle}>
                            <div style={cardImgStyle}>🏞️</div>
                            <div style={cardBodyStyle}>
                                <h4 style={{margin:'0 0 5px 0', color:'white'}}>{p.name}</h4>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', fontSize:'12px', color:'#888'}}>
                                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                                    <span style={{color:'#3b82f6'}}>{(p.total_price||0).toLocaleString()} €</span>
                                </div>
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button onClick={() => handleEditProject(p.id)} style={{...btnActionStyle, background:'#3b82f6', color:'white'}}>✏️</button>
                                    <button onClick={() => handleRequestQuote(p)} style={{...btnActionStyle, background:'#e67e22', color:'white'}}>🛒</button>
                                    <button onClick={() => handleDeleteProject(p.id)} style={{...btnActionStyle, background:'#e74c3c', color:'white'}}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <p style={{color:'#666'}}>No tienes proyectos.</p>}
                </div>
            )}
            {activeTab === 'orders' && (
                <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Ref</th><th style={thStyle}>Proyecto</th><th style={thStyle}>Estado</th><th style={thStyle}>Total</th></tr></thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id}>
                                <td style={tdStyle}><strong style={{color:'#fff'}}>{o.order_ref}</strong></td>
                                <td style={tdStyle}>{o.projects?.name}</td>
                                <td style={tdStyle}><span style={{color: o.status==='pendiente'?'orange':'#27ae60'}}>{o.status}</span></td>
                                <td style={tdStyle}>{(o.total_price||0).toLocaleString()} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
             {activeTab === 'tickets' && (
                <div>
                     <button onClick={handleNewTicket} style={{marginBottom:'10px', background:'#e74c3c', border:'none', color:'white', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Nueva Incidencia</button>
                    <table style={tableStyle}>
                        <thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Pedido</th><th style={thStyle}>Desc</th><th style={thStyle}>Estado</th></tr></thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td style={tdStyle}>{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td style={tdStyle}>{t.orders?.order_ref}</td>
                                    <td style={tdStyle}>{t.description}</td>
                                    <td style={tdStyle}>{t.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}
    </div>
  );
};