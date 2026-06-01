interface BrowseJobsHeaderProps {
  totalJobs: number;
}

export default function BrowseJobsHeader({ totalJobs }: BrowseJobsHeaderProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 40%, #0E7490 100%)',
        borderRadius: '28px',
        padding: '40px 44px',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient orbs */}
      <div style={{
        position: 'absolute', top: '-60%', right: '-8%',
        width: '340px', height: '340px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-35%', left: '-4%',
        width: '240px', height: '240px',
        background: 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '20%', right: '30%',
        width: '120px', height: '120px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50px',
          marginBottom: 20,
          backdropFilter: 'blur(8px)',
        }}>
          <i className="fas fa-sparkles" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>
            Job Discovery
          </span>
        </div>

        <h2 style={{
          fontSize: '2.2rem', fontWeight: 800, margin: '0 0 10px 0',
          letterSpacing: '-0.03em', lineHeight: 1.15,
        }}>
          Find Your Dream Job
        </h2>
        <p style={{
          fontSize: '1.05rem', opacity: 0.82, margin: '0 0 28px',
          maxWidth: '560px', fontWeight: 400, lineHeight: 1.6,
        }}>
          Discover roles that match your skills, preferences, and career goals.
        </p>

        {totalJobs > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[
              { icon: 'fa-briefcase', val: totalJobs.toLocaleString(), label: 'Active Jobs' },
              { icon: 'fa-building', val: '100+', label: 'Companies Hiring' },
              { icon: 'fa-globe', val: '10+', label: 'Locations' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 14,
                backdropFilter: 'blur(8px)',
              }}>
                <i className={`fas ${s.icon}`} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{s.val}</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
