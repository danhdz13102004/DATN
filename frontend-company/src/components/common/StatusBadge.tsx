
import { STATUS_COLORS, STATUS_LABELS } from '../../constants';

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showRing?: boolean;
  showDot?: boolean;
}

export default function StatusBadge({
  status,
  size = 'md',
  className = '',
  showRing = false,
  showDot = true,
}: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] || status;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${colorClass}
        ${showRing ? 'ring-1 ring-current/10' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      )}
      {label}
    </span>
  );
}
