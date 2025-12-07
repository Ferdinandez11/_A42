// AdminOrderDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PriceCalculator, PRICES } from '../../../utils/PriceCalculator';
import { generateBillOfMaterials } from '../../../utils/budgetUtils';
import { generateBudgetPDF } from '../../../utils/pdfGenerator';

// Importar tipos
import type { OrderData, OrderStatus, CatalogItem } from './types';
import { formatMoney, calculateDeliveryDate } from './utils';

// Importar componentes
import { OrderHeader } from './OrderHeader';
import { OrderControlCard } from './OrderControlCard';
import { ObservationsCard } from './ObservationsCard';
import { MaterialsBreakdownCard } from './MaterialsBreakdownCard';
import { AttachmentsCard } from './AttachmentsCard';
import { ChatPanel } from './ChatPanel';
import { CatalogModal } from './CatalogModal';
import { ParametricModal } from './ParametricModal';

export const AdminOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  
  // Items
  const [items3D, setItems3D] = useState<any[]>([]); 
  const [manualItems, setManualItems] = useState<any[]>([]); 
  const [calculatedBasePrice, setCalculatedBasePrice] = useState(0); 

  // Chat y Datos
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState(''); 
  
  // Observaciones
  const [observations, setObservations] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState('');

  // Archivos
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // UI
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [parametricModal, setParametricModal] = useState<{
    isOpen: boolean;
    item: CatalogItem | null;
    value: string;
  }>({ isOpen: false, item: null, value: '' });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    // 1. Cargar Pedido
    const { data: o } = await supabase
      .from('orders')
      .select('*, projects(*), profiles(*)')
      .eq('id', id)
      .single();
    
    if (o) {
      setOrder(o as OrderData);
      if (o.estimated_delivery_date) {
        setNewDate(new Date(o.estimated_delivery_date).toISOString().slice(0, 16));
      } else {
        setNewDate('');
      }
      
      // 1.1 Procesar Items 3D
      let total3D = 0;
      let processed3DItems: any[] = [];
      const raw3DItems = o.projects?.data?.items || o.projects?.items || [];

      if (raw3DItems.length > 0) {
        const itemsWithRealPrices = raw3DItems.map((item: any) => ({
          ...item,
          price: PriceCalculator.getItemPrice(item) 
        }));
        processed3DItems = generateBillOfMaterials(itemsWithRealPrices);
        total3D = processed3DItems.reduce((acc, line) => acc + line.totalPrice, 0);
      }
      setItems3D(processed3DItems);

      // 1.2 Cargar Items Manuales
      const { data: mItems } = await supabase.from('order_items').select('*').eq('order_id', id);
      const manual = mItems || [];
      setManualItems(manual);

      // 1.3 Calcular Total Base Real
      const totalManual = manual.reduce((acc: number, item: any) => acc + item.total_price, 0);
      setCalculatedBasePrice(total3D + totalManual);
    }

    // 2. Chat
    const { data: m } = await supabase
      .from('order_messages')
      .select('*, profiles(full_name, role)')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    setMessages(m || []);

    // 3. Adjuntos
    const { data: att } = await supabase.from('order_attachments').select('*').eq('order_id', id);
    setAttachments(att || []);

    // 4. Observaciones
    const { data: obs } = await supabase
      .from('order_observations')
      .select('*, profiles(full_name, role)')
      .eq('order_id', id)
      .order('created_at', { ascending: false });
    setObservations(obs || []);
  };

  // --- ACTUALIZAR PEDIDO Y GENERAR PDF ---
  const handleUpdateOrder = async () => {
    if (!order) return;
    setIsGeneratingPDF(true);

    try {
      const dateToSave = newDate ? new Date(newDate).toISOString() : null;

      // 1. Guardar cambios en la Base de Datos
      const { error } = await supabase.from('orders').update({
        status: order.status,
        custom_name: order.custom_name, 
        estimated_delivery_date: dateToSave,
        total_price: order.total_price 
      }).eq('id', id);

      if (error) throw error;

      // 2. Si el estado es "presupuestado", generar PDF automático
      if (order.status === 'presupuestado') {
        // Convertir OrderData a formato compatible con generateBudgetPDF
        const orderForPDF = {
          ...order,
          custom_name: order.custom_name ?? undefined,
          estimated_delivery_date: order.estimated_delivery_date ?? undefined,
          project_id: order.project_id ?? undefined,
        };
        
        const pdfBlob = await generateBudgetPDF(orderForPDF as any, items3D, manualItems);
        
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
        const { error: dbError } = await supabase.from('order_attachments').insert([{
          order_id: id,
          file_name: `📄 ${fileName}`,
          file_url: publicUrl,
          uploader_id: user?.id
        }]);

        if (dbError) throw dbError;
        
        alert("✅ Cambios guardados y PDF de Presupuesto generado y enviado al cliente.");
      } else {
        alert("✅ Pedido actualizado correctamente.");
      }

      loadData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleStatusChange = (status: OrderStatus) => {
    const calculatedDate = calculateDeliveryDate(status, newDate);
    setNewDate(calculatedDate);
    setOrder(order ? {...order, status} : null);
  };

  const applyClientDiscount = () => {
    if (!order) return;
    const discount = order.profiles?.discount_rate || 0;
    const discountAmount = calculatedBasePrice * (discount / 100);
    const finalPrice = calculatedBasePrice - discountAmount;
    
    if (confirm(
      `Base: ${formatMoney(calculatedBasePrice)}\n` +
      `Dto (${discount}%): -${formatMoney(discountAmount)}\n\n` +
      `Total: ${formatMoney(finalPrice)}`
    )) {
      setOrder({ ...order, total_price: finalPrice }); 
    }
  };

  const copyBasePrice = () => {
    if (order) {
      setOrder({ ...order, total_price: calculatedBasePrice });
    }
  };

  // --- OBSERVACIONES ---
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
      loadData(); 
    }
  };

  // --- ITEMS MANUALES ---
  const handleAddItem = (item: CatalogItem) => {
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
    loadData(); 
  };

  const handleDeleteManualItem = async (itemId: string) => {
    if (!confirm("¿Borrar línea?")) return;
    await supabase.from('order_items').delete().eq('id', itemId);
    loadData();
  };

  // --- CHAT & FILES ---
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('order_messages').insert([{ 
      order_id: id, 
      user_id: user?.id, 
      content: newMessage 
    }]);
    setNewMessage(''); 
    loadData();
  };

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
      
      loadData();
    } catch (error: any) { 
      alert('Error: ' + error.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!confirm("¿Borrar archivo?")) return;
    await supabase.from('order_attachments').delete().eq('id', attId);
    loadData();
  };

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
            onOrderChange={setOrder}
            onDateChange={setNewDate}
            onStatusChange={handleStatusChange}
            onApplyDiscount={applyClientDiscount}
            onCopyBasePrice={copyBasePrice}
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
        onValueChange={(value) => setParametricModal({...parametricModal, value})}
        onConfirm={confirmParametricItem}
        onCancel={() => setParametricModal({ isOpen: false, item: null, value: '' })}
      />
    </div>
  );
};