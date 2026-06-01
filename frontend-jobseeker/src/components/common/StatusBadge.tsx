interface StatusBadgeProps {
  value: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  // Application statuses
  APPLIED:    { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6', border: '#BFDBFE' },
  SCREENING:  { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', border: '#FDE68A' },
  INTERVIEW:  { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6', border: '#DDD6FE' },
  OFFER:      { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', border: '#A7F3D0' },
  REJECTED:   { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', border: '#FECACA' },
  HIRED:      { bg: '#F0FDF4', text: '#166534', dot: '#22C55E', border: '#BBF7D0' },
  WITHDRAWN:  { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF', border: '#E5E7EB' },
  // Interview statuses
  PENDING:    { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', border: '#FDE68A' },
  COMPLETED:  { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', border: '#A7F3D0' },
  CANCELLED:  { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', border: '#FECACA' },
  // Meeting types
  ONLINE:     { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6', border: '#BFDBFE' },
  OFFLINE:    { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6', border: '#DDD6FE' },
  HYBRID:     { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', border: '#FDE68A' },
  // Job types
  FULLTIME:   { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', border: '#A7F3D0' },
  PARTTIME:   { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6', border: '#DDD6FE' },
  REMOTE:     { bg: '#F0F9FF', text: '#075985', dot: '#0EA5E9', border: '#BAE6FD' },
  INTERN:     { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF', border: '#E5E7EB' },
  FRESHER:    { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF', border: '#E5E7EB' },
  JUNIOR:     { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6', border: '#BFDBFE' },
  MIDDLE:     { bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6', border: '#DDD6FE' },
  SENIOR:     { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', border: '#FDE68A' },
  LEADER:     { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', border: '#A7F3D0' },
};

export default function StatusBadge({ value, dot = false, size = 'md', className = '' }: StatusBadgeProps) {
  const s = STATUS_STYLES[value] || { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', border: '#E5E7EB' };
  const display = value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold border ${padding} ${className}`}
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
        lineHeight: 1,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: s.dot }}
        />
      )}
      {display}
    </span>
  );
}
