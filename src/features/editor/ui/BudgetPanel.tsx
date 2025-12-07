// --- START OF FILE src/features/editor/ui/BudgetPanel.tsx ---
import React, { useCallback, useMemo } from 'react';
import { Trash2, X, Receipt } from 'lucide-react';

import { useUIStore } from '@/stores/ui/useUIStore';
import { useSceneStore } from '@/stores/scene/useSceneStore';
import { useSelectionStore } from '@/stores/selection/useSelectionStore';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface BudgetItem {
  uuid: string;
  name: string;
  productId: string;
  price: number;
  type?: string;
}

interface BudgetItemCardProps {
  item: BudgetItem;
  onSelect: (uuid: string) => void;
  onRemove: (uuid: string) => void;
}

interface BudgetSummaryProps {
  totalPrice: number;
  itemCount: number;
  onClearAll: () => void;
}

interface EmptyStateProps {
  message?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const PANEL_CONFIG = {
  width: 'w-80',
  maxHeight: 'max-h-[70vh]',
  position: 'top-20 left-6',
  zIndex: 'z-30',
} as const;

const MESSAGES = {
  EMPTY_SCENE: 'La escena está vacía.',
  CONFIRM_DELETE_ALL: '¿Borrar todo?',
  UNNAMED_ITEM: 'Sin Nombre',
  PANEL_TITLE: 'Presupuesto',
  TOTAL_LABEL: 'Total Estimado',
  CLEAR_ALL_BUTTON: 'Borrar Todo',
} as const;

const CURRENCY_SYMBOL = '€';

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/**
 * Estado vacío cuando no hay items
 */
const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = MESSAGES.EMPTY_SCENE 
}) => (
  <div className="text-center py-8 text-neutral-500 italic">
    {message}
  </div>
);

/**
 * Tarjeta individual de item del presupuesto
 */
const BudgetItemCard: React.FC<BudgetItemCardProps> = ({
  item,
  onSelect,
  onRemove,
}) => {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(item.uuid);
    },
    [item.uuid, onRemove]
  );

  const handleSelect = useCallback(() => {
    onSelect(item.uuid);
  }, [item.uuid, onSelect]);

  const formattedPrice = useMemo(
    () => item.price.toLocaleString(),
    [item.price]
  );

  return (
    <div
      onClick={handleSelect}
      className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg group hover:bg-neutral-700 transition-colors border border-transparent hover:border-blue-500/30 cursor-pointer"
    >
      {/* Información del item */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-white font-medium text-sm truncate">
          {item.name || MESSAGES.UNNAMED_ITEM}
        </span>
        <span className="text-xs text-neutral-500 uppercase font-mono truncate">
          {item.productId}
        </span>
      </div>

      {/* Precio y acciones */}
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm font-bold text-neutral-400 whitespace-nowrap">
          {formattedPrice} {CURRENCY_SYMBOL}
        </span>

        <button
          onClick={handleRemove}
          className="text-neutral-500 hover:text-red-400 p-2 rounded-full hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
          title="Eliminar item"
          aria-label={`Eliminar ${item.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * Resumen del presupuesto con total y botón de limpiar
 */
const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  totalPrice,
  itemCount,
  onClearAll,
}) => {
  const handleClearAll = useCallback(() => {
    if (window.confirm(MESSAGES.CONFIRM_DELETE_ALL)) {
      onClearAll();
    }
  }, [onClearAll]);

  const formattedTotal = useMemo(
    () => totalPrice.toLocaleString(),
    [totalPrice]
  );

  return (
    <div className="p-4 border-t border-neutral-700 bg-neutral-800/50 rounded-b-xl space-y-3">
      {/* Total */}
      <div className="flex justify-between items-end">
        <span className="text-neutral-400 text-sm">
          {MESSAGES.TOTAL_LABEL}
        </span>
        <span className="text-2xl font-bold text-green-400">
          {formattedTotal} {CURRENCY_SYMBOL}
        </span>
      </div>

      {/* Botón de limpiar todo */}
      {itemCount > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full py-2 bg-red-900/30 hover:bg-red-600 text-red-200 hover:text-white rounded-lg text-sm font-medium transition-all flex justify-center items-center gap-2 border border-red-900/50"
          aria-label="Borrar todos los items"
        >
          <Trash2 size={16} />
          {MESSAGES.CLEAR_ALL_BUTTON}
        </button>
      )}
    </div>
  );
};

/**
 * Header del panel con título y botón de cerrar
 */
const PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50 rounded-t-xl">
    <h2 className="text-white font-bold text-lg flex items-center gap-2">
      <Receipt size={20} />
      {MESSAGES.PANEL_TITLE}
    </h2>
    <button
      onClick={onClose}
      className="text-neutral-400 hover:text-white transition-colors"
      aria-label="Cerrar panel de presupuesto"
    >
      <X size={20} />
    </button>
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const BudgetPanel: React.FC = () => {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================

  const { budgetVisible, toggleBudget } = useUIStore();

  // Datos de la escena
  const items = useSceneStore((s) => s.items);
  const totalPrice = useSceneStore((s) => s.totalPrice);
  const removeItem = useSceneStore((s) => s.removeItem);
  const resetScene = useSceneStore((s) => s.resetScene);

  const selectItem = useSelectionStore((s) => s.selectItem);

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  const handleSelectItem = useCallback(
    (uuid: string) => {
      selectItem(uuid);
    },
    [selectItem]
  );

  const handleRemoveItem = useCallback(
    (uuid: string) => {
      removeItem(uuid);
    },
    [removeItem]
  );

  const handleResetScene = useCallback(() => {
    resetScene();
  }, [resetScene]);

  // ==========================================================================
  // MEMOIZACIÓN
  // ==========================================================================

  const itemCount = useMemo(() => items.length, [items.length]);
  const hasItems = useMemo(() => itemCount > 0, [itemCount]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!budgetVisible) return null;

  return (
    <div
      className={`
        absolute ${PANEL_CONFIG.position} 
        bg-neutral-900/95 backdrop-blur-md 
        border border-neutral-700 
        rounded-xl shadow-2xl 
        ${PANEL_CONFIG.width} ${PANEL_CONFIG.maxHeight} 
        flex flex-col ${PANEL_CONFIG.zIndex}
        animate-in fade-in slide-in-from-left-5 duration-200
      `}
      role="complementary"
      aria-label="Panel de presupuesto"
    >
      {/* Header */}
      <PanelHeader onClose={toggleBudget} />

      {/* Lista de items */}
      <div className="flex-grow overflow-y-auto p-2 custom-scrollbar space-y-2">
        {!hasItems ? (
          <EmptyState />
        ) : (
          items.map((item) => (
            <BudgetItemCard
              key={item.uuid}
              item={item as BudgetItem}
              onSelect={handleSelectItem}
              onRemove={handleRemoveItem}
            />
          ))
        )}
      </div>

      {/* Resumen */}
      <BudgetSummary
        totalPrice={totalPrice}
        itemCount={itemCount}
        onClearAll={handleResetScene}
      />
    </div>
  );
};

// ============================================================================
// EXPORTS ADICIONALES
// ============================================================================

// Exportar componentes individuales para testing o reutilización
export { BudgetItemCard, BudgetSummary, EmptyState };

// --- END OF FILE ---