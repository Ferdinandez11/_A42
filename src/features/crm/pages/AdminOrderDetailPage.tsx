import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PriceCalculator, PRICES } from '../../../utils/PriceCalculator';
import { generateBillOfMaterials } from '../../../utils/budgetUtils';

const CATALOG_ITEMS = [
    { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
    { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
    { id: 'slide_01', name: 'Tobogán Espiral', type: 'model', price: 2500 },
    { id: 'fence_wood', name: 'Valla de Madera', type: 'fence', price: PRICES.FENCE_M },
    { id: 'floor_rubber', name: 'Suelo de Caucho', type: 'floor', price: PRICES.FLOOR_M2 },
];

const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%', color: '#e0e0e0', fontFamily: 'sans-serif' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' as const, marginBottom: '20px' };
const inputStyle = { background: '#252525', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '6px', width: '100%', marginBottom: '15px' };
const labelStyle = { display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '13px' };

const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

export const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  
  // Items
  const [items3D, setItems3D] = useState<any[]>([]); // Items del diseño 3D
  const [manualItems, setManualItems] = useState<any[]>([]); // Extras añadidos
  const [calculatedBasePrice, setCalculatedBasePrice] = useState(0); // Suma total real

  // Chat y Datos
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState('');
  
  // OBSERVACIONES (Historial)
  const [observations, setObservations] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');

  // Archivos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // UI Admin Extras
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [parametricModal, setParametricModal] = useState<{isOpen: boolean, item: any | null, value: string}>({ isOpen: false, item: null, value: '' });

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
        
        // 1.1 Procesar Items 3D (Solo lectura, vienen del proyecto)
        let total3D = 0;
        let processed3DItems: any[] = [];

        if (o.projects && o.projects.items) {
            const itemsWithRealPrices = o.projects.items.map((item: any) => ({
                ...item,
                price: PriceCalculator.getItemPrice(item) 
            }));
            // Agrupamos para visualización limpia (BOM)
            processed3DItems = generateBillOfMaterials(itemsWithRealPrices);
            total3D = PriceCalculator.calculateProjectTotal(itemsWithRealPrices);
        }
        setItems3D(processed3DItems);

        // 1.2 Cargar Items Manuales (Extras añadidos por cliente o admin)
        const { data: mItems } = await supabase.from('order_items').select('*').eq('order_id', id);
        const manual = mItems || [];
        setManualItems(manual);

        // 1.3 Calcular Total Base Real (Suma de todo sin descuentos)
        const totalManual = manual.reduce((acc: number, item: any) => acc + item.total_price, 0);
        setCalculatedBasePrice(total3D + totalManual);
    }

    // 2. Chat
    const { data: m } = await supabase.from('order_messages').select('*, profiles(full_name, role)').eq('order_id', id).order('created_at', { ascending: true });
    setMessages(m || []);

    // 3. Adjuntos
    const { data: att } = await supabase.from('order_attachments').select('*').eq('order_id', id);
    setAttachments(att || []);

    // 4. Observaciones
    const { data: obs } = await supabase
        .from('order_observations')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: false });
    setObservations(obs || []);
  };

  // --- LÓGICA DE ACTUALIZACIÓN PEDIDO ---
  const handleUpdateOrder = async () => {
    if (!order) return;
    const { error } = await supabase.from('orders').update({
        status: order.status,
        custom_name: order.custom_name, 
        estimated_delivery_date: new Date(newDate).toISOString(),
        total_price: order.total_price 
    }).eq('id', id);

    if (error) alert("Error actualizando: " + error.message);
    else alert("✅ Pedido actualizado correctamente");
  };

  const handleStatusChangeRaw = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const status = e.target.value;
      const now = new Date();
      let calculatedDate = new Date(newDate || now);

      if (status === 'presupuestado') calculatedDate = new Date(now.getTime() + (48 * 60 * 60 * 1000));
      else if (status === 'pedido') calculatedDate = new Date(now.getTime() + (6 * 7 * 24 * 60 * 60 * 1000));

      setNewDate(calculatedDate.toISOString().slice(0, 16));
      setOrder({...order, status: status});
  };

  const applyClientDiscount = () => {
      const discount = order.profiles?.discount_rate || 0;
      const discountAmount = calculatedBasePrice * (discount / 100);
      const finalPrice = calculatedBasePrice - discountAmount;
      if(confirm(`Base: ${formatMoney(calculatedBasePrice)}\nDto (${discount}%): -${formatMoney(discountAmount)}\n\nTotal: ${formatMoney(finalPrice)}`)) {
          setOrder({ ...order, total_price: finalPrice }); 
      }
  };

  // --- OBSERVACIONES (ADMIN) ---
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
        loadData();
    }
  };

  // --- LÓGICA DE ITEMS MANUALES (ADMIN) ---
  const handleAddItem = (item: any) => {
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
      loadData(); 
  };

  const handleDeleteManualItem = async (itemId: string) => {
      if(!confirm("¿Borrar línea?")) return;
      await supabase.from('order_items').delete().eq('id', itemId);
      loadData();
  };

  // --- CHAT & FILES ---
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ order_id: id, user_id: user?.id, content: newMessage }]);
    setNewMessage(''); loadData();
  };

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
          loadData();
      } catch (error: any) { 
          alert('Error al subir: ' + error.message); 
      } finally { 
          setUploading(false); 
      }
  };

  const handleDeleteAttachment = async (attId: string) => {
      if(!confirm("¿Borrar archivo?")) return;
      await supabase.from('order_attachments').delete().eq('id', attId);
      loadData();
  };

  if (!order) return <p>Cargando...</p>;
  const isMyMessage = (role: string) => role === 'admin' || role === 'employee';

  return (
    <div style={{ padding: '20px', height: '100vh', display:'flex', flexDirection:'column' }}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
        <button onClick={() => navigate('/admin/crm')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Volver al Panel</button>
        <h2 style={{margin:0, color:'white'}}>Pedido Ref: <span style={{color:'#3b82f6'}}>{order.order_ref}</span></h2>
      </div>
      
      <div style={containerStyle}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', overflowY:'auto' }}>
            
            {/* ESTADO Y DATOS PRINCIPALES */}
            <div style={cardStyle}>
                <h3 style={{margin:'0 0 15px 0', borderBottom:'1px solid #333', paddingBottom:'10px', color:'white'}}>⚙️ Control y Datos</h3>
                
                <div style={{marginBottom:'15px'}}>
                     <label style={labelStyle}>Nombre del Proyecto (Editable)</label>
                     <input 
                        type="text" 
                        value={order.custom_name || ''} 
                        onChange={e => setOrder({...order, custom_name: e.target.value})}
                        placeholder="Ej: Parque Ayuntamiento Norte"
                        style={{...inputStyle, border:'1px solid #3b82f6'}}
                     />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Estado</label>
                        <select value={order.status} onChange={handleStatusChangeRaw} style={inputStyle}>
                            <option value="pendiente">🟠 Pendiente</option>
                            <option value="presupuestado">🟣 Presupuestado</option>
                            <option value="pedido">🔵 Pedido Aceptado</option>
                            <option value="fabricacion">🟠 En Fabricación</option>
                            <option value="entregado">🟢 Entregado</option>
                            <option value="rechazado">🔴 Rechazado</option>
                            <option value="cancelado">⚫ Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha Entrega Estimada</label>
                        <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Precio Final Oferta (€)</label>
                        <div style={{display:'flex', gap:'10px'}}>
                            <input type="number" step="0.01" value={order.total_price} onChange={(e) => setOrder({...order, total_price: parseFloat(e.target.value)})} style={inputStyle} />
                            <button onClick={applyClientDiscount} style={{background:'#e67e22', color:'white', border:'none', borderRadius:'6px', padding:'0 15px', height:'38px', cursor:'pointer'}}>%</button>
                        </div>
                        <small style={{color:'#666'}}>Base Calculada (Tarifa): {formatMoney(calculatedBasePrice)}</small>
                    </div>
                    <div style={{display:'flex', alignItems:'center'}}>
                         <button onClick={handleUpdateOrder} style={{width:'100%', background:'#27ae60', color:'white', padding:'12px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>💾 Guardar Cambios</button>
                    </div>
                </div>
            </div>

            {/* OBSERVACIONES CRONOLÓGICAS */}
            <div style={{...cardStyle, borderLeft:'4px solid #e67e22'}}>
                <h4 style={{margin:'0 0 15px 0', color:'#e67e22'}}>📝 Historial de Observaciones</h4>
                
                {/* Lista */}
                <div style={{maxHeight:'200px', overflowY:'auto', marginBottom:'15px', display:'flex', flexDirection:'column', gap:'10px'}}>
                    {observations.length === 0 && <p style={{color:'#666', fontStyle:'italic', fontSize:'13px'}}>No hay observaciones registradas.</p>}
                    {observations.map(obs => (
                        <div key={obs.id} style={{background:'#252525', padding:'10px', borderRadius:'6px', borderLeft:`3px solid ${obs.profiles?.role === 'admin' ? '#e67e22' : '#3b82f6'}`}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                <span style={{fontWeight:'bold', fontSize:'12px', color:'white'}}>
                                    {obs.profiles?.role === 'admin' ? '🏢 Tú (Admin)' : '👤 Cliente'}
                                </span>
                                <span style={{fontSize:'11px', color:'#888'}}>{new Date(obs.created_at).toLocaleString()}</span>
                            </div>
                            <p style={{margin:0, fontSize:'13px', color:'#ddd', whiteSpace:'pre-wrap'}}>{obs.content}</p>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div style={{display:'flex', gap:'10px'}}>
                    <input 
                        type="text" 
                        value={newObservation}
                        onChange={e => setNewObservation(e.target.value)}
                        placeholder="Añadir nota interna o mensaje..."
                        style={{flex:1, padding:'8px', background:'#252525', border:'1px solid #444', color:'white', borderRadius:'6px'}}
                    />
                    <button onClick={handleAddObservation} style={{background:'#e67e22', color:'white', border:'none', padding:'0 15px', borderRadius:'6px', cursor:'pointer'}}>Añadir</button>
                </div>
            </div>

            {/* DESGLOSE DE MATERIALES */}
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3 style={{margin:0, color:'white'}}>📋 Desglose Materiales</h3>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => setIsCatalogOpen(true)} style={{padding:'5px 15px', background:'#27ae60', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>+ Añadir Item</button>
                        <button onClick={() => {if(order.project_id) window.location.href=`/?project_id=${order.project_id}&mode=readonly`}} style={{padding:'5px 10px', background:'#333', color:'white', border:'1px solid #555', borderRadius:'4px', cursor:'pointer'}}>Ver 3D ↗</button>
                    </div>
                </div>

                <div style={{background:'#252525', borderRadius:'8px', overflow:'hidden'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead style={{background:'#333', color:'#aaa'}}>
                            <tr>
                                <th style={{padding:'8px', textAlign:'left'}}>Ítem</th>
                                <th style={{padding:'8px', textAlign:'center'}}>Origen</th>
                                <th style={{padding:'8px', textAlign:'right'}}>Precio</th>
                                <th style={{padding:'8px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Items 3D */}
                            {items3D.map((line, idx) => (
                                <tr key={`3d-${idx}`} style={{borderBottom:'1px solid #333'}}>
                                    <td style={{padding:'8px', color:'white'}}>
                                        {line.name} <span style={{color:'#666', fontSize:'10px'}}>x{line.quantity}</span>
                                    </td>
                                    <td style={{padding:'8px', textAlign:'center', color:'#888', fontSize:'11px'}}>DISEÑO 3D</td>
                                    <td style={{padding:'8px', textAlign:'right', color:'#ccc'}}>{formatMoney(line.totalPrice)}</td>
                                    <td style={{textAlign:'right', padding:'8px'}}><small style={{color:'#666'}}>Auto</small></td>
                                </tr>
                            ))}
                            {/* Items Manuales */}
                            {manualItems.map((item) => (
                                <tr key={item.id} style={{borderBottom:'1px solid #333', background:'rgba(59, 130, 246, 0.1)'}}>
                                    <td style={{padding:'8px', color:'white'}}>
                                        {item.name} <span style={{color:'#888', fontSize:'11px'}}>({item.dimensions})</span>
                                    </td>
                                    <td style={{padding:'8px', textAlign:'center', color:'#3b82f6', fontSize:'11px'}}>EXTRA MANUAL</td>
                                    <td style={{padding:'8px', textAlign:'right', color:'white', fontWeight:'bold'}}>{formatMoney(item.total_price)}</td>
                                    <td style={{textAlign:'right', padding:'8px'}}>
                                        <button onClick={() => handleDeleteManualItem(item.id)} style={{color:'#e74c3c', background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ARCHIVOS */}
            <div style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                    <h3 style={{margin:0, color:'white'}}>📎 Archivos Adjuntos</h3>
                    <label style={{background:'#3b82f6', color:'white', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'12px'}}>
                        {uploading ? 'Subiendo...' : '+ Subir Archivo'}
                        <input type="file" onChange={handleFileUpload} style={{display:'none'}} disabled={uploading} />
                    </label>
                </div>
                {attachments.length === 0 ? <p style={{color:'#666', fontSize:'13px'}}>No hay archivos.</p> : (
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
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <div style={{...cardStyle, maxHeight:'90vh', marginBottom:0}}>
            <h3 style={{color:'white', borderBottom:'1px solid #333', paddingBottom:'10px'}}>💬 Chat</h3>
            <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'15px'}}>
                {messages.map(msg => {
                    const amITheSender = isMyMessage(msg.profiles?.role);
                    return (
                        <div key={msg.id} style={{alignSelf: amITheSender ? 'flex-end' : 'flex-start', maxWidth: '85%', background: amITheSender ? '#3b82f6' : '#444', color: 'white', padding: '10px', borderRadius: '8px'}}>
                            {msg.content}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendMessage()} style={{flex:1, padding:'10px', borderRadius:'6px', border:'none'}} placeholder="Responder..." />
                <button onClick={handleSendMessage} style={{background:'#3b82f6', color:'white', border:'none', padding:'0 15px', borderRadius:'6px'}}>➤</button>
            </div>
        </div>

      </div>

      {/* MODALES DE CATALOGO (Mismo que en cliente) */}
      {isCatalogOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999}}>
              <div style={{background:'#1e1e1e', width:'600px', maxHeight:'80vh', borderRadius:'12px', border:'1px solid #444', display:'flex', flexDirection:'column'}}>
                  <div style={{padding:'20px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h3 style={{margin:0, color:'white'}}>Añadir Extra (Admin)</h3>
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
                  <input type="number" autoFocus value={parametricModal.value} onChange={e => setParametricModal({...parametricModal, value: e.target.value})} placeholder="Cantidad (m o m2)" style={{width:'100%', padding:'10px', marginBottom:'20px'}}/>
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