// PriceCell.tsx
// ✅ Componente extraído de CrmDashboard
import React from 'react';

interface PriceCellProps {
  price: number;
  discountRate: number;
}

const formatMoney = (amount: number): string => {
  return (
    amount.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  );
};

const calculatePriceDisplay = (
  finalPrice: number,
  discountRate: number
): { basePrice: number; finalPrice: number; discount: number } => {
  const basePrice =
    discountRate > 0 && finalPrice > 0
      ? finalPrice / (1 - discountRate / 100)
      : finalPrice;

  return {
    basePrice,
    finalPrice,
    discount: discountRate,
  };
};

export const PriceCell: React.FC<PriceCellProps> = ({ price, discountRate }) => {
  const { basePrice, finalPrice, discount } = calculatePriceDisplay(
    price,
    discountRate
  );

  if (discount === 0) {
    return <span className="font-bold">{formatMoney(finalPrice)}</span>;
  }

  return (
    <div className="flex flex-col items-start">
      <span className="line-through text-neutral-600 text-xs">
        Base: {formatMoney(basePrice)}
      </span>
      <span className="text-white font-bold">
        {formatMoney(finalPrice)}
        <span className="text-orange-500 text-xs ml-1">({discount}%)</span>
      </span>
    </div>
  );
};

