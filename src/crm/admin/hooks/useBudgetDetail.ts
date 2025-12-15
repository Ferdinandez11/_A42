// ============================================================================
// USE BUDGET DETAIL - Orchestrator hook for budget detail page
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';
import { PriceCalculator } from '@/pdf/utils/PriceCalculator';
import type { OrderData } from '@/crm/pages/types';
import type { CatalogItem } from '@/crm/pages/types';
import type { ModalState } from '@/crm/pages/budgetTypes';

// Hooks for data management
import { useOrderData } from '@/crm/hooks/useOrderData';
import { useOrderItems } from '@/crm/hooks/useOrderItems';
import { useOrderMessages } from '@/crm/hooks/useOrderMessages';
import { useOrderObservations } from '@/crm/hooks/useOrderObservations';
import { useOrderAttachments } from '@/crm/hooks/useOrderAttachments';
import { useBudgetCustomName } from './useBudgetCustomName';
import { useBudgetStatus } from './useBudgetStatus';
import { calculateBudgetTotals, type Item3D } from '../utils/budgetCalculations';

interface UseBudgetDetailReturn {
  // Data
  order: OrderData | null;
  items3D: Item3D[];
  manualItems: ReturnType<typeof useOrderItems>['manualItems'];
  messages: ReturnType<typeof useOrderMessages>['messages'];
  observations: ReturnType<typeof useOrderObservations>['observations'];
  attachments: ReturnType<typeof useOrderAttachments>['attachments'];
  totals: ReturnType<typeof calculateBudgetTotals>;
  customName: string;
  loading: boolean;
  uploading: boolean;

  // UI State
  isCatalogOpen: boolean;
  setIsCatalogOpen: (open: boolean) => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
  newObservation: string;
  setNewObservation: (observation: string) => void;
  setCustomName: (name: string) => void;
  parametricModal: {
    isOpen: boolean;
    item: CatalogItem | null;
    value: string;
  };
  setParametricModal: (modal: {
    isOpen: boolean;
    item: CatalogItem | null;
    value: string;
  }) => void;
  modal: ModalState;
  setModal: (modal: ModalState) => void;

  // Actions
  loadOrderData: () => Promise<void>;
  handleSaveName: () => Promise<void>;
  handleAddObservation: () => Promise<void>;
  handleAddItem: (item: CatalogItem) => void;
  confirmParametricItem: () => void;
  handleDeleteManualItem: (itemId: string) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteAttachment: (attId: string) => Promise<void>;
  handleStatusChange: (status: string) => void;
  handleDelete: () => void;
  handleCancelOrder: () => void;
  handleSendMessage: () => Promise<void>;
  closeModal: () => void;
}

/**
 * Orchestrator hook for budget detail page
 * Coordinates all data fetching and actions
 */
