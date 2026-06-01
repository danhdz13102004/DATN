interface MatchScoreBadgeProps {
  score: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
}

export default function MatchScoreBadge({ score, size = 'md' }: MatchScoreBadgeProps) {
  const percent = Math.round(score * 100);
  const isHigh = percent >= 75;
  const isMedium = percent >= 50 && percent < 75;

  const gradient = isHigh
    ? 'linear-gradient(135deg, #059669, #10B981)'
    : isMedium
    ? 'linear-gradient(135deg, #1E40AF, #2563EB)'
    : 'linear-gradient(135deg, #9A3412, #EA580C)';

  const sizeStyles = {
    sm: { padding: '4px 10px', fontSize: '0.72rem', gap: 4 },
    md: { padding: '6px 14px', fontSize: '0.82rem', gap: 6 },
    lg: { padding: '8px 18px', fontSize: '0.9rem', gap: 8 },
  };
  const s = sizeStyles[size];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        borderRadius: 10,
        fontSize: s.fontSize,
        fontWeight: 700,
        background: gradient,
        color: '#FFFFFF',
        boxShadow: isHigh
          ? '0 4px 12px rgba(16, 185, 129, 0.35)'
          : isMedium
          ? '0 4px 12px rgba(37, 99, 235, 0.35)'
          : '0 4px 12px rgba(234, 88, 12, 0.35)',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <i className="fas fa-bolt" style={{ fontSize: `calc(${s.fontSize} * 0.9)` }} />
      {percent}% match
    </div>
  );
}
