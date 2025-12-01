import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore'; // <--- IMPORTAR STORE

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose }) => {
  const items = useAppStore((state) => state.items); // <--- COGER ITEMS

  if (!isOpen) return null;

  // 1. Convertimos los items a JSON
  const sceneJson = JSON.stringify(items);
  
  // 2. Codificamos a Base64 (compatible con acentos/emojis)
  // Usamos este truco de encodeURIComponent para que no falle con tildes
  const encodedData = btoa(unescape(encodeURIComponent(sceneJson)));
  
  // 3. Creamos la URL mágica
  const shareUrl = `${window.location.origin}?scene=${encodedData}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative flex flex-col items-center gap-6">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Ver en Realidad Aumentada</h2>
          <p className="text-sm text-neutral-400">Escanea para transferir esta escena a tu móvil.</p>
        </div>

        <div className="bg-white p-4 rounded-xl">
          {/* USAMOS LA SHARE URL EN VEZ DE LA LOCATION NORMAL */}
          <QRCodeSVG 
            value={shareUrl} 
            size={200}
            level="L" // 'L' hace el QR menos denso (mejor si la URL es larga)
            includeMargin={false}
          />
        </div>

        <div className="text-xs text-neutral-500 text-center px-4">
           La escena se ha incrustado en el código QR.
        </div>
      </div>
    </div>
  );
};