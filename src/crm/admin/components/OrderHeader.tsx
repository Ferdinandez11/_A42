// OrderHeader.tsx
import { useNavigate } from 'react-router-dom';

interface OrderHeaderProps {
  orderRef: string;
}

export const OrderHeader = ({ orderRef }: OrderHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-4">
      <button 
        onClick={() => navigate('/admin/crm')} 
        className="bg-transparent border-none text-gray-500 cursor-pointer hover:text-gray-400 transition-colors"
      >
        ← Volver al Panel
      </button>
      <h2 className="m-0 text-white text-2xl">
        Pedido Ref: <span className="text-blue-500">{orderRef}</span>
      </h2>
    </div>
  );
};