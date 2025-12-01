import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // Asegúrate que la ruta sea correcta

// --- TIPOS (Para que TypeScript no se queje) ---
interface Profile {
  id: string;
  email: string;
  company_name: string;
  role: string;
}

interface Order {
  id: string;
  order_ref: string;
  created_at: string;
  total_price: number;
  status: string;
  profiles: { company_name: string } | null;
  projects: { name: string } | null;
}

interface Ticket {
  id: string;
  created_at: string;
  type: string;
  description: string;
  status: string;
  orders: { order_ref: string } | null;
  profiles: { company_name: string } | null;
}

// --- ESTILOS LOCALES (Dark Mode) ---
const containerStyle = { color: '#e0e0e0', padding: '20px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' };
const tabBtnStyle = (active: boolean) => ({
  background: active ? '#e67e22' : '#333',
  color: active ? '#fff' : '#aaa',
  border: 'none',
  padding: '10px 20px',
  marginRight: '10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold' as const,
  transition: 'all 0.2s'
});
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '14px', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left' as const, padding: '15px', background: '#2a2a2a', color: '#888', borderBottom: '1px solid #333' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #333' };
const selectStyle = (status: string) => {
    let color = '#fff';
    if(status === 'fabricacion' || status === 'en_proceso') color = '#f1c40f';
    if(status === 'enviado') color = '#3498db';
    if(status === 'entregado' || status === 'resuelto') color = '#27ae60';
    if(status === 'pendiente' || status === 'abierto') color = '#e74c3c';

    return {
        background: 'transparent',
        color: color,
        border: `1px solid ${color}`,
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: 'bold' as const,
        cursor: 'pointer'
    };
};

export const CrmDashboard = () => {
  const [activeTab, setActiveTab] = useState<'clients' | 'orders' | 'tickets'>('orders');
  const [loading, setLoading] = useState(false);
  
  // Datos
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles(company_name), projects(name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setOrders(data as any);
      } 
      else if (activeTab === 'tickets') {
        // Nota: La sintaxis fk_tickets_orders es necesaria si Supabase detecta múltiples relaciones, 
        // si falla, prueba quitando el !fk...
        const { data, error } = await supabase
          .from('tickets')
          .select('*, orders(order_ref), profiles(company_name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setTickets(data as any);
      }
      else if (activeTab === 'clients') {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            //.eq('role', 'client') // Descomenta si quieres filtrar solo clientes
            .order('created_at', { ascending: false });
          if (error) throw error;
          setClients(data as any);
      }
    } catch (err: any) {
      console.error("Error cargando datos:", err.message);
      alert("Error cargando datos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estados (Orders)
  const updateOrderStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    }
  };

  // Actualizar estados (Tickets)
  const updateTicketStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
    if (!error) {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div>
            <h2 style={{ margin: 0, color: 'white' }}>Torre de Control (CRM)</h2>
            <small style={{ color: '#666' }}>Gestiona clientes, pedidos e incidencias</small>
        </div>
        <div>
          <button onClick={() => setActiveTab('clients')} style={tabBtnStyle(activeTab === 'clients')}>👥 Clientes</button>
          <button onClick={() => setActiveTab('orders')} style={tabBtnStyle(activeTab === 'orders')}>📦 Pedidos</button>
          <button onClick={() => setActiveTab('tickets')} style={tabBtnStyle(activeTab === 'tickets')}>🛠️ Incidencias</button>
          <button onClick={() => loadData()} style={{...tabBtnStyle(false), background: '#27ae60', color: 'white'}}>🔄</button>
        </div>
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <p style={{color: '#888'}}>Cargando datos...</p>
      ) : (
        <>
          {/* TABLA PEDIDOS */}
          {activeTab === 'orders' && (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>REF</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Proyecto</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} style={{borderBottom: '1px solid #333'}}>
                    <td style={tdStyle}><strong>{order.order_ref}</strong></td>
                    <td style={{...tdStyle, color: '#4a90e2'}}>{order.profiles?.company_name || 'Desconocido'}</td>
                    <td style={tdStyle}>{order.projects?.name || 'Borrado'}</td>
                    <td style={tdStyle}>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>{order.total_price?.toLocaleString()} €</td>
                    <td style={tdStyle}>
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        style={selectStyle(order.status)}
                      >
                        <option value="pendiente" style={{color:'black'}}>Pendiente</option>
                        <option value="fabricacion" style={{color:'black'}}>Fabricación</option>
                        <option value="enviado" style={{color:'black'}}>Enviado</option>
                        <option value="entregado" style={{color:'black'}}>Entregado</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={6} style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay pedidos</td></tr>}
              </tbody>
            </table>
          )}

          {/* TABLA INCIDENCIAS */}
          {activeTab === 'tickets' && (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Ref. Pedido</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} style={{borderBottom: '1px solid #333'}}>
                    <td style={tdStyle}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td style={{...tdStyle, color: '#4a90e2'}}>{ticket.profiles?.company_name || 'Cliente'}</td>
                    <td style={tdStyle}>{ticket.orders?.order_ref || '---'}</td>
                    <td style={{...tdStyle, textTransform: 'capitalize'}}>{ticket.type}</td>
                    <td style={{...tdStyle, color: '#aaa', maxWidth: '300px'}}>{ticket.description}</td>
                    <td style={tdStyle}>
                      <select 
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        style={selectStyle(ticket.status)}
                      >
                        <option value="abierto" style={{color:'black'}}>🔴 Abierto</option>
                        <option value="en_proceso" style={{color:'black'}}>🟠 En Proceso</option>
                        <option value="resuelto" style={{color:'black'}}>🟢 Resuelto</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && <tr><td colSpan={6} style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay incidencias activas</td></tr>}
              </tbody>
            </table>
          )}

           {/* TABLA CLIENTES (Nuevo) */}
           {activeTab === 'clients' && (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Empresa / Nombre</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>ID Sistema</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id} style={{borderBottom: '1px solid #333'}}>
                    <td style={{...tdStyle, color: '#fff', fontWeight:'bold'}}>{client.company_name || 'Sin Nombre'}</td>
                    <td style={{...tdStyle, color: '#aaa'}}>{client.email}</td>
                    <td style={tdStyle}>
                        <span style={{
                            background: client.role === 'admin' ? '#e74c3c' : '#333', 
                            padding: '2px 6px', borderRadius: '4px', fontSize: '12px'
                        }}>
                            {client.role || 'client'}
                        </span>
                    </td>
                    <td style={{...tdStyle, fontFamily: 'monospace', fontSize: '12px', color:'#555'}}>{client.id}</td>
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