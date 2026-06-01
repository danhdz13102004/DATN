interface TabItem {
  key: 'all' | 'recommended' | 'saved';
  icon: string;
  label: string;
  count?: number;
}

interface JobTabsProps {
  activeTab: 'all' | 'recommended' | 'saved';
  onTabChange: (tab: 'all' | 'recommended' | 'saved') => void;
  savedCount: number;
  isAuthenticated: boolean;
  jobsCount: number;
  totalJobs: number;
}

export default function JobTabs({
  activeTab,
  onTabChange,
  savedCount,
  isAuthenticated,
  jobsCount,
  totalJobs,
}: JobTabsProps) {
  const tabs: TabItem[] = [
    { key: 'all', icon: 'fa-th-large', label: 'All Jobs' },
    ...(isAuthenticated
      ? [
          { key: 'recommended' as const, icon: 'fa-wand-magic-sparkles', label: 'Recommended' },
          { key: 'saved' as const, icon: 'fa-bookmark', label: 'Saved', count: savedCount },
        ]
      : []),
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
    }}>
      {/* Section title */}
      <div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#0F172A',
          margin: 0,
          lineHeight: 1.3,
        }}>
          Browse Jobs
        </h2>
        {activeTab === 'all' && totalJobs > 0 && (
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: 4 }}>
            Showing <strong style={{ color: '#64748B' }}>{jobsCount}</strong> of{' '}
            <strong style={{ color: '#64748B' }}>{totalJobs.toLocaleString()}</strong> jobs
          </p>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: '#FFFFFF',
        padding: 6,
        borderRadius: '18px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        border: '1px solid #E2E7F0',
      }}>
        {tabs.map(({ key, icon, label, count }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: '14px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                background: isActive
                  ? 'linear-gradient(135deg, #1E40AF, #2563EB)'
                  : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontFamily: 'inherit',
                boxShadow: isActive
                  ? '0 4px 14px rgba(37, 99, 235, 0.35)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
                  (e.currentTarget as HTMLElement).style.color = '#2563EB';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#64748B';
                }
              }}
            >
              <i className={`fas ${icon}`} style={{ fontSize: '0.8rem' }} />
              {label}
              {count !== undefined && count > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: isActive
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(251, 191, 36, 0.15)',
                  color: isActive ? '#FFFFFF' : '#B45309',
                  letterSpacing: 0,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
