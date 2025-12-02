import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
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

  // --- ESTADO DEL MODAL ---
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  useEffect(() => { loadOrderData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadOrderData = async () => {
    if (!id) return;
    setLoading(true);
    
    const { data: orderData } = await supabase.from('orders').select('*, projects(*)').eq('id', id).single();
    if (!orderData) { navigate('/portal'); return; }
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
    
    // Sanitizar nombre
    const sanitizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `${id}/${Date.now()}_${sanitizedName}`;
    
    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
    if (uploadError) { alert('Error: ' + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('order_attachments').insert([{ order_id: id, uploader_id: user?.id, file_name: file.name, file_url: publicUrl }]);
    setUploading(false); loadOrderData();
  };

  const handleDeleteAttachment = async (fileId: string, fileUrl: string, fileName: string) => {
    setModal({
      isOpen: true, title: 'Borrar Archivo', message: `¿Eliminar "${fileName}"?`, isDestructive: true,
      onConfirm: async () => {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/attachments/');
        if (pathParts.length > 1) await supabase.storage.from('attachments').remove([pathParts[1]]);
        await supabase.from('order_attachments').delete().eq('id', fileId);
        loadOrderData();
        closeModal();
      }
    });
  };

  const handleStatusChange = (status: string) => {
    const isAccepting = status === 'pedido';
    const isRejecting = status === 'rechazado';

    setModal({
      isOpen: true, 
      title: isAccepting ? 'Aceptar Presupuesto' : 'Rechazar Presupuesto', 
      message: isAccepting 
        ? '¿Confirmas que aceptas este presupuesto? Pasará a la lista de "Pedidos".'
        : 'Al rechazar, el presupuesto se moverá automáticamente a la carpeta "Archivados".',
      isDestructive: isRejecting,
      onConfirm: async () => {
        // Lógica clave: Si rechaza, también archiva.
        const updateData: any = { status: status };
        if (isRejecting) {
            updateData.is_archived = true;
        }

        await supabase.from('orders').update(updateData).eq('id', id);

        // En ambos casos salimos de la ficha
        if (isAccepting) navigate('/portal?tab=orders'); 
        if (isRejecting) navigate('/portal?tab=archived');
        
        closeModal();
      }
    });
  };

  const handleDelete = () => {
    if (!order) return;
    if (order.status !== 'pendiente') { alert("⚠️ No se puede borrar una solicitud en proceso."); return; }
    setModal({
      isOpen: true, title: 'Borrar Solicitud', message: 'Se borrará la solicitud y el PROYECTO 3D asociado. ¿Continuar?', isDestructive: true,
      onConfirm: async () => {
        const projectId = order.projects?.id || order.project_id;
        await supabase.from('orders').delete().eq('id', id);
        if (projectId) await supabase.from('projects').delete().eq('id', projectId);
        navigate('/portal?tab=orders');
        closeModal();
      }
    });
  };

  const handlePrintPDF = () => alert("🚧 PDF Oficial en construcción.");

  if (loading) return <p>Cargando...</p>;
  if (!order) return <p>Error.</p>;

  // Detectamos si está en un estado donde el cliente debe decidir
  const isDecisionTime = ['presupuestado', 'entregado'].includes(order.status);

  return (
    <div className="budget-detail-container">
      <ConfirmModal {...modal} onCancel={closeModal} />

      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', flexWrap:'wrap', gap:'10px'}}>
        <button onClick={() => navigate('/portal?tab=orders')} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}>← Volver</button>
        
        <div style={{display:'flex', gap:'10px'}}>
             {/* BOTONES DE DECISIÓN */}
             {isDecisionTime && (
                <>
                    <button onClick={() => handleStatusChange('pedido')} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                        ✅ Aceptar Presupuesto
                    </button>
                    <button onClick={() => handleStatusChange('rechazado')} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                        ❌ Rechazar
                    </button>
                </>
             )}

             {/* BOTÓN BORRAR (Solo pendiente) */}
             {order.status === 'pendiente' && (
                <button onClick={handleDelete} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>
                    🗑️ Borrar Solicitud
                </button>
             )}
             
             {/* El botón "Archivar" manual ha sido ELIMINADO según instrucciones */}
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
                        <span style={{display:'block', color:'#888'}}>Precio Final</span>
                        <span style={{fontSize:'24px', color:'#3b82f6', fontWeight:'bold'}}>{order.total_price.toLocaleString()} €</span>
                     </div>
                )}
            </div>

            <div style={cardStyle}>
                <h3 style={sectionHeaderStyle}>📎 Documentación Adjunta</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'15px'}}>
                    {attachments.map(file => (
                        <div key={file.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#252525', padding:'8px', borderRadius:'6px'}}>
                            <a href={file.file_url} target="_blank" rel="noreferrer" style={{color:'#3b82f6', textDecoration:'none', display:'flex', alignItems:'center', gap:'5px', flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>
                                📄 {file.file_name}
                            </a>
                            <button onClick={() => handleDeleteAttachment(file.id, file.file_url, file.file_name)} style={{background:'transparent', border:'none', color:'#e74c3c', cursor:'pointer', fontSize:'14px', padding:'0 5px'}}>🗑️</button>
                        </div>
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

        {/* COLUMNA DERECHA: CHAT */}
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
        </div>
      </div>
    </div>
  );
};