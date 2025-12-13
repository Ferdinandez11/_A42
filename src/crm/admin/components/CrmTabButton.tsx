// CrmTabButton.tsx
// ✅ Componente extraído de CrmDashboard
import React from 'react';

interface CrmTabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'success';
}

export const CrmTabButton: React.FC<CrmTabButtonProps> = ({
  active,
  onClick,
  children,
  variant = 'default',
}) => (
  <button
    onClick={onClick}
    className={`
      px-5 py-2.5 rounded-lg font-bold transition-colors
      ${
        active
          ? 'bg-orange-500 text-white'
          : variant === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
      }
    `}
  >
    {children}
  </button>
);

