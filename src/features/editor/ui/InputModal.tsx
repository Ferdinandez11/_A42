import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { X, Check } from 'lucide-react';

// 🎨 Types
interface ModalButtonProps {
  type?: 'button' | 'submit';
  onClick?: () => void;
  variant: 'primary' | 'secondary';
  icon: React.ElementType;
  children: React.ReactNode;
}

// 🎨 Constants
const CLASSES = {
  overlay: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200",
  modal: "bg-neutral-800 border border-neutral-600 rounded-xl shadow-2xl p-6 w-96 transform transition-all scale-100",
  title: "text-white text-lg font-bold mb-4",
  input: "w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors mb-6",
  buttonContainer: "flex justify-end gap-3",
  button: {
    base: "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
    primary: "bg-green-600 hover:bg-green-500 text-white",
    secondary: "text-neutral-400 hover:text-white hover:bg-white/10",
  },
} as const;

const FOCUS_DELAY = 100; // ms

// 🎨 Sub-Components
const ModalButton: React.FC<ModalButtonProps> = ({
  type = 'button',
  onClick,
  variant,
  icon: Icon,
  children,
}) => (
  <button
    type={type}
    onClick={onClick}
    className={`${CLASSES.button.base} ${CLASSES.button[variant]}`}
  >
    <Icon size={18} /> {children}
  </button>
);

const ModalOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={CLASSES.overlay}>
    <div className={CLASSES.modal}>
      {children}
    </div>
  </div>
);

// 🎨 Main Component
export const InputModal: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Store hooks
  const { inputModal, closeInputModal } = useEditorStore();
  
  // Local state
  const [value, setValue] = useState<string>('');

  // Sync local state when modal opens
  useEffect(() => {
    if (inputModal.isOpen) {
      setValue(inputModal.defaultValue);
      // Auto-focus input after mount
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, FOCUS_DELAY);
      
      return () => clearTimeout(timeoutId);
    }
  }, [inputModal.isOpen, inputModal.defaultValue]);

  // Early return if modal is closed
  if (!inputModal.isOpen) {
    return null;
  }

  // Handlers
  const handleSubmit = (e?: React.FormEvent): void => {
    e?.preventDefault();
    closeInputModal(value);
  };

  const handleCancel = (): void => {
    closeInputModal(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  };

  return (
    <ModalOverlay>
      <h3 className={CLASSES.title}>{inputModal.title}</h3>
      
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          className={CLASSES.input}
          placeholder="Escribe aquí..."
          aria-label={inputModal.title}
        />
        
        <div className={CLASSES.buttonContainer}>
          <ModalButton
            variant="secondary"
            icon={X}
            onClick={handleCancel}
          >
            Cancelar
          </ModalButton>
          
          <ModalButton
            type="submit"
            variant="primary"
            icon={Check}
          >
            Guardar
          </ModalButton>
        </div>
      </form>
    </ModalOverlay>
  );
};