

interface SkillTagProps {
  name: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export default function SkillTag({
  name,
  variant = 'primary',
  size = 'md',
  removable = false,
  onRemove,
  className = '',
}: SkillTagProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
  };

  const variantClasses = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-gray-100 text-gray-600',
    outline: 'bg-white border border-primary/30 text-primary',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:text-red-500 transition-colors"
        >
          <i className="fas fa-times text-[8px]" />
        </button>
      )}
    </span>
  );
}
