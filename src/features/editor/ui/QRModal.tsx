import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Save, LogIn, Smartphone } from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, currentProjectId } = useAppStore();

  if (!isOpen) return null;

  // URL Limpia: Usamos el ID del proyecto en lugar del Base64 gigante
  const shareUrl = currentProjectId 
    ? `${window.location.origin}/?project_id=${currentProjectId}` 
    : '';

  // 💡 LÓGICA CLAVE: Verificamos si currentProjectId existe.
  const isProjectSaved = !!currentProjectId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full relative flex flex-col items-center gap-6 text-center">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        {/* CASO 1: PROYECTO GUARDADO (Generar QR) */}
        {isProjectSaved ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                 <Smartphone size={20} />
                 <span className="text-xs font-bold uppercase tracking-wider">Mobile Ready</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Escanear Proyecto</h2>
              <p className="text-sm text-neutral-400">Abre la cámara de tu móvil para ver el diseño.</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-inner">
              <QRCodeSVG 
                value={shareUrl} 
                size={220}
                level="M" 
                includeMargin={false}
              />
            </div>

            <div className="text-xs text-neutral-500 px-4 break-all">
               ID: <span className="font-mono text-neutral-400">{currentProjectId}</span>
            </div>
            {/* Si NO hay user, mostramos una nota de modo visor */}
            {!user && (
                 <p className="text-xs text-yellow-500 bg-yellow-900/30 p-2 rounded">
                    ⚠️ El enlace es de **solo lectura**. No es necesario iniciar sesión.
                 </p>
            )}
          </>
        ) 
        /* CASO 2: NO GUARDADO PERO LOGUEADO */
        : user ? (
          <>
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-2">
              <Save size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Proyecto no Guardado</h2>
              <p className="text-sm text-neutral-400">
                Guarda el proyecto primero para generar un enlace único y poder verlo en el móvil.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white rounded-lg font-bold transition-colors"
            >
              Volver y Guardar
            </button>
          </>
        ) 
        /* CASO 3: NI GUARDADO NI LOGUEADO */
        : (
          <>
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 mb-2">
              <LogIn size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Inicia Sesión</h2>
              <p className="text-sm text-neutral-400">
                Para guardar y compartir tu diseño, necesitas estar registrado.
              </p>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
            >
              Ir al Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};