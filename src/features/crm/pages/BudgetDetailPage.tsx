import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PriceCalculator, PRICES } from '../../../utils/PriceCalculator';
import type { Order } from '../../../types/types';

// --- DATA CATALOGO SIMULADA ---
const CATALOG_ITEMS = [
    { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
    { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
    { id: 'slide_01', name: 'Tobogán Espiral', type: 'model', price: 2500 },
    { id: 'fence_wood', name: 'Valla de Madera', type: 'fence', price: PRICES.FENCE_M },
    { id: 'floor_rubber', name: 'Suelo de Caucho', type: 'floor', price: PRICES.FLOOR_M2 },
];

// --- ESTILOS ---
const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const };
const sectionHeaderStyle = { color: 'white', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display:'flex', justifyContent:'space-between', alignItems:'center' };

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pendiente': return { label: 'PENDIENTE DE REVISIÓN', color: '#e67e22' }; 
        case 'presupuestado': return { label: 'PRESUPUESTADO', color: '#8e44ad' }; 
        case 'pedido': return { label: 'PEDIDO CONFIRMADO', color: '#27ae60' }; 
        case 'fabricacion': return { label: 'EN FABRICACIÓN', color: '#d35400' }; 
        case 'rechazado': return { label: 'RECHAZADO', color: '#c0392b' }; 
        default: return { label: status.toUpperCase(), color: '#95a5a6' };
    }
};

