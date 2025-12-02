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
// Estilos Modal
const modalOverlayStyle = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalContentStyle = { background: '#1e1e1e', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #444' };
const modalInputStyle = { width: '100%', padding: '10px', marginBottom: '15px', background: '#252525', border: '1px solid #444', color: 'white', borderRadius: '6px' };

// Listas de estados
const BUDGET_STATUSES = ['pendiente', 'presupuestado', 'rechazado'];
const ORDER_STATUSES = ['pedido', 'fabricacion', 'entregado_parcial', 'entregado', 'completado', 'cancelado'];

export const CrmDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clients' | 'budgets' | 'orders'>('budgets');
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Estado Modal Alta Cliente
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ email: '', company_name: '', full_name: '', phone: '', discount_rate: 0 });

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'clients') {
        const { data } = await supabase.from('profiles').select('*, is_approved').order('created_at', { ascending: false });
        setClients(data || []);
      } else {
        let query = supabase.from('orders')
            .select(`*, profiles(company_name, email), projects(name), order_messages(created_at, profiles(role))`)
            .order('created_at', { ascending: false });
        
        if (activeTab === 'budgets') query = query.in('status', BUDGET_STATUSES);
        else if (activeTab === 'orders') query = query.in('status', ORDER_STATUSES);

        const { data } = await query;
        setDataList(data || []);
      }
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  const handleApproveClient = async (clientId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', clientId);
    if (!error) { alert("Usuario aprobado."); loadData(); }
  };

  // --- ALTA MANUAL DE CLIENTE ---
  const handleCreateClient = async () => {
    if (!newClientData.email) return alert("El email es obligatorio");

    // 1. Guardar en pre_clients (para que el trigger copie datos al registrarse)
    const { error } = await supabase.from('pre_clients').insert([newClientData]);
    
    if (error) {
        alert("Error al crear pre-ficha: " + error.message);
    } else {
        alert(`✅ Ficha creada para ${newClientData.email}.\n\nCuando el cliente se registre en la web con este email, sus datos se rellenarán automáticamente y tendrá acceso inmediato.`);
        setShowCreateModal(false);
        setNewClientData({ email: '', company_name: '', full_name: '', phone: '', discount_rate: 0 });
    }
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
  const handleStatusUpdate = async (id: string, newStatus: string) => {
      // (Mismo código de antes)
      const confirmMsg = `¿Cambiar estado a "${newStatus.toUpperCase()}"?`;
      if(!confirm(confirmMsg)) return; 
      const updateData: any = { status: newStatus };
      if (newStatus === 'pedido') {
          const d = new Date(); d.setDate(d.getDate() + 42);
          updateData.estimated_delivery_date = d.toISOString();
      }
      await supabase.from('orders').update(updateData).eq('id', id);
      loadData();
  };
  const getAlertStatus = (order: any) => {
    const messages = order.order_messages || [];
    messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (!messages[0]) return null;
    if (messages[0].profiles?.role === 'client') return { icon: '🔴', text: 'Cliente escribió', color: '#e74c3c' };
    return { icon: '🟢', text: 'Respondido', color: '#27ae60' };
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div><h2 style={{ margin: 0, color: 'white' }}>Panel de Control 🏢</h2><small>Vista Administrador</small></div>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={() => setActiveTab('clients')} style={tabBtnStyle(activeTab === 'clients')}>👥 Clientes</button>
          <button onClick={() => setActiveTab('budgets')} style={tabBtnStyle(activeTab === 'budgets')}>📑 Presupuestos</button>
          <button onClick={() => setActiveTab('orders')} style={tabBtnStyle(activeTab === 'orders')}>📦 Pedidos</button>
          <button onClick={() => loadData()} style={{...tabBtnStyle(false), background: '#27ae60', color: 'white'}}>🔄</button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
            {/* TABLA PRESUPUESTOS Y PEDIDOS (Igual que antes) */}
          {(activeTab === 'budgets' || activeTab === 'orders') && (
             <div style={{overflowX: 'auto'}}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Avisos</th>
                      <th style={thStyle}>REF</th>
                      <th style={thStyle}>Cliente</th>
                      {activeTab === 'budgets' ? (
                        <>
                            <th style={{...thStyle, color:'#e67e22'}}>Estado</th>
                            <th style={{...thStyle, color:'#e67e22'}}>F. Solicitud</th>
                        </>
                      ) : (
                        <>
                            <th style={{...thStyle, color:'#3498db'}}>Estado</th>
                            <th style={{...thStyle, color:'#3498db'}}>F. Aceptación</th>
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
                            <td style={{...tdStyle, textAlign:'center'}} title={alert?.text}>{alert ? alert.icon : '⚪'}</td>
                            <td style={tdStyle}><strong>{o.order_ref}</strong></td>
                            <td style={{...tdStyle, color: o.profiles ? '#4a90e2' : '#999'}}>{o.profiles ? (o.profiles.company_name || o.profiles.email) : 'Eliminado'}</td>
                            <td style={tdStyle}>
                                <select value={o.status} onChange={(e) => handleStatusUpdate(o.id, e.target.value)} style={selectStyle}>
                                    {activeTab==='budgets' ? (
                                        <>
                                            <option value="pendiente">🟠 Pendiente</option>
                                            <option value="presupuestado">🟣 Presupuestado</option>
                                            <option value="entregado">🟣 Entregado</option>
                                            <option value="rechazado">🔴 Rechazado</option>
                                            <option value="pedido">➡️ PASAR A PEDIDO</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="pedido">🔵 Pedido</option>
                                            <option value="fabricacion">🟠 Fabricación</option>
                                            <option value="entregado">🟣 Entregado</option>
                                            <option value="completado">🟢 Completado</option>
                                        </>
                                    )}
                                </select>
                            </td>
                            <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td style={{...tdStyle, fontWeight:'bold'}}>{o.total_price} €</td>
                            <td style={tdStyle}>
                                <button onClick={() => navigate(`/admin/order/${o.id}`)} style={{background:'#333', color:'white', border:'1px solid #555', padding:'5px 10px', borderRadius:'4px', marginRight:'5px'}}>👁️</button>
                                <button onClick={() => handleDeleteOrder(o.id)} style={{background:'none', border:'none', color:'#666'}}>🗑️</button>
                            </td>
                        </tr>
                    )})}
                    {dataList.length === 0 && <tr><td colSpan={8} style={{padding:'20px', textAlign:'center', color:'#666'}}>Sin datos.</td></tr>}
                  </tbody>
                </table>
             </div>
          )}

          {/* TABLA CLIENTES */}
          {activeTab === 'clients' && (
            <div>
                <div style={{marginBottom:'15px', textAlign:'right'}}>
                    <button onClick={() => setShowCreateModal(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>
                        + Nuevo Cliente (Manual)
                    </button>
                </div>
                <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>Estado</th>
                        <th style={thStyle}>Empresa</th>
                        <th style={thStyle}>Email</th>
                        <th style={thStyle}>Dto.</th>
                        <th style={thStyle}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map(c => (
                    <tr key={c.id}>
                        <td style={tdStyle}>
                            {c.is_approved ? <span title="Activo">✅</span> : <button onClick={() => handleApproveClient(c.id)} style={{background:'#e67e22', color:'white', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer'}}>Aprobar</button>}
                        </td>
                        <td style={{...tdStyle, fontWeight:'bold'}}>{c.company_name || '---'}</td>
                        <td style={tdStyle}>{c.email}</td>
                        <td style={{...tdStyle, color:'#2ecc71', fontWeight:'bold'}}>{c.discount_rate}%</td>
                        <td style={tdStyle}>
                            <button onClick={() => navigate(`/admin/client/${c.id}`)} style={{background:'#333', color:'white', border:'1px solid #555', padding:'5px 10px', borderRadius:'4px', marginRight:'5px'}}>Ficha</button>
                            <button onClick={() => handleDeleteClient(c.id)} style={{background:'none', border:'none', color:'#e74c3c'}}>🗑️</button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </>
      )}

      {/* MODAL ALTA MANUAL */}
      {showCreateModal && (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3 style={{marginTop:0, color:'white'}}>Dar de Alta Cliente</h3>
                <p style={{color:'#888', fontSize:'13px', marginBottom:'20px'}}>
                    Introduce los datos para pre-aprobar al cliente. Cuando se registre con este email, tendrá acceso inmediato y estos datos cargados.
                </p>
                <input type="email" placeholder="Email (Obligatorio)" style={modalInputStyle} value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} />
                <input type="text" placeholder="Nombre Empresa" style={modalInputStyle} value={newClientData.company_name} onChange={e => setNewClientData({...newClientData, company_name: e.target.value})} />
                <input type="text" placeholder="Persona de Contacto" style={modalInputStyle} value={newClientData.full_name} onChange={e => setNewClientData({...newClientData, full_name: e.target.value})} />
                <input type="text" placeholder="Teléfono" style={modalInputStyle} value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} />
                <label style={{display:'block', color:'#aaa', marginBottom:'5px', fontSize:'12px'}}>Descuento Comercial (%)</label>
                <input type="number" placeholder="0" style={modalInputStyle} value={newClientData.discount_rate} onChange={e => setNewClientData({...newClientData, discount_rate: parseFloat(e.target.value)})} />
                
                <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'10px'}}>
                    <button onClick={() => setShowCreateModal(false)} style={{background:'transparent', color:'#888', border:'none', cursor:'pointer'}}>Cancelar</button>
                    <button onClick={handleCreateClient} style={{background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>Crear Pre-Ficha</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};