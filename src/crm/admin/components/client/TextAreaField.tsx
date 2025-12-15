// ============================================================================
// TEXTAREA FIELD - Reusable textarea component
// ============================================================================

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  required = false,
}) => (
  <div>
    <label className="block text-neutral-400 mb-2 text-sm font-medium">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      required={required}
      className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

