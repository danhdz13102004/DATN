const STATUS_COLORS: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700',
  SCREENING: 'bg-yellow-100 text-yellow-700',
  INTERVIEW: 'bg-purple-100 text-purple-700',
  OFFER: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  HIRED: 'bg-green-100 text-green-800',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  ONLINE: 'bg-blue-100 text-blue-700',
  OFFLINE: 'bg-orange-100 text-orange-700',
  FULLTIME: 'bg-emerald-100 text-emerald-700',
  PARTTIME: 'bg-purple-100 text-purple-700',
  REMOTE: 'bg-blue-100 text-blue-700',
  HYBRID: 'bg-orange-100 text-orange-700',
};

interface BadgeProps {
  value: string;
  className?: string;
}

export default function Badge({ value, className = '' }: BadgeProps) {
  const colorClass = STATUS_COLORS[value] || 'bg-gray-100 text-gray-600';
  const display = value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${colorClass} ${className}`}>
      {display}
    </span>
  );
}
