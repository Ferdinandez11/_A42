import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="m-0 mb-2.5 text-white text-lg font-semibold">
          {title}
        </h3>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="py-2.5 px-5 rounded-md border border-zinc-700 bg-transparent text-zinc-300 cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`py-2.5 px-5 rounded-md border-none text-white font-bold cursor-pointer transition-colors ${
              isDestructive
                ? "bg-red-700 hover:bg-red-800"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isDestructive ? "Borrar / Ejecutar" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};