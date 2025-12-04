// --- START OF FILE src/features/editor/ui/InputModal.tsx ---
import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { X, Check } from 'lucide-react';

export const InputModal = () => {
  const { inputModal, closeInputModal } = useEditorStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando se abre el modal
  useEffect(() => {
    if (inputModal.isOpen) {
      setValue(inputModal.defaultValue);
      // Enfocar el input automáticamente al abrir
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputModal.isOpen, inputModal.defaultValue]);

  if (!inputModal.isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    closeInputModal(value); // Devuelve el texto
  };

  const handleCancel = () => {
    closeInputModal(null); // Devuelve null (como si dieras Cancelar en prompt)
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-800 border border-neutral-600 rounded-xl shadow-2xl p-6 w-96 transform transition-all scale-100">
        <h3 className="text-white text-lg font-bold mb-4">{inputModal.title}</h3>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors mb-6"
            placeholder="Escribe aquí..."
          />
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <X size={18} /> Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Check size={18} /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/InputModal.tsx ---