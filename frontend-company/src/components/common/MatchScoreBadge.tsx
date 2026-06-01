

interface MatchScoreBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export default function MatchScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: MatchScoreBadgeProps) {
  const pct = Math.round(score);

  const getColor = () => {
    if (pct >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-100' };
    if (pct >= 60) return { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', ring: 'ring-amber-100' };
    return { bg: 'bg-red-50', text: 'text-red-500', bar: 'bg-red-500', ring: 'ring-red-100' };
  };

  const colors = getColor();
  const isSm = size === 'sm';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Score badge pill */}
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full font-bold
          ${colors.bg} ${colors.text}
          ${isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}
          ring-1 ${colors.ring}
        `}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
        {pct}%
      </span>

      {/* Progress bar */}
      {showLabel && (
        <div className={`w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden ${isSm ? 'w-10' : 'w-14'}`}>
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
