// ============================================================================
// BUDGET DETAIL PAGE - Refactored
// Main component for viewing and managing budget details
// Now uses hooks for all business logic
// ============================================================================

import { useParams, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { getStatusBadge } from '@/crm/pages/budgetUtils';

// Importar componentes
import { BudgetHeader } from '../../shared/components/BudgetHeader';
import { BudgetInfoCard } from '../../shared/components/BudgetInfoCard';
import { BudgetObservationsCard } from '../../shared/components/BudgetObservationsCard';
import { BudgetAttachmentsCard } from '../../shared/components/BudgetAttachmentsCard';
import { BudgetMaterialsCard } from '../../shared/components/BudgetMaterialsCard';
import { BudgetProjectCard } from '../../shared/components/BudgetProjectCard';
import { BudgetChatPanel } from '../../shared/components/BudgetChatPanel';
import { CatalogModal } from '../../shared/components/CatalogModal';
import { ParametricModal } from '../../shared/components/ParametricModal';

// Hook orquestador
import { useBudgetDetail } from '../hooks/useBudgetDetail';

export const BudgetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    // Data
    order,
    items3D,
    manualItems,
    messages,
    observations,
    attachments,
    totals,
    customName,
    loading,
    uploading,

    // UI State
    isCatalogOpen,
    setIsCatalogOpen,
    newMessage,
    setNewMessage,
    newObservation,
    setNewObservation,
    setCustomName,
    parametricModal,
    setParametricModal,
    modal,

    // Actions
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
    handleReactivate,
    handleSendMessage,
    closeModal,
  } = useBudgetDetail(id);

  if (loading) return <p className="text-gray-500 p-5">Cargando...</p>;
  if (!order) return <p className="text-white">Error.</p>;

  const badge = getStatusBadge(order.status);
  const isPending = order.status === 'pendiente';
  const isDecisionTime = order.status === 'presupuestado';
  const isOrderConfirmed = order.status === 'pedido';
  const isArchived = order.is_archived === true;
  const isLocked = !isPending && !isOrderConfirmed && order.status !== 'presupuestado' && !isArchived;

  // OrderData is compatible with Order for UI components
  const orderForUI = order as any;

  return (
    <div className="budget-detail-container p-5 bg-black min-h-screen">
      <ConfirmModal {...modal} onCancel={closeModal} />

      <BudgetHeader
        isLocked={isLocked}
        isDecisionTime={isDecisionTime}
        isOrderConfirmed={isOrderConfirmed}
        isPending={isPending}
        isArchived={isArchived}
        onAccept={() => handleStatusChange('pedido')}
        onReject={() => handleStatusChange('rechazado')}
        onCancel={handleCancelOrder}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
        onBack={() => navigate(-1)}
      />

      <div className="grid grid-cols-[2fr_1fr] gap-5 h-full">
        {/* COLUMNA IZQUIERDA */}
        <div className="flex flex-col gap-2.5">
          <BudgetInfoCard
            order={orderForUI}
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

          <BudgetProjectCard order={orderForUI} />
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
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectItem={handleAddItem}
      />

      <ParametricModal
        isOpen={parametricModal.isOpen}
        item={parametricModal.item}
        value={parametricModal.value}
        onValueChange={(value) => setParametricModal({ ...parametricModal, value })}
        onConfirm={confirmParametricItem}
        onCancel={() => setParametricModal({ isOpen: false, item: null, value: '' })}
      />
    </div>
  );
};
