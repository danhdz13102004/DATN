interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'indigo' | 'sky' | 'amber' | 'rose';
  change?: string;
  changeType?: 'positive' | 'negative';
  helperText?: string;
}

const COLOR_MAP: Record<string, { background: string; color: string; iconBg: string; border: string }> = {
  green:  { background: '#F0FDF4', color: '#16A34A', iconBg: '#DCFCE7', border: '#BBF7D0' },
  blue:   { background: '#EFF6FF', color: '#2563EB', iconBg: '#DBEAFE', border: '#BFDBFE' },
  orange: { background: '#FFF7ED', color: '#EA580C', iconBg: '#FFEDD5', border: '#FED7AA' },
  red:    { background: '#FEF2F2', color: '#DC2626', iconBg: '#FEE2E2', border: '#FECACA' },
  purple: { background: '#FAF5FF', color: '#9333EA', iconBg: '#EDE9FE', border: '#DDD6FE' },
  indigo: { background: '#EEF2FF', color: '#4F46E5', iconBg: '#E0E7FF', border: '#C7D2FE' },
  sky:    { background: '#F0F9FF', color: '#0284C7', iconBg: '#E0F2FE', border: '#BAE6FD' },
  amber:  { background: '#FFFBEB', color: '#D97706', iconBg: '#FEF3C7', border: '#FDE68A' },
  rose:   { background: '#FFF1F2', color: '#E11D48', iconBg: '#FFE4E6', border: '#FECDD3' },
};

export default function StatCard({ label, value, icon, color, change, changeType, helperText }: StatCardProps) {
  void change; void changeType; void helperText;
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 cursor-default transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Icon container */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: c.iconBg, color: c.color }}
      >
        <i className={`fas ${icon}`} style={{ fontSize: '1rem' }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <div style={{ height: 12 }}></div>
      
      </div>

      {/* Decorative ambient glow */}
      <div
        className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full opacity-50 blur-xl pointer-events-none transition-opacity duration-200 group-hover:opacity-70"
        style={{ background: c.iconBg }}
      />
    </div>
  );
}
