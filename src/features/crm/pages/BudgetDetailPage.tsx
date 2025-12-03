import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PriceCalculator, PRICES } from '../../../utils/PriceCalculator';
import type { Order } from '../../../types/types';

// DATA CATALOGO
const CATALOG_ITEMS = [
    { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
    { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
    { id: 'slide_01', name: 'Tobogán Espiral', type: 'model', price: 2500 },
    { id: 'fence_wood', name: 'Valla de Madera', type: 'fence', price: PRICES.FENCE_M },
    { id: 'floor_rubber', name: 'Suelo de Caucho', type: 'floor', price: PRICES.FLOOR_M2 },
];

const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const, marginBottom: '20px' };
const sectionHeaderStyle = { color: 'white', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display:'flex', justifyContent:'space-between', alignItems:'center' };

const formatMoney = (amount: number) => amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pendiente': return { label: 'PENDIENTE DE REVISIÓN', color: '#e67e22' }; 
        case 'presupuestado': return { label: 'PRESUPUESTADO', color: '#8e44ad' }; 
        case 'pedido': return { label: 'PEDIDO CONFIRMADO', color: '#27ae60' }; 
        case 'fabricacion': return { label: 'EN FABRICACIÓN', color: '#d35400' }; 
        case 'rechazado': return { label: 'RECHAZADO', color: '#c0392b' }; 
        case 'cancelado': return { label: 'CANCELADO', color: '#7f8c8d' };
        default: return { label: status.toUpperCase(), color: '#95a5a6' };
    }
};

