// ============================================================================
// DISCOUNT SECTION - Component for discount rate input
// ============================================================================

interface DiscountSectionProps {
  value: number;
  onChange: (value: number) => void;
}

const SECTION_TITLES = {
  DISCOUNT_LABEL: 'Descuento Comercial Fijo (%)',
  DISCOUNT_HELP: 'Este descuento se aplicará automáticamente al calcular presupuestos.',
} as const;

export const DiscountSection: React.FC<DiscountSectionProps> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(newValue);
  };

  return (
    <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500 mb-6">
      <label className="block text-orange-500 font-bold mb-2 text-sm">
        {SECTION_TITLES.DISCOUNT_LABEL}
      </label>
      <input
        type="number"
        value={value || 0}
        onChange={handleChange}
        min="0"
        max="100"
        step="0.1"
        className="bg-neutral-800 border border-orange-500 text-white px-4 py-2 rounded-lg text-xl font-bold w-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <p className="text-neutral-500 text-xs mt-2">{SECTION_TITLES.DISCOUNT_HELP}</p>
    </div>
  );
};
