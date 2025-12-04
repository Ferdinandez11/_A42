import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Save, LogIn, Smartphone } from "lucide-react";
import { useAuthStore } from "@/stores/auth/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/stores/project/useProjectStore";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // --- auth store ---
  const { user } = useAuthStore();

  // --- editor/project store ---
  const { currentProjectId } = useProjectStore();

  if (!isOpen) return null;

  const shareUrl = currentProjectId
    ? `${window.location.origin}/?project_id=${currentProjectId}`
    : "";

  const isProjectSaved = !!currentProjectId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full relative flex flex-col items-center gap-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* PROYECTO GUARDADO → MOSTRAR QR */}
        {isProjectSaved ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                <Smartphone size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mobile Ready
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">Escanear Proyecto</h2>
              <p className="text-sm text-neutral-400">
                Abre la cámara de tu móvil para ver el diseño.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-inner">
              <QRCodeSVG value={shareUrl} size={220} level="M" />
            </div>

            <div className="text-xs text-neutral-500 px-4 break-all">
              ID:
              <span className="font-mono text-neutral-400 ml-1">
                {currentProjectId}
              </span>
            </div>

            {!user && (
              <p className="text-xs text-yellow-500 bg-yellow-900/30 p-2 rounded">
                ⚠️ Enlace en modo <strong>solo lectura</strong>.
              </p>
            )}
          </>
        ) : user ? (
          // PROYECTO SIN GUARDAR → PEDIR GUARDAR
          <>
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-2">
              <Save size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Proyecto no guardado</h2>
            <p className="text-sm text-neutral-400">
              Guarda el proyecto para generar un enlace único.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white rounded-lg font-bold transition-colors"
            >
              Volver y Guardar
            </button>
          </>
        ) : (
          // NO GUARDADO + NO LOGIN → PEDIR LOGIN
          <>
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 mb-2">
              <LogIn size={32} />
            </div>

            <h2 className="text-xl font-bold text-white">Inicia Sesión</h2>
            <p className="text-sm text-neutral-400">
              Para guardar y compartir tu diseño necesitas una cuenta.
            </p>

            <button
              onClick={() => navigate("/login")}
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