export const BudgetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [items3D, setItems3D] = useState<any[]>([]);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Nombres y Notas
  const [customName, setCustomName] = useState('');
  // OBSERVACIONES (Historial)
  const [observations, setObservations] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');
  
  // Archivos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Modals
  const [parametricModal, setParametricModal] = useState<{isOpen: boolean, item: any | null, value: string}>({ isOpen: false, item: null, value: '' });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  useEffect(() => { loadOrderData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadOrderData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: orderData } = await supabase.from('orders').select('*, projects(*), profiles(discount_rate)').eq('id', id).single();
    if (!orderData) { navigate('/portal'); return; }
    
    // Items 3D
    let calculated3DItems: any[] = [];
    if (orderData.projects && orderData.projects.data && orderData.projects.data.items) {
        calculated3DItems = orderData.projects.data.items.map((item: any) => ({
            uuid: item.uuid,
            name: item.name || 'Elemento 3D',
            quantity: 1,
            info: PriceCalculator.getItemDimensions(item),
            price: PriceCalculator.getItemPrice(item),
            is3D: true
        }));
    }
    setItems3D(calculated3DItems);
    setOrder(orderData as any);
    
    if(orderData.custom_name) setCustomName(orderData.custom_name);

    // Items Manuales
    const { data: mItems } = await supabase.from('order_items').select('*').eq('order_id', id);
    setManualItems(mItems || []);

    // Chat
    const { data: chatData } = await supabase.from('order_messages').select('*, profiles(full_name, role)').eq('order_id', id).order('created_at', { ascending: true });
    setMessages(chatData || []);

    // Adjuntos
    const { data: att } = await supabase.from('order_attachments').select('*').eq('order_id', id);
    setAttachments(att || []);

    // Cargar Historial Observaciones
    const { data: obs } = await supabase
        .from('order_observations')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: false }); // Las más nuevas arriba
    setObservations(obs || []);

    setLoading(false);
  };

  const calculateTotal = () => {
      const total3D = items3D.reduce((acc, item) => acc + item.price, 0);
      const totalManual = manualItems.reduce((acc, item) => acc + item.total_price, 0);
      const subtotal = total3D + totalManual;
      const discountRate = (order as any)?.profiles?.discount_rate || 0;
      const discountAmount = subtotal * (discountRate / 100);
      return { subtotal, discountRate, discountAmount, final: subtotal - discountAmount };
  };
  const totals = calculateTotal();

  // --- ACCIONES DATOS ---
  const handleSaveName = async () => {
      const { error } = await supabase.from('orders').update({ custom_name: customName }).eq('id', id);
      if(error) alert("Error: " + error.message);
      else alert("✅ Nombre guardado");
  };

  const handleAddObservation = async () => {
      if(!newObservation.trim()) return;
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('order_observations').insert([{
          order_id: id,
          user_id: user?.id,
          content: newObservation
      }]);
      
      if(error) alert("Error: " + error.message);
      else {
          setNewObservation('');
          loadOrderData();
      }
  };

  // --- ACCIONES ITEMS ---
  const handleAddItem = (item: any) => {
      if (order?.status !== 'pendiente') return alert("Solo puedes añadir elementos si el presupuesto está pendiente.");
      
      if (item.type === 'fence' || item.type === 'floor') {
          setParametricModal({ isOpen: true, item: item, value: '' });
      } else {
          saveManualItem(item.id, item.name, 1, item.price, '1 ud');
      }
  };

  const confirmParametricItem = () => {
      const val = parseFloat(parametricModal.value);
      if (!val || val <= 0) return alert("Valor inválido");
      const item = parametricModal.item;
      let price = 0;
      let dimensions = '';
      if (item.type === 'fence') { price = val * PRICES.FENCE_M; dimensions = `${val} ml`; } 
      else { price = val * PRICES.FLOOR_M2; dimensions = `${val} m²`; }
      saveManualItem(item.id, item.name, 1, price, dimensions);
      setParametricModal({ isOpen: false, item: null, value: '' });
  };

  const saveManualItem = async (prodId: string, name: string, qty: number, total: number, dims: string) => {
      await supabase.from('order_items').insert([{
          order_id: id, product_id: prodId, name: name, quantity: qty, total_price: total, dimensions: dims
      }]);
      setIsCatalogOpen(false);
      loadOrderData(); 
  };

  const handleDeleteManualItem = async (itemId: string) => {
      if (order?.status !== 'pendiente') return alert("Solo editable en fase pendiente.");
      if(!confirm("¿Borrar línea?")) return;
      await supabase.from('order_items').delete().eq('id', itemId);
      loadOrderData();
  };

  // --- ARCHIVOS ---
  const handleFileUpload = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${id}/${fileName}`;
          await supabase.storage.from('attachments').upload(filePath, file);
          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
          await supabase.from('order_attachments').insert([{
              order_id: id, file_name: file.name, file_url: publicUrl, uploader_id: (await supabase.auth.getUser()).data.user?.id
          }]);
          loadOrderData();
      } catch (error: any) { alert('Error al subir: ' + error.message); } 
      finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (attId: string) => {
      if(!confirm("¿Borrar archivo?")) return;
      await supabase.from('order_attachments').delete().eq('id', attId);
      loadOrderData();
  };

  // --- ESTADOS Y BOTONES ---
  const handleStatusChange = (status: string) => {
      setModal({
          isOpen: true,
          title: status === 'pedido' ? 'Confirmar Pedido' : 'Rechazar Presupuesto',
          message: status === 'pedido' ? 'Al aceptar, el pedido pasará a fabricación.' : 'El presupuesto pasará a archivados.',
          isDestructive: status === 'rechazado',
          onConfirm: async () => {
              const update: any = { status: status, total_price: totals.final };
              if (status === 'pedido') {
                  const d = new Date(); d.setDate(d.getDate() + 42); 
                  update.estimated_delivery_date = d.toISOString();
              }
              await supabase.from('orders').update(update).eq('id', id);
              if (status==='pedido') navigate('/portal?tab=orders');
              else navigate('/portal?tab=archived');
              closeModal();
          }
      });
  };

  const handleDelete = () => {
      setModal({
          isOpen: true, title: 'Borrar Solicitud', message: 'Se borrará la solicitud y el diseño. ¿Continuar?', isDestructive: true,
          onConfirm: async () => {
              await supabase.from('orders').delete().eq('id', id);
              navigate('/portal?tab=orders');
              closeModal();
          }
      });
  };
  
  const handleCancelOrder = () => {
      setModal({
          isOpen: true, title: 'Cancelar Pedido', message: 'El pedido pasará a cancelado.', isDestructive: true,
          onConfirm: async () => {
              await supabase.from('orders').update({ status: 'cancelado', is_archived: true }).eq('id', id);
              navigate('/portal?tab=archived');
              closeModal();
          }
      });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ order_id: id, user_id: user?.id, content: newMessage }]);
    setNewMessage(''); loadOrderData();
  };

  if (loading) return <p style={{color:'#888', padding:'20px'}}>Cargando...</p>;
  if (!order) return <p>Error.</p>;

  const badge = getStatusBadge(order.status);
  const isPending = order.status === 'pendiente'; 
  const isDecisionTime = order.status === 'presupuestado';
  const isOrderConfirmed = order.status === 'pedido'; 
  const isLocked = !isPending && !isOrderConfirmed && order.status !== 'presupuestado';

  return (
    <div className="budget-detail-container">
      <ConfirmModal {...modal} onCancel={closeModal} />

      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', flexWrap:'wrap', gap:'10px'}}>
        <button onClick={() => navigate(-1)} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}>← Volver</button>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
             {isLocked && <span style={{color:'#888', fontSize:'12px', marginRight:'10px'}}>⚠️ Cambios solo vía chat</span>}
             {isDecisionTime && (
                <>
                    <button onClick={() => handleStatusChange('pedido')} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>✅ Aceptar Presupuesto</button>
                    <button onClick={() => handleStatusChange('rechazado')} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>❌ Rechazar</button>
                </>
             )}
             {isOrderConfirmed && <button onClick={handleCancelOrder} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>🚫 Cancelar Pedido</button>}
             {isPending && <button onClick={handleDelete} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>🗑️ Borrar Solicitud</button>}
        </div>
      </div>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            
            {/* INFO Y NOMBRE */}
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0, color:'white'}}>Ref: {order.order_ref}</h2>
                    <span style={{padding:'5px 10px', borderRadius:'4px', background: badge.color, color: 'white', fontWeight:'bold'}}>{badge.label}</span>
                </div>
                
                {/* CAMPO NOMBRE PERSONALIZADO */}
                <div style={{marginTop:'15px'}}>
                    <label style={{color:'#aaa', fontSize:'12px', display:'block', marginBottom:'5px'}}>Nombre del Proyecto / Referencia Personal:</label>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input 
                            type="text" 
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder="Ej: Reforma Parque Infantil Comunidad..."
                            disabled={!isPending && !isDecisionTime}
                            style={{flex:1, padding:'10px', background:'#252525', border:'1px solid #444', borderRadius:'6px', color:'white'}}
                        />
                        {(isPending || isDecisionTime) && (
                            <button onClick={handleSaveName} style={{background:'#333', border:'1px solid #555', color:'white', borderRadius:'6px', padding:'0 15px', cursor:'pointer'}}>💾</button>
                        )}
                    </div>
                </div>
                
                <p style={{color:'#888', marginTop:'10px', fontSize:'13px'}}>Solicitado el: {new Date(order.created_at).toLocaleString()}</p>
                {order.estimated_delivery_date && (
                    <p style={{color:'#3498db', marginTop:'0', fontWeight:'bold'}}>📅 Fecha Entrega Estimada: {new Date(order.estimated_delivery_date).toLocaleDateString()}</p>
                )}
            </div>

            {/* OBSERVACIONES CRONOLÓGICAS (NUEVO) */}
            <div style={cardStyle}>
                <h3 style={sectionHeaderStyle}>📝 Historial de Observaciones</h3>
                
                {/* Lista de observaciones anteriores */}
                <div style={{maxHeight:'200px', overflowY:'auto', marginBottom:'15px', display:'flex', flexDirection:'column', gap:'10px'}}>
                    {observations.length === 0 && <p style={{color:'#666', fontStyle:'italic', fontSize:'13px'}}>No hay observaciones registradas.</p>}
                    {observations.map(obs => (
                        <div key={obs.id} style={{background:'#252525', padding:'10px', borderRadius:'6px', borderLeft:`3px solid ${obs.profiles?.role === 'admin' ? '#e67e22' : '#3b82f6'}`}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                <span style={{fontWeight:'bold', fontSize:'12px', color:'white'}}>
                                    {obs.profiles?.role === 'admin' ? '🏢 Administrador' : '👤 Tú'}
                                </span>
                                <span style={{fontSize:'11px', color:'#888'}}>{new Date(obs.created_at).toLocaleString()}</span>
                            </div>
                            <p style={{margin:0, fontSize:'13px', color:'#ddd', whiteSpace:'pre-wrap'}}>{obs.content}</p>
                        </div>
                    ))}
                </div>

                {/* Input nueva observación */}
                {(isPending || isDecisionTime) ? (
                    <div style={{display:'flex', gap:'10px'}}>
                        <input 
                            type="text" 
                            value={newObservation}
                            onChange={e => setNewObservation(e.target.value)}
                            placeholder="Añadir nueva observación o nota..."
                            style={{flex:1, padding:'10px', background:'#252525', border:'1px solid #444', color:'white', borderRadius:'6px'}}
                        />
                        <button onClick={handleAddObservation} style={{background:'#3b82f6', color:'white', border:'none', padding:'0 20px', borderRadius:'6px', cursor:'pointer'}}>Añadir</button>
                    </div>
                ) : (
                    <p style={{fontSize:'12px', color:'#666'}}>* No se pueden añadir más observaciones en este estado.</p>
                )}
            </div>

            {/* ARCHIVOS */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <h3 style={{margin:0}}>📎 Archivos y Planos</h3>
                    <label style={{background:'#333', color:'white', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'12px', border:'1px solid #555'}}>
                        {uploading ? '...' : '+ Adjuntar'}
                        <input type="file" onChange={handleFileUpload} style={{display:'none'}} disabled={uploading} />
                    </label>
                </div>
                {attachments.length === 0 ? <p style={{color:'#666', fontSize:'13px'}}>Sin archivos.</p> : (
                    <ul style={{listStyle:'none', padding:0, margin:0}}>
                        {attachments.map(att => (
                            <li key={att.id} style={{display:'flex', justifyContent:'space-between', background:'#252525', padding:'8px', marginBottom:'5px', borderRadius:'4px'}}>
                                <a href={att.file_url} target="_blank" rel="noreferrer" style={{color:'#3b82f6', textDecoration:'none', fontSize:'13px'}}>{att.file_name}</a>
                                <button onClick={() => handleDeleteAttachment(att.id)} style={{border:'none', background:'none', color:'#e74c3c', cursor:'pointer'}}>🗑️</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* MATERIALES */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <h3 style={{margin:0}}>📋 Desglose</h3>
                    {isPending && <button onClick={() => setIsCatalogOpen(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'5px 15px', borderRadius:'4px', cursor:'pointer'}}>+ Añadir Extra</button>}
                </div>

                <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px', marginTop:'10px'}}>
                    <tbody>
                        {items3D.map((item, idx) => (
                            <tr key={`3d-${idx}`} style={{borderBottom:'1px solid #2a2a2a'}}>
                                <td style={{padding:'12px', color:'white'}}>{item.name}</td>
                                <td style={{padding:'12px', color:'#aaa', fontSize:'12px'}}>🕋 3D</td>
                                <td style={{padding:'12px', textAlign:'right', fontWeight:'bold'}}>{formatMoney(item.price)}</td>
                            </tr>
                        ))}
                        {manualItems.map((item) => (
                            <tr key={item.id} style={{borderBottom:'1px solid #2a2a2a', background:'rgba(59, 130, 246, 0.05)'}}>
                                <td style={{padding:'12px', color:'white'}}>{item.name} <small>({item.dimensions})</small></td>
                                <td style={{padding:'12px', color:'#3b82f6', fontSize:'12px'}}>✏️ Manual</td>
                                <td style={{padding:'12px', textAlign:'right', fontWeight:'bold'}}>{formatMoney(item.total_price)}</td>
                                <td style={{textAlign:'right'}}>
                                    {isPending && <button onClick={() => handleDeleteManualItem(item.id)} style={{color:'#e74c3c', background:'none', border:'none', cursor:'pointer'}}>🗑️</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <div style={{marginTop:'20px', borderTop:'1px solid #333', textAlign:'right', paddingTop:'10px'}}>
                    {isPending ? (
                        <div style={{fontSize:'18px', color:'white'}}>Estimado: {formatMoney(totals.subtotal)}</div>
                    ) : (
                        <>
                            <div style={{color:'#aaa'}}>Subtotal: {formatMoney(totals.subtotal)}</div>
                            {totals.discountRate > 0 && <div style={{color:'#2ecc71'}}>Dto {totals.discountRate}%: -{formatMoney(totals.discountAmount)}</div>}
                            <div style={{fontSize:'22px', fontWeight:'bold', color:'#3b82f6', marginTop:'5px'}}>Total: {formatMoney(totals.final)}</div>
                        </>
                    )}
                </div>
            </div>

            {/* PROYECTO 3D */}
            {order.projects && (
                <div style={cardStyle}>
                     <h3 style={sectionHeaderStyle}>Diseño 3D</h3>
                     <div style={{height:'150px', background:'#000', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'1px solid #333'}}>
                         {order.projects.thumbnail_url ? <img src={order.projects.thumbnail_url} style={{width:'100%', objectFit:'cover'}} alt="Vista"/> : '🏞️'}
                     </div>
                     <button onClick={() => window.location.href=`/?project_id=${order.project_id}&mode=readonly`} style={{marginTop:'15px', background:'#333', color:'white', border:'1px solid #555', padding:'10px', width:'100%', borderRadius:'6px', cursor:'pointer'}}>Abrir Visor 3D 👁️</button>
                </div>
            )}
        </div>

        {/* CHAT */}
        <div style={{...cardStyle, maxHeight:'80vh', marginBottom:0}}>
            <h3 style={sectionHeaderStyle}>💬 Chat</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px', paddingRight:'5px'}}>
                {messages.map(msg => {
                    const isMe = msg.profiles?.role === 'client';
                    return (
                        <div key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth:'85%', background: isMe ? '#3b82f6' : '#444', color:'white', padding:'10px 15px', borderRadius:'12px'}}>
                            {msg.content}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key==='Enter' && handleSendMessage()} placeholder="Mensaje..." style={{flex:1, padding:'10px', borderRadius:'6px', background:'#252525', border:'none', color:'white'}}/>
                <button onClick={handleSendMessage} style={{padding:'0 15px', background:'#3b82f6', border:'none', borderRadius:'6px', color:'white'}}>➤</button>
            </div>
        </div>
      </div>

      {/* MODALES CATALOGO (IGUAL QUE ADMIN) */}
      {isCatalogOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
              <div style={{background:'#1e1e1e', width:'600px', maxHeight:'80vh', borderRadius:'12px', border:'1px solid #444', display:'flex', flexDirection:'column'}}>
                  <div style={{padding:'20px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h3 style={{margin:0, color:'white'}}>Añadir Extra</h3>
                      <button onClick={() => setIsCatalogOpen(false)} style={{background:'none', border:'none', color:'#888', fontSize:'20px'}}>✕</button>
                  </div>
                  <div style={{padding:'20px', overflowY:'auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                      {CATALOG_ITEMS.map(item => (
                          <div key={item.id} onClick={() => handleAddItem(item)} style={{background:'#252525', padding:'15px', borderRadius:'8px', cursor:'pointer', border:'1px solid #333'}}>
                              <div style={{fontWeight:'bold', color:'white'}}>{item.name}</div>
                              <div style={{color:'#888', fontSize:'12px'}}>{item.type === 'model' ? `${item.price} €` : 'Paramétrico'}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      {parametricModal.isOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
              <div style={{background:'#1e1e1e', padding:'30px', borderRadius:'12px', width:'350px', border:'1px solid #444'}}>
                  <h3 style={{margin:'0 0 15px 0', color:'white'}}>{parametricModal.item?.name}</h3>
                  <input type="number" autoFocus value={parametricModal.value} onChange={e => setParametricModal({...parametricModal, value: e.target.value})} placeholder="Cantidad" style={{width:'100%', padding:'10px', marginBottom:'20px'}}/>
                  <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                      <button onClick={() => setParametricModal({isOpen:false, item:null, value:''})}>Cancelar</button>
                      <button onClick={confirmParametricItem}>Añadir</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};