export const BudgetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [order, setOrder] = useState<Order | null>(null);
  const [items3D, setItems3D] = useState<any[]>([]);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
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

    // Items Manuales
    const { data: mItems } = await supabase.from('order_items').select('*').eq('order_id', id);
    setManualItems(mItems || []);

    // Chat
    const { data: chatData } = await supabase.from('order_messages').select('*, profiles(full_name, role)').eq('order_id', id).order('created_at', { ascending: true });
    setMessages(chatData || []);

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

  // --- ACCIONES ITEMS ---
  const handleAddItem = (item: any) => {
      if (item.type === 'fence' || item.type === 'floor') {
          setParametricModal({ isOpen: true, item: item, value: '' });
      } else {
          saveManualItem(item.id, item.name, 1, item.price, '1 ud');
      }
  };

  const confirmParametricItem = () => {
      const val = parseFloat(parametricModal.value);
      if (!val || val <= 0) return alert("Introduce un valor válido");
      const item = parametricModal.item;
      let price = 0;
      let dimensions = '';
      if (item.type === 'fence') { price = val * PRICES.FENCE_M; dimensions = `${val} ml`; } 
      else { price = val * PRICES.FLOOR_M2; dimensions = `${val} m²`; }
      saveManualItem(item.id, item.name, 1, price, dimensions);
      setParametricModal({ isOpen: false, item: null, value: '' });
  };

  const saveManualItem = async (prodId: string, name: string, qty: number, total: number, dims: string) => {
      const { error } = await supabase.from('order_items').insert([{
          order_id: id, product_id: prodId, name: name, quantity: qty, total_price: total, dimensions: dims
      }]);
      if (error) { console.error(error); alert("Error al guardar ítem: " + error.message); return; }
      
      setIsCatalogOpen(false);
      loadOrderData(); // Recarga para ver el nuevo ítem
  };

  const handleDeleteManualItem = async (itemId: string) => {
      if(!confirm("¿Borrar línea?")) return;
      await supabase.from('order_items').delete().eq('id', itemId);
      loadOrderData();
  };

  // --- ACCIONES PEDIDO ---
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

  const handleCancelOrder = () => {
      setModal({
          isOpen: true, title: 'Cancelar Pedido', message: '¿Seguro? Pasará a archivados como cancelado.', isDestructive: true,
          onConfirm: async () => {
              await supabase.from('orders').update({ status: 'cancelado', is_archived: true }).eq('id', id);
              navigate('/portal?tab=archived');
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ order_id: id, user_id: user?.id, content: newMessage }]);
    setNewMessage(''); loadOrderData();
  };

  if (loading) return <p style={{color:'#888', padding:'20px'}}>Cargando...</p>;
  if (!order) return <p>Error.</p>;

  const badge = getStatusBadge(order.status);
  const isDecisionTime = order.status === 'presupuestado';
  const isPending = order.status === 'pendiente';
  const isOrderPhase = ['pedido', 'fabricacion'].includes(order.status);

  return (
    <div className="budget-detail-container">
      <ConfirmModal {...modal} onCancel={closeModal} />

      {/* --- CABECERA RESTAURADA (Botones Cancelar/Volver) --- */}
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', flexWrap:'wrap', gap:'10px'}}>
        <button onClick={() => navigate(-1)} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}>← Volver</button>
        
        <div style={{display:'flex', gap:'10px'}}>
             {isDecisionTime && (
                <>
                    <button onClick={() => handleStatusChange('pedido')} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>✅ Aceptar Presupuesto</button>
                    <button onClick={() => handleStatusChange('rechazado')} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>❌ Rechazar</button>
                </>
             )}
             {isOrderPhase && (
                 <button onClick={handleCancelOrder} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>🚫 Cancelar Pedido</button>
             )}
             {isPending && (
                <button onClick={handleDelete} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>🗑️ Borrar Solicitud</button>
             )}
        </div>
      </div>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA: DETALLES */}
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            
            {/* Tarjeta Info Principal */}
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0, color:'white'}}>Ref: {order.order_ref}</h2>
                    <span style={{padding:'5px 10px', borderRadius:'4px', background: badge.color, color: 'white', fontWeight:'bold'}}>{badge.label}</span>
                </div>
                <p style={{color:'#888', marginTop:'5px'}}>Solicitado el: {new Date(order.created_at).toLocaleString()}</p>
            </div>

            {/* Tarjeta ITEMS (Híbrida) */}
            <div style={cardStyle}>
                <div style={sectionHeaderStyle}>
                    <h3 style={{margin:0}}>📋 Desglose de Materiales</h3>
                    {/* Solo permitimos añadir si está pendiente o presupuestado */}
                    {(isPending || isDecisionTime) && (
                        <button onClick={() => setIsCatalogOpen(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'5px 15px', borderRadius:'4px', cursor:'pointer'}}>
                            + Añadir Extra
                        </button>
                    )}
                </div>

                <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px', marginTop:'10px'}}>
                    <thead style={{color:'#888', borderBottom:'1px solid #333', textAlign:'left'}}>
                        <tr>
                            <th style={{padding:'10px'}}>Concepto</th>
                            <th style={{padding:'10px'}}>Origen</th>
                            <th style={{padding:'10px', textAlign:'right'}}>Ud / Dim</th>
                            <th style={{padding:'10px', textAlign:'right'}}>Precio Estimado</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items3D.map((item, idx) => (
                            <tr key={`3d-${idx}`} style={{borderBottom:'1px solid #2a2a2a'}}>
                                <td style={{padding:'12px', color:'white'}}>{item.name}</td>
                                <td style={{padding:'12px', color:'#aaa', fontSize:'12px'}}>🕋 Diseño 3D</td>
                                <td style={{padding:'12px', textAlign:'right', color:'#ccc'}}>{item.info}</td>
                                <td style={{padding:'12px', textAlign:'right', fontWeight:'bold'}}>{item.price.toLocaleString()} €</td>
                                <td></td>
                            </tr>
                        ))}
                        {manualItems.map((item) => (
                            <tr key={item.id} style={{borderBottom:'1px solid #2a2a2a', background:'rgba(59, 130, 246, 0.05)'}}>
                                <td style={{padding:'12px', color:'white'}}>{item.name}</td>
                                <td style={{padding:'12px', color:'#3b82f6', fontSize:'12px'}}>✏️ Manual</td>
                                <td style={{padding:'12px', textAlign:'right', color:'#ccc'}}>{item.dimensions || item.quantity}</td>
                                <td style={{padding:'12px', textAlign:'right', fontWeight:'bold'}}>{item.total_price.toLocaleString()} €</td>
                                <td style={{textAlign:'right'}}>
                                    {(isPending || isDecisionTime) && <button onClick={() => handleDeleteManualItem(item.id)} style={{color:'#e74c3c', background:'none', border:'none', cursor:'pointer'}}>🗑️</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* --- LÓGICA DE PRECIOS VISIBLES --- */}
                <div style={{marginTop:'auto', paddingTop:'20px', borderTop:'1px solid #333', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px'}}>
                    
                    {/* Si está pendiente, solo mostramos el subtotal estimado */}
                    {isPending ? (
                        <>
                             <div style={{fontSize:'20px', fontWeight:'bold', color:'white'}}>
                                Subtotal Estimado: <span style={{color:'#aaa'}}>{totals.subtotal.toLocaleString()} €</span>
                            </div>
                             <small style={{color:'#e67e22', marginTop:'5px'}}>* El precio final y descuento serán confirmados por el administrador.</small>
                        </>
                    ) : (
                        // Si ya está presupuestado o pedido, mostramos el desglose completo
                        <>
                            <div style={{color:'#aaa'}}>Subtotal: <span style={{color:'white'}}>{totals.subtotal.toLocaleString()} €</span></div>
                            {totals.discountRate > 0 && (
                                <div style={{color:'#2ecc71'}}>Descuento Cliente ({totals.discountRate}%): -{totals.discountAmount.toLocaleString()} €</div>
                            )}
                            <div style={{fontSize:'24px', fontWeight:'bold', color:'white', marginTop:'10px'}}>
                                Total Final: <span style={{color:'#3b82f6'}}>{totals.final.toLocaleString()} €</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tarjeta PROYECTO 3D (Solo si existe) */}
            {order.projects && (
                <div style={cardStyle}>
                     <h3 style={sectionHeaderStyle}>Vista Diseño Original</h3>
                     <div style={{height:'200px', background:'#000', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'1px solid #333'}}>
                         {order.projects.thumbnail_url ? <img src={order.projects.thumbnail_url} style={{width:'100%', objectFit:'cover'}} alt="Vista"/> : '🏞️'}
                     </div>
                     <button onClick={() => window.location.href=`/?project_id=${order.project_id}&mode=readonly`} style={{marginTop:'15px', background:'#333', color:'white', border:'1px solid #555', padding:'10px', width:'100%', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                         Abrir Visor 3D 👁️
                     </button>
                </div>
            )}
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <div style={{...cardStyle, maxHeight:'80vh'}}>
            <h3 style={sectionHeaderStyle}>💬 Mensajes con Admin</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px', paddingRight:'5px'}}>
                {messages.length === 0 && <p style={{color:'#666', textAlign:'center', fontSize:'13px', marginTop:'20px'}}>Escribe aquí si tienes dudas.</p>}
                {messages.map(msg => {
                    const isMe = msg.profiles?.role === 'client';
                    return (
                        <div key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth:'85%', background: isMe ? '#3b82f6' : '#444', color:'white', padding:'10px 15px', borderRadius:'12px'}}>
                            {msg.content}
                            <div style={{fontSize:'9px', opacity:0.7, marginTop:'4px', textAlign:'right'}}>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key==='Enter' && handleSendMessage()} placeholder="Escribir mensaje..." style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid #444', background:'#252525', color:'white', outline:'none'}}/>
                <button onClick={handleSendMessage} style={{padding:'0 15px', background:'#3b82f6', border:'none', borderRadius:'6px', color:'white', cursor:'pointer'}}>➤</button>
            </div>
        </div>
      </div>

      {/* --- MODAL CATALOGO --- */}
      {isCatalogOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
              <div style={{background:'#1e1e1e', width:'600px', maxHeight:'80vh', borderRadius:'12px', border:'1px solid #444', display:'flex', flexDirection:'column'}}>
                  <div style={{padding:'20px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h3 style={{margin:0, color:'white'}}>Añadir Elemento Extra</h3>
                      <button onClick={() => setIsCatalogOpen(false)} style={{background:'none', border:'none', color:'#888', fontSize:'20px', cursor:'pointer'}}>✕</button>
                  </div>
                  <div style={{padding:'20px', overflowY:'auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                      {CATALOG_ITEMS.map(item => (
                          <div key={item.id} onClick={() => handleAddItem(item)} style={{background:'#252525', padding:'15px', borderRadius:'8px', cursor:'pointer', border:'1px solid #333', transition:'0.2s'}} onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseOut={e => e.currentTarget.style.borderColor = '#333'}>
                              <div style={{fontWeight:'bold', color:'white'}}>{item.name}</div>
                              <div style={{color:'#888', fontSize:'12px', marginTop:'5px'}}>{item.type === 'model' ? `${item.price} € / ud` : 'Precio por medida'}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL INPUT PARAMETRICO --- */}
      {parametricModal.isOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
              <div style={{background:'#1e1e1e', padding:'30px', borderRadius:'12px', width:'350px', border:'1px solid #444'}}>
                  <h3 style={{margin:'0 0 15px 0', color:'white'}}>{parametricModal.item?.name}</h3>
                  <label style={{display:'block', color:'#aaa', marginBottom:'10px'}}>
                      {parametricModal.item?.type === 'fence' ? 'Longitud total (metros lineales):' : 'Área total (metros cuadrados):'}
                  </label>
                  <input type="number" autoFocus value={parametricModal.value} onChange={e => setParametricModal({...parametricModal, value: e.target.value})} placeholder="Ej: 15.5" style={{width:'100%', padding:'10px', background:'#252525', border:'1px solid #444', color:'white', borderRadius:'6px', fontSize:'18px', marginBottom:'20px'}}/>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                      <button onClick={() => setParametricModal({isOpen:false, item:null, value:''})} style={{padding:'10px', background:'transparent', color:'#888', border:'none', cursor:'pointer'}}>Cancelar</button>
                      <button onClick={confirmParametricItem} style={{padding:'10px 20px', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>Añadir</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};