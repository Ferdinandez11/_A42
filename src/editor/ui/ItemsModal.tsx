// ItemsModal.tsx
import React, { useCallback, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import type { SceneItem } from '@/domain/types/editor';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemCardProps {
  item: SceneItem;
  onRemove: (uuid: string) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MESSAGES = {
  TITLE: 'Elementos del Proyecto',
  EMPTY: 'No hay elementos en el proyecto.',
  UNNAMED_ITEM: 'Sin Nombre',
  CONFIRM_DELETE: (name: string) => `¿Eliminar "${name}"?`,
} as const;

const CURRENCY_SYMBOL = '€';

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const ItemCard: React.FC<ItemCardProps> = ({ item, onRemove }) => {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(MESSAGES.CONFIRM_DELETE(item.name || MESSAGES.UNNAMED_ITEM))) {
        onRemove(item.uuid);
      }
    },
    [item.uuid, item.name, onRemove]
  );

  const formattedPrice = useMemo(
    () => item.price.toLocaleString(),
    [item.price]
  );

  return (
    <div className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg group hover:bg-neutral-700 transition-colors border border-transparent hover:border-blue-500/30">
      {/* Información del item */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-white font-medium text-sm truncate">
          {item.name || MESSAGES.UNNAMED_ITEM}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-500 uppercase font-mono truncate">
            {item.productId}
          </span>
          <span className="text-xs text-neutral-600">•</span>
          <span className="text-xs text-neutral-500 capitalize">
            {item.type}
          </span>
        </div>
      </div>

      {/* Precio y acciones */}
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm font-bold text-neutral-400 whitespace-nowrap">
          {formattedPrice} {CURRENCY_SYMBOL}
        </span>

        <button
          onClick={handleRemove}
          className="text-neutral-500 hover:text-red-400 p-2 rounded-full hover:bg-red-900/20 transition-all"
          title="Eliminar elemento"
          aria-label={`Eliminar ${item.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const ItemsModal: React.FC<ItemsModalProps> = ({ isOpen, onClose }) => {
  const { items, removeItem } = useSceneStore();

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (item.price || 0), 0),
    [items]
  );

  const formattedTotal = useMemo(
    () => totalPrice.toLocaleString(),
    [totalPrice]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl">
            {MESSAGES.TITLE}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-1 rounded-full hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              {MESSAGES.EMPTY}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <ItemCard
                  key={item.uuid}
                  item={item}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer con total */}
        {items.length > 0 && (
          <div className="p-4 border-t border-neutral-700 bg-neutral-800/50">
            <div className="flex justify-between items-end">
              <span className="text-neutral-400 text-sm">Total</span>
              <span className="text-2xl font-bold text-green-400">
                {formattedTotal} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

