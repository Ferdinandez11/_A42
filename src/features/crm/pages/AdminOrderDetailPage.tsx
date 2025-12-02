import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// --- ESTILOS ---
const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%', color: '#e0e0e0', fontFamily: 'sans-serif' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const };
const inputStyle = { background: '#252525', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '6px', width: '100%', marginBottom: '15px' };
const labelStyle = { display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '13px' };

export const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items3D, setItems3D] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadData = async () => {
    if (!id) return;
    
    // 1. Cargar Pedido
    const { data: o } = await supabase
        .from('orders')
        .select('*, projects(*), profiles(*)')
        .eq('id', id)
        .single();
    
    if (o) {
        setOrder(o);
        if (o.estimated_delivery_date) {
            setNewDate(new Date(o.estimated_delivery_date).toISOString().slice(0, 16));
        }
        // Extraer items del JSON
        if (o.projects && o.projects.items) {
            setItems3D(o.projects.items);
        }
    }

    // 2. Chat
    const { data: m } = await supabase
        .from('order_messages')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: true });
    
    setMessages(m || []);
  };

  const handleUpdateOrder = async () => {
    if (!order) return;
    const { error } = await supabase.from('orders').update({
        status: order.status,
        estimated_delivery_date: new Date(newDate).toISOString(),
        total_price: order.total_price 
    }).eq('id', id);

    if (error) alert("Error: " + error.message);
    else alert("✅ Actualizado");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ order_id: id, user_id: user?.id, content: newMessage }]);
    setNewMessage('');
    loadData();
  };

  // Función para abrir el visor en modo lectura
  const handleOpenViewer = () => {
      if (order.project_id) {
          // Añadimos &mode=readonly para que App.tsx sepa que es solo ver
          window.open(`/?project_id=${order.project_id}&mode=readonly`, '_blank');
      }
  };

  if (!order) return <p>Cargando...</p>;

  // Roles que considero "MÍOS" (Admin/Empleado)
  const isMyMessage = (role: string) => role === 'admin' || role === 'employee';

  return (
    <div style={{ padding: '20px', height: '100vh', display:'flex', flexDirection:'column' }}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
        <button onClick={() => navigate('/admin/crm')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Volver al Panel</button>
        <h2 style={{margin:0, color:'white'}}>Gestión Pedido: <span style={{color:'#3b82f6'}}>{order.order_ref}</span></h2>
      </div>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px', overflowY:'auto' }}>
            
            <div style={cardStyle}>
                <h3 style={{margin:'0 0 15px 0', borderBottom:'1px solid #333', paddingBottom:'10px', color:'white'}}>⚙️ Control de Estado</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Estado Actual</label>
                        <select 
                            value={order.status}
                            onChange={(e) => setOrder({...order, status: e.target.value})}
                            style={inputStyle}
                        >
                            <optgroup label="Fase Presupuesto">
                                <option value="pendiente">🟠 Pendiente</option>
                                <option value="presupuestado">🟣 Presupuestado</option>
                                <option value="entregado">🟣 Entregado</option>
                                <option value="rechazado">🔴 Rechazado</option>
                            </optgroup>
                            <optgroup label="Fase Pedido / Fabricación">
                                <option value="pedido">🔵 Pedido Aceptado</option>
                                <option value="fabricacion">🟠 En Fabricación</option>
                                <option value="entregado_parcial">🟡 Entregado Parcial</option>
                                <option value="completado">🟢 Completado</option>
                                <option value="cancelado">⚫ Cancelado</option>
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Fecha Entrega Estimada</label>
                        <input 
                            type="datetime-local" 
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Precio Total (€)</label>
                        <input 
                            type="number" 
                            value={order.total_price}
                            onChange={(e) => setOrder({...order, total_price: parseFloat(e.target.value)})}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{display:'flex', alignItems:'center'}}>
                         <button onClick={handleUpdateOrder} style={{width:'100%', background:'#27ae60', color:'white', padding:'12px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                            💾 Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>

            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3 style={{margin:0, color:'white'}}>📋 Desglose del Proyecto</h3>
                    <button onClick={handleOpenViewer} style={{padding:'5px 10px', background:'#333', color:'white', border:'1px solid #555', borderRadius:'4px', cursor:'pointer', fontSize:'12px'}}>
                        Abrir Visor 3D ↗
                    </button>
                </div>
                
                {/* IMAGEN DEL PROYECTO (ARREGLADA) */}
                <div style={{
                    height:'250px', width:'100%', 
                    background:'#111', borderRadius:'8px', overflow:'hidden', 
                    border:'1px solid #333', display:'flex', justifyContent:'center', alignItems:'center',
                    marginBottom:'15px'
                }}>
                     {order.projects?.thumbnail_url ? (
                        <img 
                            src={order.projects.thumbnail_url} 
                            style={{width:'100%', height:'100%', objectFit:'contain'}} // Ajuste para que se vea entera
                            alt="Vista previa 3D"
                        /> 
                     ) : (
                        <div style={{textAlign:'center', color:'#555'}}>
                            <span style={{fontSize:'40px', display:'block'}}>🏞️</span>
                            <small>Sin imagen previa</small>
                        </div>
                     )}
                </div>

                <div style={{background:'#252525', borderRadius:'8px', overflow:'hidden'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead style={{background:'#333', color:'#aaa'}}>
                            <tr><th style={{padding:'8px', textAlign:'left'}}>Ítem / Mueble</th><th style={{padding:'8px', textAlign:'right'}}>Precio</th></tr>
                        </thead>
                        <tbody>
                            {items3D.length > 0 ? items3D.map((item: any, idx: number) => (
                                <tr key={idx} style={{borderBottom:'1px solid #333'}}>
                                    <td style={{padding:'8px', color:'white'}}>{item.name || 'Objeto'}</td>
                                    <td style={{padding:'8px', textAlign:'right', color:'#3b82f6'}}>{item.price?.toLocaleString()} €</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={2} style={{padding:'10px', textAlign:'center', color:'#666'}}>No hay ítems en este proyecto</td></tr>
                            )}
                        </tbody>
                        <tfoot style={{background:'#333', fontWeight:'bold'}}>
                            <tr>
                                <td style={{padding:'8px', color:'white'}}>TOTAL</td>
                                <td style={{padding:'8px', textAlign:'right', color:'#2ecc71'}}>{items3D.reduce((acc, i) => acc + (i.price || 0), 0).toLocaleString()} €</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{...cardStyle, maxHeight:'90vh'}}>
            <h3 style={{color:'white', borderBottom:'1px solid #333', paddingBottom:'10px'}}>💬 Chat con Cliente</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'15px', paddingRight:'10px'}}>
                {messages.map(msg => {
                    const amITheSender = isMyMessage(msg.profiles?.role);
                    return (
                        <div key={msg.id} style={{
                            alignSelf: amITheSender ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: amITheSender ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                background: amITheSender ? '#3b82f6' : '#444', 
                                color: 'white', padding: '10px 15px', borderRadius: '12px',
                                borderBottomRightRadius: amITheSender ? '0' : '12px',
                                borderBottomLeftRadius: amITheSender ? '12px' : '0'
                            }}>
                                {msg.content}
                            </div>
                            <small style={{color:'#666', fontSize:'10px', marginTop:'4px'}}>
                                {amITheSender ? 'Tú' : (msg.profiles?.full_name || 'Cliente')} • {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </small>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} style={{flex:1, padding:'12px', background:'#252525', border:'1px solid #444', color:'white', borderRadius:'6px', outline:'none'}} placeholder="Responder..." />
                <button onClick={handleSendMessage} style={{background:'#3b82f6', color:'white', border:'none', padding:'0 20px', borderRadius:'6px', cursor:'pointer', fontSize:'18px'}}>➤</button>
            </div>
        </div>

      </div>
    </div>
  );
};