import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// --- ESTILOS ---
const containerStyle = { color: '#e0e0e0', padding: '20px', fontFamily: 'sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' };
const tabBtnStyle = (active: boolean) => ({
  background: active ? '#e67e22' : '#333', color: active ? '#fff' : '#aaa',
  border: 'none', padding: '10px 20px', marginRight: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' as const
});
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '14px', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left' as const, padding: '15px', background: '#2a2a2a', color: '#888', borderBottom: '1px solid #333' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #333' };

export const CrmDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clients' | 'orders' | 'tickets'>('orders');
  const [loading, setLoading] = useState(false);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        // Cargar TODOS los pedidos sin filtros
        const { data } = await supabase.from('orders').select('*, profiles(company_name, email), projects(name)').order('created_at', { ascending: false });
        setOrders(data || []);
      } 
      else if (activeTab === 'clients') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setClients(data || []);
      }
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  // BORRAR CLIENTE
  const handleDeleteClient = async (id: string) => {
    if(!confirm("⚠️ ¡PELIGRO! ¿Borrar este cliente?\nSe borrarán también sus proyectos y pedidos asociados.")) return;
    // Nota: Supabase Auth User no se puede borrar desde el cliente SQL fácilmente sin función RPC, 
    // pero podemos borrar el perfil y dejar al usuario 'huerfano' o usar una Edge Function. 
    // Por ahora borramos el perfil de la tabla pública.
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else loadData();
  };

  // BORRAR PEDIDO (ADMIN)
  const handleDeleteOrder = async (id: string) => {
    if(!confirm("¿Borrar este pedido permanentemente?")) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if(error) alert("Error: " + error.message);
    else loadData();
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div><h2 style={{ margin: 0, color: 'white' }}>Panel de Control 🏢</h2><small>Vista Administrador</small></div>
        <div>
          <button onClick={() => setActiveTab('clients')} style={tabBtnStyle(activeTab === 'clients')}>👥 Clientes</button>
          <button onClick={() => setActiveTab('orders')} style={tabBtnStyle(activeTab === 'orders')}>📦 Todos los Pedidos</button>
          <button onClick={() => loadData()} style={{...tabBtnStyle(false), background: '#27ae60', color: 'white'}}>🔄</button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
          {/* TABLA PEDIDOS (ADMIN) */}
          {activeTab === 'orders' && (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>REF</th><th style={thStyle}>Cliente</th><th style={thStyle}>Estado</th><th style={thStyle}>Fecha</th><th style={thStyle}>Total</th><th style={thStyle}>Acciones</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={tdStyle}><strong>{o.order_ref}</strong></td>
                    <td style={{...tdStyle, color:'#4a90e2'}}>{o.profiles?.company_name || o.profiles?.email}</td>
                    <td style={tdStyle}>
                        <span style={{
                             padding:'4px 8px', borderRadius:'4px', fontWeight:'bold', fontSize:'12px',
                             background: o.status === 'pedido' ? '#3498db' : (o.status === 'pendiente' ? '#e67e22' : '#333')
                        }}>
                            {o.status.toUpperCase()}
                        </span>
                    </td>
                    <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>{o.total_price} €</td>
                    <td style={tdStyle}>
                      <button onClick={() => navigate(`/admin/order/${o.id}`)} style={{marginRight:'10px', cursor:'pointer', background:'#333', color:'white', border:'1px solid #555', padding:'5px'}}>Gestionar ✏️</button>
                      <button onClick={() => handleDeleteOrder(o.id)} style={{cursor:'pointer', background:'transparent', border:'none'}}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TABLA CLIENTES */}
          {activeTab === 'clients' && (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Empresa</th><th style={thStyle}>Email</th><th style={thStyle}>Rol</th><th style={thStyle}>Acciones</th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{...tdStyle, fontWeight:'bold'}}>{c.company_name || '---'}</td>
                    <td style={tdStyle}>{c.email}</td>
                    <td style={tdStyle}>{c.role}</td>
                    <td style={tdStyle}>
                        <button onClick={() => handleDeleteClient(c.id)} style={{color:'#e74c3c', background:'transparent', border:'none', cursor:'pointer'}}>Borrar Usuario 🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};