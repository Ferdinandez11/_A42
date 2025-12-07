// BudgetDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { PriceCalculator, PRICES } from '../../../utils/PriceCalculator';
import type { Order } from '../../../types/types';

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

export const BudgetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [items3D, setItems3D] = useState<any[]>([]);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Nombres y Notas
  const [customName, setCustomName] = useState('');
  
  // Observaciones
  const [observations, setObservations] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');
  
  // Archivos
  const [attachments, setAttachments] = useState<any[]>([]);
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

  useEffect(() => { loadOrderData(); }, [id]);

  const loadOrderData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, projects(*), profiles(discount_rate)')
      .eq('id', id)
      .single();
    
    if (!orderData) { 
      navigate('/portal'); 
      return; 
    }
    
    // Items 3D
    let calculated3DItems: any[] = [];
    const raw3DItems = orderData.projects?.data?.items || orderData.projects?.items || [];
    
    if (raw3DItems.length > 0) {
      calculated3DItems = raw3DItems.map((item: any) => ({
        uuid: item.uuid,
        name: item.name || 'Elemento 3D',
        quantity: 1,
        info: PriceCalculator.getItemDimensions(item),
        price: PriceCalculator.getItemPrice(item),
        is3D: true
      }));
    }
    setItems3D(calculated3DItems);
    setOrder(orderData as any);
    
    // Cargar Nombre si existe
    if (orderData.custom_name) setCustomName(orderData.custom_name);

    // Items Manuales
    const { data: mItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);
    setManualItems(mItems || []);

    // Chat
    const { data: chatData } = await supabase
      .from('order_messages')
      .select('*, profiles(full_name, role)')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    setMessages(chatData || []);

    // Adjuntos
    const { data: att } = await supabase
      .from('order_attachments')
      .select('*')
      .eq('order_id', id);
    setAttachments(att || []);

    // Observaciones
    const { data: obs } = await supabase
      .from('order_observations')
      .select('*, profiles(full_name, role)')
      .eq('order_id', id)
      .order('created_at', { ascending: false }); 
    setObservations(obs || []);

    setLoading(false);
  };

  const calculateTotal = () => {
    const total3D = items3D.reduce((acc, item) => acc + item.price, 0);
    const totalManual = manualItems.reduce((acc, item) => acc + item.total_price, 0);
    const subtotal = total3D + totalManual;
    const discountRate = (order as any)?.profiles?.discount_rate || 0;
    const discountAmount = subtotal * (discountRate / 100);
    return { subtotal, discountRate, discountAmount, final: subtotal - discountAmount };
  };
  
  const totals = calculateTotal();

  // --- ACCIONES DATOS ---
  const handleSaveName = async () => {
    const { error } = await supabase
      .from('orders')
      .update({ custom_name: customName })
      .eq('id', id);
    
    if (error) alert("Error: " + error.message);
    else alert("✅ Nombre guardado");
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('order_observations').insert([{
      order_id: id,
      user_id: user?.id,
      content: newObservation
    }]);
    
    if (error) alert("Error: " + error.message);
    else {
      setNewObservation('');
      loadOrderData();
    }
  };

  // --- ACCIONES ITEMS ---
  const handleAddItem = (item: CatalogItem) => {
    if (order?.status !== 'pendiente') {
      return alert("Solo puedes añadir elementos si el presupuesto está pendiente.");
    }
    
    if (item.type === 'fence' || item.type === 'floor') {
      setParametricModal({ isOpen: true, item, value: '' });
    } else {
      saveManualItem(item.id, item.name, 1, item.price, '1 ud');
    }
  };

  const confirmParametricItem = () => {
    const val = parseFloat(parametricModal.value);
    if (!val || val <= 0) return alert("Valor inválido");
    
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
    await supabase.from('order_items').insert([{
      order_id: id, 
      product_id: prodId, 
      name, 
      quantity: qty, 
      total_price: total, 
      dimensions: dims
    }]);
    setIsCatalogOpen(false);
    loadOrderData(); 
  };

  const handleDeleteManualItem = async (itemId: string) => {
    if (order?.status !== 'pendiente') {
      return alert("Solo editable en fase pendiente.");
    }
    if (!confirm("¿Borrar línea?")) return;
    await supabase.from('order_items').delete().eq('id', itemId);
    loadOrderData();
  };

  // --- ARCHIVOS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;
      
      await supabase.storage.from('attachments').upload(filePath, file);
      
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('order_attachments').insert([{
        order_id: id, 
        file_name: file.name, 
        file_url: publicUrl, 
        uploader_id: user?.id
      }]);
      
      loadOrderData();
    } catch (error: any) { 
      alert('Error al subir: ' + error.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!confirm("¿Borrar archivo?")) return;
    await supabase.from('order_attachments').delete().eq('id', attId);
    loadOrderData();
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
        const update: any = { status, total_price: totals.final };
        
        if (status === 'pedido') {
          const d = new Date(); 
          d.setDate(d.getDate() + 42); 
          update.estimated_delivery_date = d.toISOString();
        }
        
        await supabase.from('orders').update(update).eq('id', id);
        
        if (status === 'pedido') navigate('/portal?tab=orders');
        else navigate('/portal?tab=archived');
        
        closeModal();
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
        await supabase.from('orders').delete().eq('id', id);
        navigate('/portal?tab=orders');
        closeModal();
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
        await supabase
          .from('orders')
          .update({ status: 'cancelado', is_archived: true })
          .eq('id', id);
        navigate('/portal?tab=archived');
        closeModal();
      }
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ 
      order_id: id, 
      user_id: user?.id, 
      content: newMessage 
    }]);
    setNewMessage(''); 
    loadOrderData();
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