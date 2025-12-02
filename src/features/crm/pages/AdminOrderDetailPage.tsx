import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// Estilos rápidos (Reutilizamos los oscuros)
const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%', color: '#e0e0e0', fontFamily: 'sans-serif' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const };
const inputStyle = { background: '#252525', border: '1px solid #444', color: 'white', padding: '8px', borderRadius: '6px', width: '100%' };

export const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadData = async () => {
    if (!id) return;
    // Cargar Pedido
    const { data: o } = await supabase.from('orders').select('*, projects(*), profiles(*)').eq('id', id).single();
    if (o) {
        setOrder(o);
        // Formatear fecha para el input datetime-local (YYYY-MM-DDTHH:MM)
        if (o.estimated_delivery_date) {
            setNewDate(new Date(o.estimated_delivery_date).toISOString().slice(0, 16));
        }
    }

    // Cargar Chat
    const { data: m } = await supabase.from('order_messages').select('*, profiles(full_name, role)').eq('order_id', id).order('created_at', { ascending: true });
    setMessages(m || []);
  };

  const handleUpdateOrder = async () => {
    if (!order) return;
    const { error } = await supabase.from('orders').update({
        status: order.status,
        estimated_delivery_date: new Date(newDate).toISOString(),
        total_price: order.total_price // Por si cambias precio
    }).eq('id', id);

    if (error) alert("Error actualizando: " + error.message);
    else alert("✅ Pedido actualizado correctamente");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ order_id: id, user_id: user?.id, content: newMessage }]);
    setNewMessage('');
    loadData();
  };

  if (!order) return <p>Cargando...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate('/admin/crm')} style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Volver al Panel</button>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA: GESTIÓN */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            
            <div style={cardStyle}>
                <h2 style={{margin:'0 0 10px 0', color:'white'}}>Gestión del Pedido: {order.order_ref}</h2>
                <p style={{color:'#888'}}>Cliente: <strong style={{color:'#3b82f6'}}>{order.profiles?.company_name || order.profiles?.email}</strong></p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop:'20px' }}>
                    
                    {/* CAMBIAR ESTADO */}
                    <div>
                        <label style={{display:'block', color:'#aaa', marginBottom:'5px'}}>Estado del Pedido</label>
                        <select 
                            value={order.status}
                            onChange={(e) => setOrder({...order, status: e.target.value})}
                            style={inputStyle}
                        >
                            <option value="pendiente">🟠 Pendiente</option>
                            <option value="presupuestado">🟣 Presupuestado (Esperando Cliente)</option>
                            <option value="entregado">🟣 Entregado (Presupuesto Enviado)</option>
                            <option value="pedido">🔵 Pedido Solicitado</option>
                            <option value="fabricacion">🟠 En Fabricación</option>
                            <option value="entregado_parcial">🟡 Entregado Parcial</option>
                            <option value="completado">🟢 Completado / Entregado Final</option>
                            <option value="rechazado">🔴 Rechazado</option>
                            <option value="cancelado">⚫ Cancelado</option>
                        </select>
                    </div>

                    {/* CAMBIAR FECHA */}
                    <div>
                        <label style={{display:'block', color:'#aaa', marginBottom:'5px'}}>Fecha Entrega Estimada</label>
                        <input 
                            type="datetime-local" 
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* CAMBIAR PRECIO */}
                     <div>
                        <label style={{display:'block', color:'#aaa', marginBottom:'5px'}}>Precio Final (€)</label>
                        <input 
                            type="number" 
                            value={order.total_price}
                            onChange={(e) => setOrder({...order, total_price: parseFloat(e.target.value)})}
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div style={{marginTop:'20px', textAlign:'right'}}>
                    <button onClick={handleUpdateOrder} style={{background:'#27ae60', color:'white', padding:'10px 20px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                        💾 Guardar Cambios
                    </button>
                </div>
            </div>

            {/* VISTA DEL PROYECTO */}
            <div style={cardStyle}>
                <h3 style={{color:'white'}}>Proyecto Vinculado: {order.projects?.name}</h3>
                <div style={{height:'200px', background:'#000', borderRadius:'8px', overflow:'hidden', border:'1px solid #333', display:'flex', justifyContent:'center'}}>
                     {order.projects?.thumbnail_url 
                        ? <img src={order.projects.thumbnail_url} style={{height:'100%'}} /> 
                        : <span style={{alignSelf:'center', fontSize:'30px'}}>🏞️</span>}
                </div>
                <div style={{marginTop:'10px', display:'flex', gap:'10px'}}>
                     {/* Botón para abrir el editor 3D en modo solo lectura o admin */}
                     <button onClick={() => window.open(`/?project_id=${order.project_id}`, '_blank')} style={{padding:'8px', background:'#333', color:'white', border:'1px solid #555', borderRadius:'4px', cursor:'pointer'}}>
                        Ver 3D Original
                     </button>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <div style={{...cardStyle, maxHeight:'85vh'}}>
            <h3 style={{color:'white', borderBottom:'1px solid #333', paddingBottom:'10px'}}>💬 Chat con Cliente</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
                {messages.map(msg => {
                    // Si el rol es employee o admin, soy YO (derecha). Si es client, es izquierda.
                    const isMe = msg.profiles?.role === 'employee' || msg.profiles?.role === 'admin';
                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            background: isMe ? '#e67e22' : '#333', // Naranja para empleado
                            color: 'white', padding: '10px', borderRadius: '8px', maxWidth:'80%'
                        }}>
                            <small style={{display:'block', fontSize:'10px', opacity:0.7, marginBottom:'2px'}}>
                                {msg.profiles?.full_name || 'Usuario'} - {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </small>
                            {msg.content}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'10px', display:'flex', gap:'5px'}}>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} style={{flex:1, padding:'10px', background:'#252525', border:'1px solid #444', color:'white', borderRadius:'4px'}} placeholder="Responder al cliente..." />
                <button onClick={handleSendMessage} style={{background:'#3b82f6', color:'white', border:'none', padding:'0 15px', borderRadius:'4px', cursor:'pointer'}}>➤</button>
            </div>
        </div>

      </div>
    </div>
  );
};