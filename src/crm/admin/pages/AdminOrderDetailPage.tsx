// AdminOrderDetailPage.tsx
// ✅ Refactorizado - Usa hooks para gestión de datos
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/core/lib/supabase';
import { generateBudgetPDF } from '@/pdf/utils/pdfGenerator';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Hooks
import { useOrderData } from '@/crm/hooks/useOrderData';
import { useOrderMessages } from '@/crm/hooks/useOrderMessages';
import { useOrderObservations } from '@/crm/hooks/useOrderObservations';
import { useOrderAttachments } from '@/crm/hooks/useOrderAttachments';
import { useOrderItems } from '@/crm/hooks/useOrderItems';

// Utils
import { applyClientDiscount, copyBasePriceToTotal, formatDiscountConfirmation } from '../utils/orderPriceUtils';
import { calculateDeliveryDate } from '@/crm/pages/utils';

// Tipos
import type { OrderStatus, CatalogItem } from '@/crm/pages/types';

// Componentes
import { OrderHeader } from '../components/OrderHeader';
import { OrderControlCard } from '../../shared/components/OrderControlCard';
import { ObservationsCard } from '../../shared/components/ObservationsCard';
import { MaterialsBreakdownCard } from '../../shared/components/MaterialsBreakdownCard';
import { AttachmentsCard } from '../../shared/components/AttachmentsCard';
import { ChatPanel } from '../../shared/components/ChatPanel';
import { CatalogModal } from '../../shared/components/CatalogModal';
import { ParametricModal } from '../../shared/components/ParametricModal';

