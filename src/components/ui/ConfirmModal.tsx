import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean; // Para poner el botón rojo
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, isDestructive = false 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px',
        padding: '25px', width: '400px', maxWidth: '90%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>{title}</h3>
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel}
            style={{
              padding: '10px 20px', borderRadius: '6px', border: '1px solid #444',
              background: 'transparent', color: '#ccc', cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: '6px', border: 'none',
              background: isDestructive ? '#c0392b' : '#3b82f6', 
              color: 'white', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {isDestructive ? 'Borrar / Ejecutar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};