import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import type { Order } from '../../../types/types';

// Estilos rápidos
const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const };
const chatBubbleStyle = (isMe: boolean) => ({
  alignSelf: isMe ? 'flex-end' : 'flex-start',
  background: isMe ? '#3b82f6' : '#333',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '10px',
  borderBottomRightRadius: isMe ? '0' : '10px',
  borderBottomLeftRadius: isMe ? '10px' : '0',
  marginBottom: '10px',
  maxWidth: '80%'
});

export const BudgetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrderData();
  }, [id]);

  // Scroll automático al último mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrderData = async () => {
    if (!id) return;
    setLoading(true);
    
    // 1. Cargar Pedido
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('*, projects(*)') // Traemos info del proyecto 3D si existe
      .eq('id', id)
      .single();

    if (error) {
      alert('Error cargando pedido');
      navigate('/portal');
      return;
    }
    setOrder(orderData as any);

    // 2. Cargar Chat
    const { data: chatData } = await supabase
      .from('order_messages')
      .select('*, profiles(full_name, role)') // Traemos nombre de quien escribe
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    setMessages(chatData || []);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('order_messages').insert([{
      order_id: id,
      user_id: user.id,
      content: newMessage
    }]);

    if (!error) {
      setNewMessage('');
      loadOrderData(); // Recargamos para ver el mensaje (idealmente usaríamos realtime)
    }
  };

  const handleStatusChange = async (status: string) => {
    if(!confirm(`¿Estás seguro de marcar esto como ${status}?`)) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: status })
      .eq('id', id);

    if (!error && order) {
        setOrder({ ...order, status: status as any });
        alert(`Pedido ${status} correctamente.`);
        navigate('/portal?tab=orders'); // Volver al listado
    }
  };

  if (loading) return <p>Cargando detalles...</p>;
  if (!order) return <p>Pedido no encontrado</p>;

  // Calculamos si mostramos botones de acción (Solo si está PRESUPUESTADO)
  const showActions = order.status === 'presupuestado'; // O 'completado' según tu lógica anterior

  return (
    <div>
      <button onClick={() => navigate('/portal?tab=orders')} style={{background:'none', border:'none', color:'#888', marginBottom:'15px', cursor:'pointer'}}>← Volver</button>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            
            {/* CABECERA */}
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0, color:'white'}}>Ref: {order.order_ref}</h2>
                    <span style={{
                        padding:'5px 10px', 
                        borderRadius:'4px', 
                        background: order.status === 'pendiente' ? '#e67e22' : '#27ae60',
                        color:'black', fontWeight:'bold'
                    }}>
                        {order.status.toUpperCase()}
                    </span>
                </div>
                <p style={{color:'#888', marginTop:'5px'}}>Solicitado el: {new Date(order.created_at).toLocaleDateString()}</p>
                
                <div style={{marginTop:'20px', background:'#252525', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{margin:'0 0 5px 0', color:'#aaa'}}>📅 Fecha Estimada de Entrega</h4>
                    <span style={{fontSize:'18px', color:'white'}}>
                        {order.estimated_delivery_date 
                            ? new Date(order.estimated_delivery_date).toLocaleDateString() 
                            : 'Pendiente de confirmación'}
                    </span>
                    <p style={{fontSize:'12px', color:'#666', margin:'5px 0 0 0'}}>*Margen de 48h aplicado automáticamente</p>
                </div>
            </div>

            {/* DETALLE DEL PRODUCTO / PROYECTO */}
            <div style={{...cardStyle, flex:1}}>
                <h3 style={{color:'white', marginTop:0}}>Detalle del Proyecto</h3>
                {order.projects ? (
                    <div>
                        <p style={{color:'#aaa'}}>Proyecto 3D vinculado: <strong style={{color:'white'}}>{order.projects.name}</strong></p>
                        <div style={{
                            width:'100%', height:'250px', 
                            background: '#111', 
                            borderRadius:'8px', 
                            overflow: 'hidden', // Para que la imagen respete los bordes
                            display:'flex', alignItems:'center', justifyContent:'center',
                            border: '1px solid #333'
                        }}>
                            {order.projects?.thumbnail_url ? (
                                <img 
                                    src={order.projects.thumbnail_url} 
                                    alt="Vista Previa" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{textAlign:'center', color:'#555'}}>
                                    <span style={{fontSize:'40px', display:'block'}}>🏞️</span>
                                    <span style={{fontSize:'12px'}}>Sin vista previa</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p style={{color:'#aaa'}}>Selección de catálogo (Lista de ítems pendiente de implementar)</p>
                )}
                
                {/* PRECIO (Solo visible si ya lo ha puesto el empleado) */}
                {order.total_price > 0 && (
                     <div style={{marginTop:'auto', paddingTop:'20px', borderTop:'1px solid #333', textAlign:'right'}}>
                        <span style={{display:'block', color:'#888'}}>Precio Final</span>
                        <span style={{fontSize:'24px', color:'#3b82f6', fontWeight:'bold'}}>{order.total_price.toLocaleString()} €</span>
                     </div>
                )}

                {/* BOTONES DE ACEPTACIÓN */}
                {showActions && (
                    <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                        <button 
                            onClick={() => handleStatusChange('pedido')}
                            style={{flex:1, padding:'15px', background:'#27ae60', border:'none', borderRadius:'6px', color:'white', fontWeight:'bold', cursor:'pointer'}}
                        >
                            ✅ ACEPTAR PRESUPUESTO
                        </button>
                        <button 
                            onClick={() => handleStatusChange('rechazado')}
                            style={{flex:1, padding:'15px', background:'#c0392b', border:'none', borderRadius:'6px', color:'white', fontWeight:'bold', cursor:'pointer'}}
                        >
                            ❌ RECHAZAR
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <div style={{...cardStyle, maxHeight:'80vh'}}>
            <h3 style={{color:'white', marginTop:0, borderBottom:'1px solid #333', paddingBottom:'10px'}}>💬 Mensajes</h3>
            
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', paddingRight:'5px'}}>
                {messages.length === 0 && <p style={{color:'#666', textAlign:'center', marginTop:'20px'}}>No hay mensajes. Escribe algo para comenzar.</p>}
                
                {messages.map(msg => {
                    const isMe = msg.profiles?.role !== 'employee' && msg.profiles?.role !== 'admin'; // Asumimos que yo soy el cliente
                    return (
                        <div key={msg.id} style={chatBubbleStyle(isMe)}>
                            <small style={{display:'block', fontSize:'10px', opacity:0.7, marginBottom:'2px'}}>
                                {isMe ? 'Tú' : 'Soporte'} - {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </small>
                            {msg.content}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe una duda..." 
                    style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid #444', background:'#252525', color:'white', outline:'none'}}
                />
                <button 
                    onClick={handleSendMessage}
                    style={{padding:'0 15px', background:'#3b82f6', border:'none', borderRadius:'6px', color:'white', cursor:'pointer'}}
                >
                    ➤
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};