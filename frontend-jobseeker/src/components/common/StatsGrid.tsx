interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'indigo';
  change?: string;
  changeType?: 'positive' | 'negative';
}

interface StatsGridProps {
  stats: StatCard[];
}

// Match design color map exactly
const COLOR_MAP: Record<string, { background: string; color: string }> = {
  green:  { background: 'rgba(66,135,245,0.08)',  color: '#2b6de0' },
  blue:   { background: 'rgba(59,130,246,0.08)',  color: '#3b82f6' },
  orange: { background: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },
  red:    { background: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
  purple: { background: 'rgba(139,92,246,0.08)',  color: '#8b5cf6' },
  indigo: { background: 'rgba(99,102,241,0.08)',  color: '#6366f1' },
};

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
      gap: '20px',
      marginBottom: '28px',
    }}>
      {stats.map((stat, i) => {
        const c = COLOR_MAP[stat.color] || COLOR_MAP.blue;
        return (
          <div
            key={i}
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Icon box — 48px as per design */}
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '10px',
              background: c.background,
              color: c.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0,
            }}>
              <i className={`fas ${stat.icon}`} />
            </div>

            {/* Info */}
            <div>
              <h4 style={{
                fontSize: '0.8rem', fontWeight: 500,
                color: '#8b92a8',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: '4px',
              }}>
                {stat.label}
              </h4>
              <div style={{
                fontSize: '1.75rem', fontWeight: 700,
                letterSpacing: '-0.03em', lineHeight: 1.2,
                color: '#1a1d26',
              }}>
                {stat.value}
              </div>
              {stat.change && (
                <div style={{
                  fontSize: '0.8rem', marginTop: '4px', fontWeight: 500,
                  color: stat.changeType === 'negative' ? '#ef4444' : '#2b6de0',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <i className={`fas ${stat.changeType === 'negative' ? 'fa-arrow-down' : 'fa-arrow-up'}`}
                    style={{ fontSize: '10px' }}
                  />
                  {stat.change}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { StatCard };
