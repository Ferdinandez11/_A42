import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const containerStyle = { padding: '20px', color: '#e0e0e0', fontFamily: 'sans-serif' };
const cardStyle = { background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', padding: '25px', marginBottom: '20px' };
const labelStyle = { display: 'block', color: '#aaa', marginBottom: '5px', fontSize: '13px' };
const inputStyle = { background: '#252525', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '6px', width: '100%', marginBottom: '15px' };
const sectionTitleStyle = { borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', color: 'white' };

export const AdminClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadClientData(); }, [id]);

  const loadClientData = async () => {
    if (!id) return;
    setLoading(true);

    // 1. Cargar Perfil
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (p) setProfile(p);

    // 2. Cargar Historial de Pedidos
    const { data: o } = await supabase.from('orders')
        .select('*, projects(name)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
    setClientOrders(o || []);
    
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
        company_name: profile.company_name,
        full_name: profile.full_name,
        phone: profile.phone,
        cif: profile.cif,
        shipping_address: profile.shipping_address,
        billing_address: profile.billing_address,
        discount_rate: Number(profile.discount_rate) // Guardamos el descuento
    }).eq('id', id);

    if (error) alert("Error al guardar: " + error.message);
    else alert("✅ Cliente actualizado correctamente");
  };

  if (loading) return <p>Cargando ficha...</p>;
  if (!profile) return <p>Cliente no encontrado.</p>;

  return (
    <div style={containerStyle}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
        <button onClick={() => navigate('/admin/crm')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Volver al Listado</button>
        <h2 style={{margin:0, color:'white'}}>Ficha Cliente: <span style={{color:'#3b82f6'}}>{profile.email}</span></h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* COLUMNA IZQUIERDA: DATOS EDITABLES */}
        <div>
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>🏢 Datos de Empresa & Facturación</h3>
                
                {/* ZONA DESCUENTO - DESTACADA */}
                <div style={{background: 'rgba(230, 126, 34, 0.1)', padding:'15px', borderRadius:'8px', border:'1px solid #e67e22', marginBottom:'20px'}}>
                    <label style={{...labelStyle, color:'#e67e22', fontWeight:'bold'}}>Descuento Comercial Fijo (%)</label>
                    <input 
                        type="number" 
                        value={profile.discount_rate || 0} 
                        onChange={e => setProfile({...profile, discount_rate: e.target.value})}
                        style={{...inputStyle, border:'1px solid #e67e22', fontSize:'18px', fontWeight:'bold', width:'100px', marginBottom:0}}
                    />
                    <small style={{color:'#888', display:'block', marginTop:'5px'}}>Este descuento se aplicará automáticamente al calcular presupuestos.</small>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                    <div>
                        <label style={labelStyle}>Nombre Empresa</label>
                        <input type="text" value={profile.company_name || ''} onChange={e => setProfile({...profile, company_name: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>CIF / NIF</label>
                        <input type="text" value={profile.cif || ''} onChange={e => setProfile({...profile, cif: e.target.value})} style={inputStyle} />
                    </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                    <div>
                        <label style={labelStyle}>Persona de Contacto</label>
                        <input type="text" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Teléfono</label>
                        <input type="text" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} style={inputStyle} />
                    </div>
                </div>

                <label style={labelStyle}>Dirección de Facturación</label>
                <textarea rows={3} value={profile.billing_address || ''} onChange={e => setProfile({...profile, billing_address: e.target.value})} style={{...inputStyle, resize:'none'}} />

                <label style={labelStyle}>Dirección de Envío</label>
                <textarea rows={3} value={profile.shipping_address || ''} onChange={e => setProfile({...profile, shipping_address: e.target.value})} style={{...inputStyle, resize:'none'}} />

                <div style={{textAlign:'right', marginTop:'10px'}}>
                    <button onClick={handleSave} style={{background:'#27ae60', color:'white', border:'none', padding:'12px 30px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'16px'}}>
                        💾 Guardar Cambios
                    </button>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL */}
        <div>
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>📦 Historial de Pedidos ({clientOrders.length})</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px', maxHeight:'600px', overflowY:'auto'}}>
                    {clientOrders.length === 0 && <p style={{color:'#666'}}>Sin pedidos.</p>}
                    {clientOrders.map(order => (
                        <div key={order.id} style={{background:'#252525', padding:'10px', borderRadius:'6px', border:'1px solid #333'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                                <span style={{color:'white', fontWeight:'bold'}}>{order.order_ref}</span>
                                <span style={{fontSize:'12px', color:'#aaa'}}>{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{fontSize:'13px', color:'#888', marginBottom:'5px'}}>{order.projects?.name}</div>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{
                                    fontSize:'10px', padding:'2px 6px', borderRadius:'4px',
                                    background: order.status === 'pedido' ? '#3498db' : '#444', color:'white'
                                }}>
                                    {order.status.toUpperCase()}
                                </span>
                                <button onClick={() => navigate(`/admin/order/${order.id}`)} style={{background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:'12px'}}>Ver ↗</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};