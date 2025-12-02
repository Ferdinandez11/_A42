import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import type { Order } from '../../../types/types'; 

// --- ESTILOS ---
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
const sectionHeaderStyle = { color: 'white', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display:'flex', justifyContent:'space-between', alignItems:'center' };

export const BudgetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadOrderData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadOrderData = async () => {
    if (!id) return;
    setLoading(true);
    
    const { data: orderData, error } = await supabase.from('orders').select('*, projects(*)').eq('id', id).single();
    if (error) { alert('Error cargando pedido'); navigate('/portal'); return; }
    setOrder(orderData as any);

    const { data: chatData } = await supabase.from('order_messages').select('*, profiles(full_name, role)').eq('order_id', id).order('created_at', { ascending: true });
    setMessages(chatData || []);

    const { data: files } = await supabase.from('order_attachments').select('*').eq('order_id', id);
    setAttachments(files || []);

    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('order_messages').insert([{ order_id: id, user_id: user.id, content: newMessage }]);
    if (!error) { setNewMessage(''); loadOrderData(); }
  };

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file || !id) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}/${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
    if (uploadError) { alert('Error subiendo archivo: ' + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('order_attachments').insert([{ order_id: id, uploader_id: user?.id, file_name: file.name, file_url: publicUrl }]);
    setUploading(false); loadOrderData();
  };

  const handleStatusChange = async (status: string) => {
    if(!confirm(`¿Marcar como ${status}?`)) return;
    const { error } = await supabase.from('orders').update({ status: status }).eq('id', id);
    if(error) alert("Error al actualizar estado: " + error.message);
    else loadOrderData();
  };

 const handleDelete = async () => {
    if (!order) return;
    
    // 1. Validación de estado
    if (order.status !== 'pendiente') {
        alert("⚠️ No se puede borrar una solicitud en proceso.");
        return;
    }

    // 2. Confirmación
    if (confirm("¿Seguro que quieres borrar esta solicitud permanentemente? \n\n⚠️ ESTO BORRARÁ TAMBIÉN EL PROYECTO 3D ASOCIADO.")) {
        
        // Guardamos el ID del proyecto antes de borrar el pedido
        const projectId = order.projects?.id || order.project_id;

        // 3. Borramos el Pedido
        const { error: orderError } = await supabase.from('orders').delete().eq('id', id);

        if (orderError) {
            alert("❌ Error al borrar el pedido: " + orderError.message);
        } else {
            // 4. Si el pedido se borró bien, BORRAMOS EL PROYECTO 3D asociado
            if (projectId) {
                const { error: projectError } = await supabase.from('projects').delete().eq('id', projectId);
                if (projectError) {
                    console.error("El pedido se borró, pero hubo error borrando el proyecto 3D:", projectError.message);
                }
            }

            // 5. Volver al listado
            navigate('/portal?tab=orders');
        }
    }
  };

  const handleArchive = async () => {
    if (!confirm("¿Archivar este presupuesto?")) return;
    
    const { error } = await supabase.from('orders').update({ is_archived: true }).eq('id', id);
    
    if (error) {
        alert("❌ Error al archivar: " + error.message + "\n(Revisa los permisos RLS en Supabase)");
    } else {
        // Forzamos una recarga limpia yendo al dashboard
        navigate('/portal?tab=orders');
    }
  };

  // PDF Placeholder
  const handlePrintPDF = () => {
    alert("🚧 Funcionalidad PDF en construcción.\n\nPróximamente se descargará el PDF oficial generado por el motor 3D.");
  };

  if (loading) return <p>Cargando...</p>;
  if (!order) return <p>Error.</p>;

  // Solo permite archivar si NO está pendiente (es decir, si ya se terminó o rechazó)
  // O si prefieres que se pueda archivar siempre que no sea pendiente:
  const canArchive = order.status !== 'pendiente'; 

  return (
    <div className="budget-detail-container">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
        <button onClick={() => navigate('/portal?tab=orders')} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}>← Volver</button>
        <div style={{display:'flex', gap:'10px'}}>
             {/* El botón borrar solo sale si es pendiente */}
             {order.status === 'pendiente' && (
                <button onClick={handleDelete} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>🗑️ Borrar Solicitud</button>
             )}
             
             {/* El botón archivar sale si NO es pendiente */}
             {canArchive && (
                 <button onClick={handleArchive} style={{background:'#7f8c8d', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>🗄️ Archivar</button>
             )}
        </div>
      </div>
      
      <div style={containerStyle}>
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0, color:'white'}}>Ref: {order.order_ref}</h2>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={handlePrintPDF} style={{background:'#222', color:'#888', border:'1px solid #444', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>🖨️ PDF Oficial</button>
                        <span style={{padding:'5px 10px', borderRadius:'4px', background: order.status === 'pendiente' ? '#e67e22' : (order.status === 'rechazado' ? '#e74c3c' : '#27ae60'), color:'black', fontWeight:'bold'}}>
                            {order.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <p style={{color:'#888', marginTop:'5px'}}>Solicitado el: {new Date(order.created_at).toLocaleString()}</p>
                <div style={{marginTop:'20px', background:'#252525', padding:'15px', borderRadius:'8px'}}>
                    <h4 style={{margin:'0', color:'#aaa'}}>📅 Entrega Estimada: <span style={{color:'white'}}>{order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString() : 'Pendiente'}</span></h4>
                </div>
            </div>

            <div style={{...cardStyle, flex:1}}>
                <h3 style={sectionHeaderStyle}>Detalle del Proyecto</h3>
                {order.projects ? (
                    <div>
                        <p style={{color:'#aaa'}}>Proyecto: <strong style={{color:'white'}}>{order.projects.name}</strong></p>
                        <div style={{width:'100%', height:'250px', background: '#111', borderRadius:'8px', overflow: 'hidden', display:'flex', alignItems:'center', justifyContent:'center', border: '1px solid #333'}}>
                            {order.projects?.thumbnail_url ? <img src={order.projects.thumbnail_url} alt="Vista" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : '🏞️'}
                        </div>
                        <button onClick={() => order.projects?.id && (window.location.href = `/?project_id=${order.projects.id}&mode=clone`)} style={{marginTop: '15px', width: '100%', padding: '12px', background: '#333', color: 'white', border: '1px dashed #666', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                            <span>✏️</span> Editar Copia en 3D
                        </button>
                    </div>
                ) : <p>Catálogo</p>}
                
                {order.total_price > 0 && (
                     <div style={{marginTop:'auto', paddingTop:'20px', borderTop:'1px solid #333', textAlign:'right'}}>
                        <span style={{fontSize:'24px', color:'#3b82f6', fontWeight:'bold'}}>{order.total_price.toLocaleString()} €</span>
                     </div>
                )}
            </div>

            <div style={cardStyle}>
                <h3 style={sectionHeaderStyle}>📎 Documentación Adjunta</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'15px'}}>
                    {attachments.map(file => (
                        <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" style={{color:'#3b82f6', textDecoration:'none', display:'flex', alignItems:'center', gap:'5px'}}>
                            📄 {file.file_name}
                        </a>
                    ))}
                    {attachments.length === 0 && <span style={{color:'#666', fontSize:'13px'}}>No hay archivos adjuntos.</span>}
                </div>
                <div style={{borderTop:'1px solid #333', paddingTop:'10px'}}>
                    <label style={{cursor:'pointer', display:'inline-block', background:'#333', padding:'8px 12px', borderRadius:'6px', fontSize:'13px', color:'white'}}>
                        {uploading ? 'Subiendo...' : '📤 Subir Archivo / Imagen'}
                        <input type="file" onChange={handleFileUpload} style={{display:'none'}} disabled={uploading} />
                    </label>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{...cardStyle, maxHeight:'80vh'}}>
            <h3 style={sectionHeaderStyle}>💬 Mensajes</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', paddingRight:'5px'}}>
                {messages.map(msg => (
                    <div key={msg.id} style={chatBubbleStyle(msg.profiles?.role !== 'employee')}>
                        <small style={{display:'block', fontSize:'10px', opacity:0.7}}>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                        {msg.content}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key==='Enter' && handleSendMessage()} placeholder="Escribe..." style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid #444', background:'#252525', color:'white'}}/>
                <button onClick={handleSendMessage} style={{padding:'0 15px', background:'#3b82f6', border:'none', borderRadius:'6px', color:'white'}}>➤</button>
            </div>
            {order.status === 'presupuestado' && (
                 <div style={{marginTop:'20px', display:'flex', gap:'10px'}}>
                    <button onClick={() => handleStatusChange('pedido')} style={{flex:1, padding:'10px', background:'#27ae60', border:'none', borderRadius:'6px', color:'white', fontWeight:'bold'}}>✅ ACEPTAR</button>
                    <button onClick={() => handleStatusChange('rechazado')} style={{flex:1, padding:'10px', background:'#c0392b', border:'none', borderRadius:'6px', color:'white', fontWeight:'bold'}}>❌ RECHAZAR</button>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};