export const AdminOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { handleError, showSuccess, showLoading, dismissToast, logError } = useErrorHandler({
    context: 'AdminOrderDetailPage',
  });
  
  // Hooks
  const {
    order,
    items3D,
    manualItems,
    calculatedBasePrice,
    loadOrderData,
    updateOrder,
  } = useOrderData();
  const { messages, fetchMessages, sendMessage } = useOrderMessages();
  const { observations, fetchObservations, addObservation } = useOrderObservations();
  const { attachments, uploading, fetchAttachments, uploadFile, deleteAttachment } =
    useOrderAttachments();
  const { fetchItems, addItem, addParametricItem, deleteItem } = useOrderItems();

  // UI State
  const [newMessage, setNewMessage] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [parametricModal, setParametricModal] = useState<{
    isOpen: boolean;
    item: CatalogItem | null;
    value: string;
  }>({ isOpen: false, item: null, value: '' });

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  useEffect(() => {
    if (!id) return;
    
    const loadAllData = async () => {
      await Promise.all([
        loadOrderData(id),
        fetchMessages(id),
        fetchObservations(id),
        fetchAttachments(id),
        fetchItems(id),
      ]);
    };

    loadAllData();
  }, [id, loadOrderData, fetchMessages, fetchObservations, fetchAttachments, fetchItems]);

  // Set initial date when order loads
  useEffect(() => {
    if (order?.estimated_delivery_date) {
      setNewDate(new Date(order.estimated_delivery_date).toISOString().slice(0, 16));
    }
  }, [order?.estimated_delivery_date]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleUpdateOrder = async () => {
    if (!order || !id) return;
    
    const loadingToast = showLoading('Guardando cambios...');
    setIsGeneratingPDF(true);

    try {
      // Para presupuestos: si no hay fecha, calcular automáticamente (48h desde ahora)
      // Para pedidos: el admin puede modificar la fecha manualmente en cualquier momento
      let dateToSave = newDate ? new Date(newDate).toISOString() : null;
      if (order.status === 'presupuestado' && !dateToSave) {
        // Calcular fecha al momento de guardar (48h desde ahora)
        const deliveryDate = new Date();
        deliveryDate.setHours(deliveryDate.getHours() + 48);
        dateToSave = deliveryDate.toISOString();
      }
      // Si es un pedido y no hay fecha nueva, mantener la fecha existente (no recalcular)

      await updateOrder({
        status: order.status,
        custom_name: order.custom_name, 
        estimated_delivery_date: dateToSave || order.estimated_delivery_date || undefined,
        total_price: order.total_price,
      });

      // Si el estado es "presupuestado", generar PDF automático
      if (order.status === 'presupuestado') {
        dismissToast(loadingToast);
        const pdfToast = showLoading('Generando PDF de presupuesto...');
        
        try {
          // Fecha del presupuesto: momento exacto cuando se guarda y genera el PDF
          const budgetDate = new Date();
          // @ts-expect-error - Type mismatch between OrderData and PDF generator expected type
          const pdfBlob = await generateBudgetPDF(order, items3D, manualItems, budgetDate);
          
          const fileName = `Presupuesto_${order.order_ref}_${Date.now()}.pdf`;
          const filePath = `${id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, pdfBlob);
          
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          const { data: { user } } = await supabase.auth.getUser();
          const { error: dbError } = await supabase.from('order_attachments').insert([
            {
            order_id: id,
            file_name: `📄 ${fileName}`,
            file_url: publicUrl,
              uploader_id: user?.id,
            },
          ]);

          if (dbError) throw dbError;

          // Agregar observación automática con el PDF del presupuesto
          const formattedDate = budgetDate.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const observationContent = `📄 Presupuesto generado el ${formattedDate}\n\n[Ver PDF](${publicUrl})`;
          
          const { error: obsError } = await supabase.from('order_observations').insert([
            {
              order_id: id,
              user_id: user?.id,
              content: observationContent,
            },
          ]);

          if (obsError) {
            logError('Error adding observation', obsError);
          } else {
            // Recargar observaciones para mostrar la nueva
            await fetchObservations(id);
          }
          
          dismissToast(pdfToast);
          showSuccess('✅ Cambios guardados y PDF de Presupuesto enviado al cliente');
        } catch (pdfError) {
          dismissToast(pdfToast);
          throw pdfError;
        }
      } else {
        dismissToast(loadingToast);
        showSuccess('✅ Pedido actualizado correctamente');
      }

      // Reload all data
      if (id) {
        await Promise.all([
          loadOrderData(id),
          fetchMessages(id),
          fetchObservations(id),
          fetchAttachments(id),
          fetchItems(id),
        ]);
      }
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleStatusChange = (status: OrderStatus) => {
    if (!order) return;
    const calculatedDate = calculateDeliveryDate(status, newDate);
    setNewDate(calculatedDate);
    updateOrder({ status });
  };

  const handleApplyDiscount = () => {
    if (!order) return;
    const discount = order.profiles?.discount_rate || 0;
    const discountAmount = calculatedBasePrice * (discount / 100);
    const finalPrice = applyClientDiscount(calculatedBasePrice, discount);
    
    if (
      confirm(
        formatDiscountConfirmation(
          calculatedBasePrice,
          discount,
          discountAmount,
          finalPrice
        )
      )
    ) {
      updateOrder({ total_price: finalPrice });
      showSuccess(`✅ Descuento del ${discount}% aplicado`);
    }
  };

  const handleCopyBasePrice = () => {
    if (!order) return;
    const updatedOrder = copyBasePriceToTotal(order, calculatedBasePrice);
    updateOrder({ total_price: updatedOrder.total_price });
      showSuccess('✅ Precio base copiado al total');
  };

  const handleAddObservation = async () => {
    if (!id) return;
    try {
      await addObservation(id, newObservation);
      setNewObservation(''); 
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleAddItem = async (item: CatalogItem) => {
    if (!id) return;
    if (item.type === 'fence' || item.type === 'floor') {
      setParametricModal({ isOpen: true, item, value: '' });
    } else {
      try {
        await addItem(id, item, 1);
        setIsCatalogOpen(false);
      } catch (error) {
        // Error ya manejado en el hook
      }
    }
  };

  const handleConfirmParametricItem = async () => {
    if (!id || !parametricModal.item) return;
    const val = parseFloat(parametricModal.value);
    
    try {
      await addParametricItem(id, parametricModal.item, val);
    setParametricModal({ isOpen: false, item: null, value: '' });
      setIsCatalogOpen(false);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleDeleteManualItem = async (itemId: string) => {
    if (!confirm('¿Borrar línea?')) return;
    try {
      await deleteItem(itemId);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleSendMessage = async () => {
    if (!id) return;
    try {
      await sendMessage(id, newMessage);
      setNewMessage(''); 
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      await uploadFile(id, file);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!confirm('¿Borrar archivo?')) return;
    try {
      await deleteAttachment(attId);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!order) return <p className="text-white">Cargando...</p>;

  return (
    <div className="p-5 h-screen flex flex-col bg-black">
      <OrderHeader orderRef={order.order_ref} />
      
      <div className="grid grid-cols-[2fr_1fr] gap-5 h-full text-gray-300 font-sans">
        {/* COLUMNA IZQUIERDA */}
        <div className="flex flex-col gap-2.5 overflow-y-auto">
          <OrderControlCard
            order={order}
            newDate={newDate}
            calculatedBasePrice={calculatedBasePrice}
            isGeneratingPDF={isGeneratingPDF}
            onOrderChange={updateOrder}
            onDateChange={setNewDate}
            onStatusChange={handleStatusChange}
            onApplyDiscount={handleApplyDiscount}
            onCopyBasePrice={handleCopyBasePrice}
            onUpdate={handleUpdateOrder}
          />

          <ObservationsCard
            observations={observations}
            newObservation={newObservation}
            onNewObservationChange={setNewObservation}
            onAddObservation={handleAddObservation}
          />

          <MaterialsBreakdownCard
            items3D={items3D}
            manualItems={manualItems}
            calculatedBasePrice={calculatedBasePrice}
            projectId={order.project_id}
            onAddItem={() => setIsCatalogOpen(true)}
            onDeleteManualItem={handleDeleteManualItem}
          />

          <AttachmentsCard
            attachments={attachments}
            uploading={uploading}
            onFileUpload={handleFileUpload}
            onDeleteAttachment={handleDeleteAttachment}
          />
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <ChatPanel
          messages={messages}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* MODALES */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectItem={handleAddItem}
      />

      <ParametricModal
        isOpen={parametricModal.isOpen}
        item={parametricModal.item}
        value={parametricModal.value}
        onValueChange={(value) =>
          setParametricModal({ ...parametricModal, value })
        }
        onConfirm={handleConfirmParametricItem}
        onCancel={() =>
          setParametricModal({ isOpen: false, item: null, value: '' })
        }
      />
    </div>
  );
};
