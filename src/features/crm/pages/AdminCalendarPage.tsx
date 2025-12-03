import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// --- ESTILOS ---
const containerStyle = { padding: '20px', color: '#e0e0e0', height: '100vh', display: 'flex', flexDirection: 'column' as const };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#1e1e1e', padding: '15px', borderRadius: '12px', border: '1px solid #333' };
const controlsStyle = { display: 'flex', gap: '15px', alignItems: 'center' };
const inputStyle = { background: '#252525', border: '1px solid #444', color: 'white', padding: '8px 12px', borderRadius: '6px', outline: 'none' };
const btnStyle = { background: '#333', color: 'white', border: '1px solid #555', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' };

// Estilos Grilla Calendario
const calendarGridStyle = { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(7, 1fr)', 
    gap: '1px', 
    background: '#333', // Color de las líneas
    border: '1px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    flex: 1
};
const dayHeaderStyle = { background: '#2a2a2a', padding: '10px', textAlign: 'center' as const, fontWeight: 'bold', color: '#888', textTransform: 'uppercase' as const, fontSize: '12px' };
const dayCellStyle = { background: '#121212', minHeight: '100px', padding: '5px', position: 'relative' as const };
const dayNumberStyle = { position: 'absolute' as const, top: '5px', right: '8px', color: '#444', fontWeight: 'bold' };
const eventStyle = (status: string) => {
    let bg = '#3498db'; // Azul por defecto (pedido)
    if (status === 'presupuestado') bg = '#8e44ad';
    if (status === 'fabricacion') bg = '#e67e22';
    if (status === 'entregado') bg = '#27ae60';
    if (status === 'retrasado') bg = '#c0392b';

    return {
        background: bg, color: 'white', padding: '4px 6px', borderRadius: '4px', marginBottom: '4px', 
        fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
        borderLeft: '3px solid rgba(0,0,0,0.2)'
    };
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AdminCalendarPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'ref'>('all');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    // Traemos pedidos que no estén cancelados ni rechazados y que tengan fecha
    const { data } = await supabase
        .from('orders')
        .select('id, order_ref, custom_name, estimated_delivery_date, status, profiles(company_name, email, full_name)')
        .not('estimated_delivery_date', 'is', null)
        .neq('status', 'rechazado')
        .neq('status', 'cancelado');
    
    setOrders(data || []);
    setLoading(false);
  };

  // --- LÓGICA DE CALENDARIO ---
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Ajustar para que la semana empiece en Lunes (0 = Domingo en JS, lo convertimos)
      let startDay = firstDay.getDay() - 1; 
      if (startDay === -1) startDay = 6; // Si es domingo, ponerlo al final

      const days = [];
      // Rellenar huecos previos
      for (let i = 0; i < startDay; i++) { days.push(null); }
      // Rellenar días del mes
      for (let i = 1; i <= lastDay.getDate(); i++) { days.push(new Date(year, month, i)); }
      
      return days;
  };

  const changeMonth = (offset: number) => {
      const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
      setCurrentDate(new Date(newDate));
  };

  // --- FILTRADO ---
  const filteredOrders = orders.filter(o => {
      const searchLower = searchTerm.toLowerCase();
      const matchesRef = o.order_ref.toLowerCase().includes(searchLower) || (o.custom_name && o.custom_name.toLowerCase().includes(searchLower));
      const clientName = o.profiles?.company_name || o.profiles?.full_name || o.profiles?.email || '';
      const matchesClient = clientName.toLowerCase().includes(searchLower);

      if (filterType === 'all') return matchesRef || matchesClient;
      if (filterType === 'client') return matchesClient;
      if (filterType === 'ref') return matchesRef;
      return true;
  });

  const getEventsForDay = (day: Date) => {
      return filteredOrders.filter(o => {
          const d = new Date(o.estimated_delivery_date);
          return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
      });
  };

  const calendarDays = getDaysInMonth(currentDate);

  return (
    <div style={containerStyle}>
        
        {/* CABECERA Y CONTROLES */}
        <div style={headerStyle}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <button onClick={() => changeMonth(-1)} style={btnStyle}>◀</button>
                <h2 style={{margin:0, color:'white', width:'200px', textAlign:'center'}}>
                    {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h2>
                <button onClick={() => changeMonth(1)} style={btnStyle}>▶</button>
            </div>

            <div style={controlsStyle}>
                <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value as any)}
                    style={{...inputStyle, width:'120px', cursor:'pointer'}}
                >
                    <option value="all">🔍 Todo</option>
                    <option value="client">👤 Cliente</option>
                    <option value="ref">📦 Pedido/Ref</option>
                </select>
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{...inputStyle, width:'200px'}}
                />
                <button onClick={loadOrders} style={{...btnStyle, background:'#27ae60', border:'none'}}>🔄</button>
            </div>
        </div>

        {/* LEYENDA */}
        <div style={{display:'flex', gap:'15px', marginBottom:'10px', fontSize:'12px', color:'#888'}}>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}><span style={{width:10, height:10, background:'#8e44ad', borderRadius:'2px'}}></span> Presupuestado (Fin Validez)</div>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}><span style={{width:10, height:10, background:'#e67e22', borderRadius:'2px'}}></span> Fabricación</div>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}><span style={{width:10, height:10, background:'#3498db', borderRadius:'2px'}}></span> Pedido Confirmado</div>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}><span style={{width:10, height:10, background:'#27ae60', borderRadius:'2px'}}></span> Entregado</div>
        </div>

        {/* CALENDARIO */}
        <div style={calendarGridStyle}>
            {/* Cabeceras Días */}
            {WEEKDAYS.map(d => <div key={d} style={dayHeaderStyle}>{d}</div>)}
            
            {/* Celdas */}
            {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} style={{...dayCellStyle, background:'#1a1a1a'}}></div>;
                
                const events = getEventsForDay(day);
                const isToday = new Date().toDateString() === day.toDateString();

                return (
                    <div key={day.toISOString()} style={{...dayCellStyle, background: isToday ? '#1e251e' : '#121212', border: isToday ? '1px solid #27ae60' : 'none'}}>
                        <span style={{...dayNumberStyle, color: isToday ? '#27ae60' : '#444'}}>{day.getDate()}</span>
                        
                        <div style={{marginTop:'25px', display:'flex', flexDirection:'column', gap:'2px'}}>
                            {events.map(ev => (
                                <div 
                                    key={ev.id} 
                                    onClick={() => navigate(`/admin/order/${ev.id}`)}
                                    title={`Cliente: ${ev.profiles?.company_name || ev.profiles?.email}\nRef: ${ev.order_ref}`}
                                    style={eventStyle(ev.status)}
                                >
                                    <strong>{ev.order_ref}</strong>
                                    <div style={{fontSize:'9px', opacity:0.9}}>
                                        {ev.custom_name || ev.profiles?.company_name || 'Sin nombre'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};