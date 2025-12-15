// ============================================================================
// ADMIN CLIENT DETAIL PAGE - Refactored
// Main component for viewing and editing client details
// Now uses hooks and extracted components
// ============================================================================

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClientDetail } from '../hooks/useClientDetail';
import { ProfileForm } from '../components/client/ProfileForm';
import { OrderHistory } from '../components/client/OrderHistory';

const MESSAGES = {
  LOADING: 'Cargando ficha...',
  NOT_FOUND: 'Cliente no encontrado.',
  BACK_TO_LIST: 'Volver al Listado',
  CLIENT_CARD_TITLE: 'Ficha Cliente:',
} as const;

export const AdminClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { profile, orders, loading, saving, updateProfile, saveProfile } = useClientDetail(id);

  const handleViewOrder = (orderId: string) => {
    navigate(`/admin/order/${orderId}`);
  };

  const handleBackToList = () => {
    navigate('/admin/crm');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white text-lg">{MESSAGES.LOADING}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400 text-lg">{MESSAGES.NOT_FOUND}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleBackToList}
          className="text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} />
          {MESSAGES.BACK_TO_LIST}
        </button>
        <h2 className="text-2xl font-bold text-white">
          {MESSAGES.CLIENT_CARD_TITLE}{' '}
          <span className="text-blue-500">{profile.email}</span>
        </h2>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form - 2/3 width */}
        <div className="lg:col-span-2">
          <ProfileForm
            profile={profile}
            onChange={updateProfile}
            onSave={saveProfile}
            isSaving={saving}
          />
        </div>

        {/* Order History - 1/3 width */}
        <div>
          <OrderHistory orders={orders} onViewOrder={handleViewOrder} />
        </div>
      </div>
    </div>
  );
};
