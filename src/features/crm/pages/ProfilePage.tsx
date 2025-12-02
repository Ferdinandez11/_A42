import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Profile } from '../../../types/types';

const inputStyle = {
  width: '100%',
  padding: '10px',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: '6px',
  color: 'white',
  marginTop: '5px'
};

const labelStyle = { display: 'block', marginBottom: '15px', color: '#aaa', fontSize: '14px' };
const sectionTitleStyle = { color: '#e67e22', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', marginTop: '30px' };

export const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState<Partial<Profile>>({
    company_name: '',
    full_name: '',
    email: '', // Añadido campo email
    cif: '',
    phone: '',
    shipping_address: '',
    billing_address: '',
    billing_email: '',
    observations: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setFormData(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ text: '✅ Perfil actualizado correctamente', type: 'success' });
    } catch (error: any) {
      setMessage({ text: '❌ Error al guardar: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#e0e0e0' }}>
      <h2 style={{ color: 'white' }}>Mi Zona Personal</h2>
      <p style={{ color: '#888' }}>Gestiona tus datos de facturación y envío.</p>

      {message && (
        <div style={{ 
          padding: '10px', 
          borderRadius: '6px', 
          background: message.type === 'success' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          color: message.type === 'success' ? '#2ecc71' : '#e74c3c',
          marginBottom: '20px'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
        
        {/* DATOS EMPRESA */}
        <h4 style={{ ...sectionTitleStyle, marginTop: 0 }}>🏢 Datos Fiscales</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <label style={labelStyle}>
            Nombre Empresa
            <input 
              type="text" 
              style={inputStyle} 
              value={formData.company_name || ''} 
              onChange={e => setFormData({...formData, company_name: e.target.value})} 
            />
          </label>
          <label style={labelStyle}>
            CIF / NIF
            <input 
              type="text" 
              style={inputStyle} 
              value={formData.cif || ''} 
              onChange={e => setFormData({...formData, cif: e.target.value})} 
            />
          </label>
        </div>

        {/* CONTACTO */}
        <h4 style={sectionTitleStyle}>👤 Contacto Principal</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <label style={labelStyle}>
            Nombre Completo
            <input 
              type="text" 
              style={inputStyle} 
              value={formData.full_name || ''} 
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
            />
          </label>
          <label style={labelStyle}>
            Teléfono
            <input 
              type="tel" 
              style={inputStyle} 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
          </label>
        </div>
        
        {/* NUEVO: EMAIL DE CONTACTO */}
        <label style={labelStyle}>
            Email de Contacto (CRM)
            <input 
              type="email" 
              style={inputStyle} 
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="ejemplo@empresa.com"
            />
        </label>

        <label style={labelStyle}>
            Email para Facturación (si es distinto)
            <input 
              type="email" 
              style={inputStyle} 
              value={formData.billing_email || ''} 
              onChange={e => setFormData({...formData, billing_email: e.target.value})} 
              placeholder="contabilidad@empresa.com..."
            />
        </label>

        {/* DIRECCIONES */}
        <h4 style={sectionTitleStyle}>📍 Direcciones</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <label style={labelStyle}>
                Dirección de Envío
                <textarea 
                rows={3}
                style={{...inputStyle, resize: 'none'}} 
                value={formData.shipping_address || ''} 
                onChange={e => setFormData({...formData, shipping_address: e.target.value})} 
                />
            </label>
            <label style={labelStyle}>
                Dirección de Facturación
                <textarea 
                rows={3}
                style={{...inputStyle, resize: 'none'}} 
                value={formData.billing_address || ''} 
                onChange={e => setFormData({...formData, billing_address: e.target.value})} 
                />
            </label>
        </div>

        {/* OBSERVACIONES */}
        <h4 style={sectionTitleStyle}>📝 Otros</h4>
        <label style={labelStyle}>
            Observaciones Generales
            <textarea 
              rows={2}
              style={{...inputStyle, resize: 'none'}} 
              value={formData.observations || ''} 
              onChange={e => setFormData({...formData, observations: e.target.value})} 
            />
        </label>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSave} 
            disabled={loading}
            style={{ 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '12px 30px', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
};