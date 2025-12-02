import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

// --- ESTILOS ---
const containerStyle = { color: '#e0e0e0', padding: '20px', fontFamily: 'sans-serif', minHeight: '100vh', display:'flex', flexDirection:'column' as const };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' };
const tabContainerStyle = { display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #333' };
const tabStyle = (isActive: boolean) => ({
  cursor: 'pointer', padding: '10px 15px', borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
  color: isActive ? '#fff' : '#888', fontWeight: isActive ? 'bold' : 'normal', transition: 'all 0.2s', marginBottom: '-2px'
});
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const cardStyle = { background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const };
const cardImgStyle = { height: '160px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#555', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
const cardBodyStyle = { padding: '15px' };
const btnActionStyle = { flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' };
const thStyle = { textAlign: 'left' as const, padding: '15px', background: '#252525', color: '#aaa', borderBottom: '1px solid #333' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #333' };

type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

const getStatusColor = (status: string) => {
    switch(status) {
        case 'pedido': return '#3498db'; 
        case 'fabricacion': return '#e67e22'; 
        case 'entregado_parcial': return '#f1c40f'; 
        case 'entregado': return '#27ae60'; 
        case 'pendiente': return 'orange';
        case 'rechazado': return '#c0392b';
        case 'cancelado': return '#7f8c8d';
        default: return '#27ae60';
    }
};

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'projects';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [dataList, setDataList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  useEffect(() => { setSearchParams({ tab: activeTab }); }, [activeTab, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      try {
        if (activeTab === 'projects') {
          const { data } = await supabase.from('projects').select('*, orders(id)').order('updated_at', { ascending: false });
          const cleanProjects = (data || []).filter((p: any) => !p.orders || p.orders.length === 0);
          setProjects(cleanProjects);
        }
        else if (activeTab === 'budgets') {
          const { data } = await supabase.from('orders')
            .select('*, projects(name)')
            .eq('is_archived', false)
            .in('status', ['pendiente', 'presupuestado', 'entregado']) 
            .order('created_at', { ascending: false });
          setDataList(data || []);
        }
        else if (activeTab === 'orders') {
          const { data } = await supabase.from('orders')
            .select('*, projects(name)')
            .eq('is_archived', false)
            .in('status', ['pedido', 'fabricacion', 'entregado_parcial', 'entregado', 'completado'])
            .order('created_at', { ascending: false });
          setDataList(data || []);
        }
        else if (activeTab === 'archived') {
          const { data } = await supabase.from('orders')
            .select('*, projects(name)')
            .eq('is_archived', true)
            .order('created_at', { ascending: false });
          setDataList(data || []);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [activeTab, navigate]);

  const handleRequestQuote = (project: any) => {
    setModal({
      isOpen: true,
      title: 'Solicitar Presupuesto',
      message: `¿Quieres enviar "${project.name}" a revisión? Se moverá a la pestaña de Presupuestos.`,
      isDestructive: false,
      onConfirm: async () => {
        const estimatedDate = new Date(); estimatedDate.setHours(estimatedDate.getHours() + 48);
        const ref = 'SOL-' + Math.floor(10000 + Math.random() * 90000);
        const { data } = await supabase.from('orders').insert([{ 
            user_id: userId, project_id: project.id, order_ref: ref, total_price: 0, 
            status: 'pendiente', estimated_delivery_date: estimatedDate.toISOString() 
        }]).select();
        
        if(data) { navigate(`/portal/order/${data[0].id}`); }
        closeModal();
      }
    });
  };

  const handleDeleteProject = (id: string) => {
    setModal({
      isOpen: true, title: 'Borrar Proyecto', message: '¿Estás seguro? Esta acción no se puede deshacer.', isDestructive: true,
      onConfirm: async () => {
        await supabase.from('projects').delete().eq('id', id);
        setProjects(p => p.filter(x => x.id !== id));
        closeModal();
      }
    });
  };

  const handleReactivate = (order: any) => {
    setModal({
      isOpen: true, title: 'Reactivar Presupuesto', message: 'El presupuesto volverá a la lista de "Mis Presupuestos" en estado PENDIENTE con fecha de HOY.', isDestructive: false,
      onConfirm: async () => {
        await supabase.from('orders').update({ 
            is_archived: false, 
            status: 'pendiente',
            created_at: new Date().toISOString() 
        }).eq('id', order.id);
        setActiveTab('budgets');
        closeModal();
      }
    });
  };

  return (
    <div style={containerStyle}>
      <ConfirmModal {...modal} onCancel={closeModal} />

      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: '#fff' }}>Mi Espacio Personal</h2>
        <a href="/" style={{ background: '#27ae60', color: 'white', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}>
          + Nuevo Proyecto 3D
        </a>
      </div>

      <div style={tabContainerStyle}>
        <div onClick={() => setActiveTab('projects')} style={tabStyle(activeTab === 'projects')}>📂 Mis Proyectos</div>
        <div onClick={() => setActiveTab('budgets')} style={tabStyle(activeTab === 'budgets')}>📑 Mis Presupuestos</div>
        <div onClick={() => setActiveTab('orders')} style={tabStyle(activeTab === 'orders')}>📦 Mis Pedidos</div>
        <div onClick={() => setActiveTab('archived')} style={tabStyle(activeTab === 'archived')}>🗄️ Archivados</div>
      </div>

      {loading ? ( <p style={{color:'#666'}}>Cargando datos...</p> ) : (
        <>
            {activeTab === 'projects' && (
                <div style={gridStyle}>
                    {projects.map(p => (
                        <div key={p.id} style={cardStyle}>
                            <div style={{...cardImgStyle, backgroundImage: p.thumbnail_url ? `url(${p.thumbnail_url})` : 'none'}}>{!p.thumbnail_url && '🏞️'}</div>
                            <div style={cardBodyStyle}>
                                <h4 style={{margin:'0 0 5px 0', color:'white'}}>{p.name || 'Sin Nombre'}</h4>
                                <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
                                    <button onClick={() => navigate(`/?project_id=${p.id}`)} style={{...btnActionStyle, background:'#3b82f6', color:'white'}}>✏️ Editar</button>
                                    <button onClick={() => handleRequestQuote(p)} style={{...btnActionStyle, background:'#e67e22', color:'white'}}>🛒 Pedir</button>
                                    <button onClick={() => handleDeleteProject(p.id)} style={{...btnActionStyle, background:'#e74c3c', color:'white', flex:0}}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <p style={{color:'#666'}}>No tienes proyectos pendientes.</p>}
                </div>
            )}

            {activeTab !== 'projects' && (
                <table style={tableStyle}>
                    {/* --- CABECERA DE TABLA ACTUALIZADA CON DOS FECHAS --- */}
                    <thead>
                        <tr>
                            <th style={thStyle}>Ref</th>
                            <th style={thStyle}>Proyecto</th>
                            {/* Cambio de etiquetas según pestaña para mayor claridad */}
                            <th style={thStyle}>{activeTab === 'orders' ? 'F. Inicio Pedido' : 'F. Solicitud'}</th>
                            <th style={thStyle}>F. Entrega Est.</th>
                            <th style={thStyle}>Estado</th>
                            <th style={thStyle}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataList.map(o => (
                            <tr key={o.id} style={{borderBottom:'1px solid #333'}}>
                                <td style={tdStyle}><strong style={{color:'#fff'}}>{o.order_ref}</strong></td>
                                <td style={tdStyle}>{o.projects?.name || '---'}</td>
                                
                                {/* 1. FECHA SOLICITUD / INICIO */}
                                <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                                
                                {/* 2. FECHA ENTREGA */}
                                <td style={{...tdStyle, color: o.estimated_delivery_date ? '#ccc' : '#666'}}>
                                    {o.estimated_delivery_date 
                                        ? new Date(o.estimated_delivery_date).toLocaleDateString() 
                                        : '--'}
                                </td>

                                <td style={tdStyle}>
                                    <span style={{
                                        color: getStatusColor(o.status), 
                                        fontWeight:'bold', textTransform:'uppercase', fontSize:'12px'
                                    }}>
                                        {o.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    {activeTab === 'archived' ? (
                                        <button onClick={() => handleReactivate(o)} style={{background:'#3b82f6', color:'white', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Reactivar 🔄</button>
                                    ) : (
                                        <button onClick={() => navigate(`/portal/order/${o.id}`)} style={{background:'#333', color:'white', border:'1px solid #555', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Ver Ficha 👁️</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {dataList.length === 0 && (
                            <tr><td colSpan={6} style={{padding:'20px', textAlign:'center', color:'#666'}}>
                                {activeTab === 'budgets' && 'No tienes presupuestos pendientes.'}
                                {activeTab === 'orders' && 'No tienes pedidos confirmados aún.'}
                                {activeTab === 'archived' && 'No hay archivados.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </>
      )}
    </div>
  );
};