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
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left' as const, padding: '12px', background: '#2a2a2a', color: '#888', borderBottom: '1px solid #333', whiteSpace: 'nowrap' as const };
const tdStyle = { padding: '12px', borderBottom: '1px solid #333', verticalAlign: 'middle' };
const selectStyle = {
    background: '#252525', color: 'white', border: '1px solid #444', padding: '4px', borderRadius: '4px', cursor: 'pointer', maxWidth: '130px'
};

// Listas de estados
const BUDGET_STATUSES = ['pendiente', 'presupuestado', 'rechazado'];
const ORDER_STATUSES = ['pedido', 'fabricacion', 'entregado_parcial', 'entregado', 'completado', 'cancelado'];

export const CrmDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clients' | 'budgets' | 'orders'>('budgets');
  const [loading, setLoading] = useState(false);
  
  const [dataList, setDataList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'clients') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setClients(data || []);
      } else {
        let query = supabase.from('orders')
            .select(`
                *, 
                profiles(company_name, email), 
                projects(name),
                order_messages(created_at, profiles(role))
            `)
            .order('created_at', { ascending: false });
        
        if (activeTab === 'budgets') query = query.in('status', BUDGET_STATUSES);
        else if (activeTab === 'orders') query = query.in('status', ORDER_STATUSES);

        const { data } = await query;
        setDataList(data || []);
      }
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const confirmMsg = `¿Cambiar estado a "${newStatus.toUpperCase()}"? \n(Si cambias de fase, la tarjeta se moverá de pestaña)`;
    if(!confirm(confirmMsg)) { loadData(); return; } 

    const updateData: any = { status: newStatus };
    if (newStatus === 'pedido') {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 42);
        updateData.estimated_delivery_date = deliveryDate.toISOString();
    }

    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    if (error) alert("Error: " + error.message);
    else loadData();
  };

  const handleDeleteClient = async (id: string) => {
    if(!confirm("⚠️ ¿Borrar cliente y todos sus datos?")) return;
    await supabase.from('profiles').delete().eq('id', id);
    loadData();
  };

  const handleDeleteOrder = async (id: string) => {
    if(!confirm("¿Borrar registro permanentemente?")) return;
    await supabase.from('orders').delete().eq('id', id);
    loadData();
  };

  const getAlertStatus = (order: any) => {
    const messages = order.order_messages || [];
    messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastMsg = messages[0];
    if (!lastMsg) return null;
    if (lastMsg.profiles?.role === 'client') return { icon: '🔴', text: 'Cliente escribió', color: '#e74c3c' };
    return { icon: '🟢', text: 'Respondido', color: '#27ae60' };
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div><h2 style={{ margin: 0, color: 'white' }}>Panel de Control 🏢</h2><small>Vista Administrador</small></div>
        <div>
          <button onClick={() => setActiveTab('clients')} style={tabBtnStyle(activeTab === 'clients')}>👥 Clientes</button>
          <button onClick={() => setActiveTab('budgets')} style={tabBtnStyle(activeTab === 'budgets')}>📑 Presupuestos</button>
          <button onClick={() => setActiveTab('orders')} style={tabBtnStyle(activeTab === 'orders')}>📦 Pedidos</button>
          <button onClick={() => loadData()} style={{...tabBtnStyle(false), background: '#27ae60', color: 'white'}}>🔄</button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
          {(activeTab === 'budgets' || activeTab === 'orders') && (
            <div style={{overflowX: 'auto'}}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Avisos</th>
                  <th style={thStyle}>REF</th>
                  <th style={thStyle}>Cliente</th>
                  
                  {activeTab === 'budgets' && (
                    <>
                        <th style={{...thStyle, color:'#e67e22'}}>Estado Presup.</th>
                        <th style={{...thStyle, color:'#e67e22'}}>F. Solicitud</th>
                        <th style={{...thStyle, color:'#e67e22'}}>F. Entrega Est.</th>
                    </>
                  )}

                  {activeTab === 'orders' && (
                    <>
                        <th style={{...thStyle, color:'#3498db'}}>Estado Pedido</th>
                        <th style={{...thStyle, color:'#3498db'}}>F. Aceptación</th>
                        <th style={{...thStyle, color:'#3498db'}}>F. Entrega</th>
                    </>
                  )}

                  <th style={{...thStyle, borderLeft:'1px solid #444'}}>Total</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dataList.map(o => {
                    const alert = getAlertStatus(o);
                    return (
                    <tr key={o.id}>
                        <td style={{...tdStyle, textAlign:'center', cursor:'default'}} title={alert?.text || 'Sin novedad'}>
                            {alert ? alert.icon : <span style={{opacity:0.3}}>⚪</span>}
                        </td>
                        <td style={tdStyle}><strong>{o.order_ref}</strong></td>
                        <td style={{...tdStyle, color: o.profiles ? '#4a90e2' : '#999'}}>
                             {o.profiles ? (o.profiles.company_name || o.profiles.email) : 'Usuario Eliminado'}
                        </td>

                        {activeTab === 'budgets' && (
                            <>
                                <td style={tdStyle}>
                                    <select value={o.status} onChange={(e) => handleStatusUpdate(o.id, e.target.value)} style={selectStyle}>
                                        <option value="pendiente">🟠 Pendiente</option>
                                        <option value="presupuestado">🟣 Presupuestado</option>
                                        <option value="entregado">🟣 Entregado</option>
                                        <option value="rechazado">🔴 Rechazado</option>
                                        <option value="pedido">➡️ PASAR A PEDIDO</option>
                                    </select>
                                </td>
                                <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                                <td style={tdStyle}>{o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : '--'}</td>
                            </>
                        )}

                        {activeTab === 'orders' && (
                            <>
                                <td style={tdStyle}>
                                    <select value={o.status} onChange={(e) => handleStatusUpdate(o.id, e.target.value)} style={{...selectStyle, borderColor: '#3498db'}}>
                                        <option value="pedido">🔵 Pedido</option>
                                        <option value="fabricacion">🟠 Fabricación</option>
                                        <option value="entregado_parcial">🟡 Entr. Parcial</option>
                                        <option value="entregado">🟣 Entregado</option>
                                        <option value="completado">🟢 Completado</option>
                                        <option value="cancelado">⚫ Cancelado</option>
                                        <option value="pendiente">⬅️ DEVOLVER A PPTO</option>
                                    </select>
                                </td>
                                <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                                <td style={tdStyle}>{o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : '--'}</td>
                            </>
                        )}

                        <td style={{...tdStyle, borderLeft:'1px solid #444', fontWeight:'bold'}}>{o.total_price} €</td>
                        <td style={tdStyle}>
                            <button onClick={() => navigate(`/admin/order/${o.id}`)} style={{marginRight:'10px', cursor:'pointer', background:'#333', color:'white', border:'1px solid #555', padding:'5px 10px', borderRadius:'4px'}}>👁️ Ficha</button>
                            <button onClick={() => handleDeleteOrder(o.id)} style={{cursor:'pointer', background:'transparent', border:'none', color:'#666'}}>🗑️</button>
                        </td>
                    </tr>
                )})}
                {dataList.length === 0 && <tr><td colSpan={10} style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay datos en esta sección.</td></tr>}
              </tbody>
            </table>
            </div>
          )}

          {activeTab === 'clients' && (
            <table style={tableStyle}>
              <thead>
                <tr>
                    <th style={thStyle}>Empresa</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Dto. Fijo</th> {/* Nueva Columna */}
                    <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{...tdStyle, fontWeight:'bold'}}>{c.company_name || '---'}</td>
                    <td style={tdStyle}>{c.email}</td>
                    <td style={{...tdStyle, color: c.discount_rate > 0 ? '#2ecc71' : '#666', fontWeight:'bold'}}>
                        {c.discount_rate ? `${c.discount_rate}%` : '0%'}
                    </td>
                    <td style={tdStyle}>
                        <button onClick={() => navigate(`/admin/client/${c.id}`)} style={{marginRight:'10px', background:'#333', color:'white', border:'1px solid #555', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Ficha 👤</button>
                        <button onClick={() => handleDeleteClient(c.id)} style={{color:'#e74c3c', background:'transparent', border:'none', cursor:'pointer'}}>🗑️</button>
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