// BudgetDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/core/lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PriceCalculator, PRICES } from '@/pdf/utils/PriceCalculator';
import type { Order, OrderStatus } from '@/domain/types/types';

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// Importar tipos y utilidades
import type { CatalogItem, ModalState } from './budgetTypes';
import { getStatusBadge } from './budgetUtils';

// Importar componentes
import { BudgetHeader } from './BudgetHeader';
import { BudgetInfoCard } from './BudgetInfoCard';
import { BudgetObservationsCard } from './BudgetObservationsCard';
import { BudgetAttachmentsCard } from './BudgetAttachmentsCard';
import { BudgetMaterialsCard } from './BudgetMaterialsCard';
import { BudgetProjectCard } from './BudgetProjectCard';
import { BudgetChatPanel } from './BudgetChatPanel';
import { BudgetCatalogModal } from './BudgetCatalogModal';
import { BudgetParametricModal } from './BudgetParametricModal';

// ✅ TIPOS ADICIONALES
interface Item3D {
  uuid: string;
  name: string;
  quantity: number;
  info: string;
  price: number;
  is3D: boolean;
}

interface ManualItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  quantity: number;
  total_price: number;
  dimensions: string;
}

interface OrderMessage {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

interface Observation {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

interface Attachment {
  id: string;
  order_id: string;
  file_name: string;
  file_url: string;
  uploader_id: string;
  created_at: string;
}

export const BudgetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // ✅ AÑADIR ERROR HANDLER
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'BudgetDetailPage'
  });
  
  const [order, setOrder] = useState<Order | null>(null);
  const [items3D, setItems3D] = useState<Item3D[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  
  // Nombres y Notas
  const [customName, setCustomName] = useState('');
  
  // Observaciones
  const [observations, setObservations] = useState<Observation[]>([]);
  const [newObservation, setNewObservation] = useState('');
  
  // Archivos
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Modals
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
    isDestructive: false 
  });
  
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadOrderData(); }, [id]);

  const loadOrderData = async () => {
    if (!id) return;
    
    const loadingToast = showLoading('Cargando presupuesto...');
    setLoading(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, projects(*), profiles(discount_rate)')
        .eq('id', id)
        .single();
      
      if (orderError) throw orderError;
      
      if (!orderData) {
        throw new AppError(
          ErrorType.NOT_FOUND,
          'Order not found',
          { 
            userMessage: 'Presupuesto no encontrado',
            severity: ErrorSeverity.MEDIUM 
          }
        );
      }
      
      // Items 3D
      let calculated3DItems: Item3D[] = [];
      const raw3DItems = orderData.projects?.data?.items || orderData.projects?.items || [];
      
      if (raw3DItems.length > 0) {
        calculated3DItems = raw3DItems.map((item: Record<string, unknown>) => ({
          uuid: item.uuid as string,
          name: (item.name as string) || 'Elemento 3D',
          quantity: 1,
          // @ts-expect-error - PriceCalculator expects SceneItem but we have dynamic data
          info: PriceCalculator.getItemDimensions(item),
          // @ts-expect-error - PriceCalculator expects SceneItem but we have dynamic data
          price: PriceCalculator.getItemPrice(item),
          is3D: true
        }));
      }
      setItems3D(calculated3DItems);
      setOrder(orderData);
      
      // Cargar Nombre si existe
      if (orderData.custom_name) setCustomName(orderData.custom_name);

      // Items Manuales
      const { data: mItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      
      if (itemsError) throw itemsError;
      setManualItems(mItems || []);

      // Chat
      const { data: chatData, error: chatError } = await supabase
        .from('order_messages')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: true });
      
      if (chatError) throw chatError;
      setMessages(chatData || []);

      // Adjuntos
      const { data: att, error: attError } = await supabase
        .from('order_attachments')
        .select('*')
        .eq('order_id', id);
      
      if (attError) throw attError;
      setAttachments(att || []);

      // Observaciones
      const { data: obs, error: obsError } = await supabase
        .from('order_observations')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: false }); 
      
      if (obsError) throw obsError;
      setObservations(obs || []);

      dismissToast(loadingToast);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
      navigate('/portal');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const total3D = items3D.reduce((acc, item) => acc + item.price, 0);
    const totalManual = manualItems.reduce((acc, item) => acc + item.total_price, 0);
    const subtotal = total3D + totalManual;
    // @ts-expect-error - discount_rate exists in database but not in Profile type
    const discountRate = order?.profiles?.discount_rate || 0;
    const discountAmount = subtotal * (discountRate / 100);
    return { subtotal, discountRate, discountAmount, final: subtotal - discountAmount };
  };
  
  const totals = calculateTotal();

  // --- ACCIONES DATOS ---
  const handleSaveName = async () => {
    const loadingToast = showLoading('Guardando nombre...');
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ custom_name: customName })
        .eq('id', id);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Nombre guardado correctamente');
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) {
      handleError(
        new AppError(
          ErrorType.VALIDATION,
          'Empty observation',
          { 
            userMessage: 'La observación no puede estar vacía',
            severity: ErrorSeverity.LOW 
          }
        )
      );
      return;
    }
    
    const loadingToast = showLoading('Añadiendo observación...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('order_observations').insert([{
        order_id: id,
        user_id: user?.id,
        content: newObservation
      }]);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Observación añadida');
      setNewObservation('');
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  // --- ACCIONES ITEMS ---
  const handleAddItem = (item: CatalogItem) => {
    if (order?.status !== 'pendiente') {
      handleError(
        new AppError(
          ErrorType.PERMISSION,
          'Cannot add items to non-pending budget',
          { 
            userMessage: 'Solo puedes añadir elementos si el presupuesto está pendiente',
            severity: ErrorSeverity.LOW 
          }
        )
      );
      return;
    }
    
    if (item.type === 'fence' || item.type === 'floor') {
      setParametricModal({ isOpen: true, item, value: '' });
    } else {
      saveManualItem(item.id, item.name, 1, item.price, '1 ud');
    }
  };

  const confirmParametricItem = () => {
    const val = parseFloat(parametricModal.value);
    
    if (!val || val <= 0) {
      handleError(
        new AppError(
          ErrorType.VALIDATION,
          'Invalid value',
          { 
            userMessage: 'El valor debe ser mayor que 0',
            severity: ErrorSeverity.LOW 
          }
        )
      );
      return;
    }
    
    const item = parametricModal.item;
    if (!item) return;
    
    let price = 0;
    let dimensions = '';
    
    if (item.type === 'fence') { 
      price = val * PRICES.FENCE_M; 
      dimensions = `${val} ml`; 
    } else { 
      price = val * PRICES.FLOOR_M2; 
      dimensions = `${val} m²`; 
    }
    
    saveManualItem(item.id, item.name, 1, price, dimensions);
    setParametricModal({ isOpen: false, item: null, value: '' });
  };

  const saveManualItem = async (
    prodId: string, 
    name: string, 
    qty: number, 
    total: number, 
    dims: string
  ) => {
    const loadingToast = showLoading('Añadiendo elemento...');
    
    try {
      const { error } = await supabase.from('order_items').insert([{
        order_id: id, 
        product_id: prodId, 
        name, 
        quantity: qty, 
        total_price: total, 
        dimensions: dims
      }]);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess(`✅ ${name} añadido correctamente`);
      setIsCatalogOpen(false);
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  const handleDeleteManualItem = async (itemId: string) => {
    if (order?.status !== 'pendiente') {
      handleError(
        new AppError(
          ErrorType.PERMISSION,
          'Cannot delete items from non-pending budget',
          { 
            userMessage: 'Solo editable en fase pendiente',
            severity: ErrorSeverity.LOW 
          }
        )
      );
      return;
    }
    
    if (!confirm("¿Borrar línea?")) return;
    
    const loadingToast = showLoading('Eliminando elemento...');
    
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Elemento eliminado');
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  // --- ARCHIVOS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const loadingToast = showLoading('Subiendo archivo...');
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('order_attachments')
        .insert([{
          order_id: id, 
          file_name: file.name, 
          file_url: publicUrl, 
          uploader_id: user?.id
        }]);
      
      if (insertError) throw insertError;
      
      dismissToast(loadingToast);
      showSuccess(`✅ ${file.name} subido correctamente`);
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally { 
      setUploading(false); 
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!confirm("¿Borrar archivo?")) return;
    
    const loadingToast = showLoading('Eliminando archivo...');
    
    try {
      const { error } = await supabase
        .from('order_attachments')
        .delete()
        .eq('id', attId);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Archivo eliminado');
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  // --- ESTADOS Y BOTONES ---
  const handleStatusChange = (status: string) => {
    setModal({
      isOpen: true,
      title: status === 'pedido' ? 'Confirmar Pedido' : 'Rechazar Presupuesto',
      message: status === 'pedido' 
        ? 'Al aceptar, el pedido pasará a fabricación.' 
        : 'El presupuesto pasará a archivados.',
      isDestructive: status === 'rechazado',
      onConfirm: async () => {
        const loadingToast = showLoading(
          status === 'pedido' ? 'Confirmando pedido...' : 'Rechazando presupuesto...'
        );
        
        try {
          const update: Partial<Order> = { 
            status: status as OrderStatus, 
            total_price: totals.final 
          };
          
          if (status === 'pedido') {
            const d = new Date(); 
            d.setDate(d.getDate() + 42); 
            update.estimated_delivery_date = d.toISOString();
          }
          
          const { error } = await supabase
            .from('orders')
            .update(update)
            .eq('id', id);
          
          if (error) throw error;
          
          dismissToast(loadingToast);
          showSuccess(
            status === 'pedido' 
              ? '✅ Pedido confirmado. ¡Pasando a fabricación!' 
              : '✅ Presupuesto archivado'
          );
          
          if (status === 'pedido') navigate('/portal?tab=orders');
          else navigate('/portal?tab=archived');
          
          closeModal();
        } catch (error) {
          dismissToast(loadingToast);
          handleError(error);
          closeModal();
        }
      }
    });
  };

  const handleDelete = () => {
    setModal({
      isOpen: true, 
      title: 'Borrar Solicitud', 
      message: 'Se borrará la solicitud y el diseño. ¿Continuar?', 
      isDestructive: true,
      onConfirm: async () => {
        const loadingToast = showLoading('Eliminando solicitud...');
        
        try {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          dismissToast(loadingToast);
          showSuccess('✅ Solicitud eliminada');
          navigate('/portal?tab=orders');
          closeModal();
        } catch (error) {
          dismissToast(loadingToast);
          handleError(error);
          closeModal();
        }
      }
    });
  };
  
  const handleCancelOrder = () => {
    setModal({
      isOpen: true, 
      title: 'Cancelar Pedido', 
      message: 'El pedido pasará a cancelado.', 
      isDestructive: true,
      onConfirm: async () => {
        const loadingToast = showLoading('Cancelando pedido...');
        
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelado', is_archived: true })
            .eq('id', id);
          
          if (error) throw error;
          
          dismissToast(loadingToast);
          showSuccess('✅ Pedido cancelado');
          navigate('/portal?tab=archived');
          closeModal();
        } catch (error) {
          dismissToast(loadingToast);
          handleError(error);
          closeModal();
        }
      }
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    
    const loadingToast = showLoading('Enviando mensaje...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('order_messages').insert([{ 
        order_id: id, 
        user_id: user?.id, 
        content: newMessage 
      }]);
      
      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Mensaje enviado');
      setNewMessage(''); 
      loadOrderData();
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  };

  if (loading) return <p className="text-gray-500 p-5">Cargando...</p>;
  if (!order) return <p className="text-white">Error.</p>;

  const badge = getStatusBadge(order.status);
  const isPending = order.status === 'pendiente'; 
  const isDecisionTime = order.status === 'presupuestado';
  const isOrderConfirmed = order.status === 'pedido'; 
  const isLocked = !isPending && !isOrderConfirmed && order.status !== 'presupuestado';

  return (
    <div className="budget-detail-container p-5 bg-black min-h-screen">
      <ConfirmModal {...modal} onCancel={closeModal} />

      <BudgetHeader
        isLocked={isLocked}
        isDecisionTime={isDecisionTime}
        isOrderConfirmed={isOrderConfirmed}
        isPending={isPending}
        onAccept={() => handleStatusChange('pedido')}
        onReject={() => handleStatusChange('rechazado')}
        onCancel={handleCancelOrder}
        onDelete={handleDelete}
        onBack={() => navigate(-1)}
      />
      
      <div className="grid grid-cols-[2fr_1fr] gap-5 h-full">
        {/* COLUMNA IZQUIERDA */}
        <div className="flex flex-col gap-2.5">
          <BudgetInfoCard
            order={order}
            customName={customName}
            isPending={isPending}
            isDecisionTime={isDecisionTime}
            statusBadge={badge}
            onCustomNameChange={setCustomName}
            onSaveName={handleSaveName}
          />

          <BudgetObservationsCard
            observations={observations}
            newObservation={newObservation}
            isPending={isPending}
            isDecisionTime={isDecisionTime}
            onNewObservationChange={setNewObservation}
            onAddObservation={handleAddObservation}
          />

          <BudgetAttachmentsCard
            attachments={attachments}
            uploading={uploading}
            onFileUpload={handleFileUpload}
            onDeleteAttachment={handleDeleteAttachment}
          />

          <BudgetMaterialsCard
            items3D={items3D}
            manualItems={manualItems}
            isPending={isPending}
            totals={totals}
            onAddItem={() => setIsCatalogOpen(true)}
            onDeleteManualItem={handleDeleteManualItem}
          />

          <BudgetProjectCard order={order} />
        </div>

        {/* COLUMNA DERECHA: CHAT */}
        <BudgetChatPanel
          messages={messages}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* MODALES */}
      <BudgetCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectItem={handleAddItem}
      />

      <BudgetParametricModal
        isOpen={parametricModal.isOpen}
        item={parametricModal.item}
        value={parametricModal.value}
        onValueChange={(value) => setParametricModal({...parametricModal, value})}
        onConfirm={confirmParametricItem}
        onCancel={() => setParametricModal({ isOpen: false, item: null, value: '' })}
      />
    </div>
  );
};