export const useBudgetDetail = (orderId: string | undefined): UseBudgetDetailReturn => {
  const navigate = useNavigate();
  const { handleError, showLoading, dismissToast } = useErrorHandler({
    context: 'useBudgetDetail',
  });

  // Data hooks
  const orderData = useOrderData();
  const orderItems = useOrderItems();
  const orderMessages = useOrderMessages();
  const orderObservations = useOrderObservations();
  const orderAttachments = useOrderAttachments();
  const budgetCustomName = useBudgetCustomName();
  const budgetStatus = useBudgetStatus();

  // Local state
  const [items3D, setItems3D] = useState<Item3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [parametricModal, setParametricModal] = useState<{
    isOpen: boolean;
    item: CatalogItem | null;
    value: string;
  }>({ isOpen: false, item: null, value: '' });
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  // Load all order data
  const loadOrderData = useCallback(async () => {
    if (!orderId) return;

    const loadingToast = showLoading('Cargando presupuesto...');
    setLoading(true);

    try {
      // Load main order data
      await orderData.loadOrderData(orderId);

      // Process 3D items from order data
      const raw3DItems =
        orderData.order?.projects?.data?.items || orderData.order?.projects?.items || [];

      if (raw3DItems.length > 0) {
        const calculated3DItems: Item3D[] = raw3DItems.map((item: Record<string, unknown>) => ({
          uuid: item.uuid as string,
          name: (item.name as string) || 'Elemento 3D',
          quantity: 1,
          // @ts-expect-error - PriceCalculator expects SceneItem but we have dynamic data
          info: PriceCalculator.getItemDimensions(item),
          // @ts-expect-error - PriceCalculator expects SceneItem but we have dynamic data
          price: PriceCalculator.getItemPrice(item),
          is3D: true,
        }));
        setItems3D(calculated3DItems);
      } else {
        setItems3D([]);
      }

      // Set custom name if exists
      if (orderData.order?.custom_name) {
        budgetCustomName.setCustomName(orderData.order.custom_name);
      }

      // Load related data
      await Promise.all([
        orderItems.fetchItems(orderId),
        orderMessages.fetchMessages(orderId),
        orderObservations.fetchObservations(orderId),
        orderAttachments.fetchAttachments(orderId),
      ]);

      dismissToast(loadingToast);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
      navigate('/portal');
    } finally {
      setLoading(false);
    }
  }, [
    orderId,
    orderData,
    orderItems,
    orderMessages,
    orderObservations,
    orderAttachments,
    budgetCustomName,
    handleError,
    showLoading,
    dismissToast,
    navigate,
  ]);

  // Load data on mount
  useEffect(() => {
    loadOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Calculate totals
  const totals = calculateBudgetTotals(
    orderData.order,
    items3D,
    orderItems.manualItems
  );

  // Actions
  const handleSaveName = useCallback(async () => {
    if (!orderId) return;
    await budgetCustomName.saveName(orderId);
    await loadOrderData();
  }, [orderId, budgetCustomName, loadOrderData]);

  const handleAddObservation = useCallback(async () => {
    if (!orderId) return;
    await orderObservations.addObservation(orderId, newObservation);
    setNewObservation('');
  }, [orderId, orderObservations, newObservation]);

  const handleAddItem = useCallback(
    (item: CatalogItem) => {
      if (orderData.order?.status !== 'pendiente') {
        handleError(
          new AppError(ErrorType.PERMISSION, 'Cannot add items to non-pending budget', {
            userMessage: 'Solo puedes añadir elementos si el presupuesto está pendiente',
            severity: ErrorSeverity.LOW,
          })
        );
        return;
      }

      if (item.type === 'fence' || item.type === 'floor') {
        setParametricModal({ isOpen: true, item, value: '' });
      } else {
        orderItems.addItem(orderId!, item, 1).then(() => loadOrderData());
      }
    },
    [orderData.order, orderItems, orderId, handleError, loadOrderData]
  );

  const confirmParametricItem = useCallback(async () => {
    const val = parseFloat(parametricModal.value);

    if (!val || val <= 0) {
      handleError(
        new AppError(ErrorType.VALIDATION, 'Invalid value', {
          userMessage: 'El valor debe ser mayor que 0',
          severity: ErrorSeverity.LOW,
        })
      );
      return;
    }

    const item = parametricModal.item;
    if (!item || !orderId) return;

    await orderItems.addParametricItem(orderId, item, val);
    setParametricModal({ isOpen: false, item: null, value: '' });
    await loadOrderData();
  }, [parametricModal, orderItems, orderId, handleError, loadOrderData]);

  const handleDeleteManualItem = useCallback(
    async (itemId: string) => {
      if (orderData.order?.status !== 'pendiente') {
        handleError(
          new AppError(ErrorType.PERMISSION, 'Cannot delete items from non-pending budget', {
            userMessage: 'Solo editable en fase pendiente',
            severity: ErrorSeverity.LOW,
          })
        );
        return;
      }

      if (!confirm('¿Borrar línea?')) return;

      await orderItems.deleteItem(itemId);
      await loadOrderData();
    },
    [orderData.order, orderItems, handleError, loadOrderData]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !orderId) return;

      await orderAttachments.uploadFile(orderId, file);
      await loadOrderData();
    },
    [orderId, orderAttachments, loadOrderData]
  );

  const handleDeleteAttachment = useCallback(
    async (attId: string) => {
      if (!confirm('¿Borrar archivo?')) return;

      await orderAttachments.deleteAttachment(attId);
      await loadOrderData();
    },
    [orderAttachments, loadOrderData]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      setModal({
        isOpen: true,
        title: status === 'pedido' ? 'Confirmar Pedido' : 'Rechazar Presupuesto',
        message:
          status === 'pedido'
            ? 'Al aceptar, el pedido pasará a fabricación.'
            : 'El presupuesto pasará a archivados.',
        isDestructive: status === 'rechazado',
        onConfirm: async () => {
          if (!orderId) return;
          await budgetStatus.handleStatusChange(orderId, status, totals);
          closeModal();
        },
      });
    },
    [orderId, budgetStatus, totals]
  );

  const handleDelete = useCallback(() => {
    setModal({
      isOpen: true,
      title: 'Borrar Solicitud',
      message: 'Se borrará la solicitud y el diseño. ¿Continuar?',
      isDestructive: true,
      onConfirm: async () => {
        if (!orderId) return;
        await budgetStatus.handleDelete(orderId);
        closeModal();
      },
    });
  }, [orderId, budgetStatus]);

  const handleCancelOrder = useCallback(() => {
    setModal({
      isOpen: true,
      title: 'Cancelar Pedido',
      message: 'El pedido pasará a cancelado.',
      isDestructive: true,
      onConfirm: async () => {
        if (!orderId) return;
        await budgetStatus.handleCancelOrder(orderId);
        closeModal();
      },
    });
  }, [orderId, budgetStatus]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !orderId) return;

    await orderMessages.sendMessage(orderId, newMessage);
    setNewMessage('');
  }, [orderId, orderMessages, newMessage]);

  const closeModal = useCallback(() => {
    setModal({ ...modal, isOpen: false });
  }, [modal]);

  return {
    // Data
    order: orderData.order,
    items3D,
    manualItems: orderItems.manualItems,
    messages: orderMessages.messages,
    observations: orderObservations.observations,
    attachments: orderAttachments.attachments,
    totals,
    customName: budgetCustomName.customName,
    loading,
    uploading: orderAttachments.uploading,

    // UI State
    isCatalogOpen,
    setIsCatalogOpen,
    newMessage,
    setNewMessage,
    newObservation,
    setNewObservation,
    setCustomName: budgetCustomName.setCustomName,
    parametricModal,
    setParametricModal,
    modal,
    setModal,

    // Actions
    loadOrderData,
    handleSaveName,
    handleAddObservation,
    handleAddItem,
    confirmParametricItem,
    handleDeleteManualItem,
    handleFileUpload,
    handleDeleteAttachment,
    handleStatusChange,
    handleDelete,
    handleCancelOrder,
    handleSendMessage,
    closeModal,
  };
};

