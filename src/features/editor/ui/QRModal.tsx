import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Usamos la URL actual. Si quieres forzar la de vercel pon: "https://a42-kappa.vercel.app/"
  const currentUrl = window.location.href; 

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative flex flex-col items-center gap-6">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Ver en Realidad Aumentada</h2>
          <p className="text-sm text-neutral-400">Escanea este código con tu móvil para ver el parque en tu entorno.</p>
        </div>

        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG 
            value={currentUrl} 
            size={200}
            level="H" // High error correction level
            includeMargin={false}
          />
        </div>

        <div className="text-xs text-neutral-500 font-mono bg-neutral-800 px-3 py-1 rounded-full">
            {currentUrl.replace('https://', '')}
        </div>
      </div>
    </div>
  );
};