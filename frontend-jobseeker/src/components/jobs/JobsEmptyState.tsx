interface JobsEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function JobsEmptyState({ icon = 'fa-briefcase', title, description, action }: JobsEmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
    }}>
      {/* Illustration */}
      <div style={{
        width: 100,
        height: 100,
        borderRadius: 28,
        background: 'linear-gradient(135deg, #EFF6FF, #E0E7FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.12)',
      }}>
        <i className={`fas ${icon}`} style={{ fontSize: '2.2rem', color: '#2563EB' }} />
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 28,
          border: '2px dashed rgba(37, 99, 235, 0.2)',
          pointerEvents: 'none',
        }} />
      </div>

      <h3 style={{
        fontSize: '1.15rem',
        fontWeight: 700,
        color: '#0F172A',
        margin: '0 0 10px',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          fontSize: '0.9rem',
          color: '#64748B',
          margin: '0 0 28px',
          maxWidth: 380,
          lineHeight: 1.6,
        }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
            color: '#FFFFFF',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
          }}
        >
          <i className="fas fa-arrow-rotate-left" style={{ fontSize: '0.8rem' }} />
          {action.label}
        </button>
      )}
    </div>
  );
}

export function RecommendedEmptyState({
  description = 'Select a resume or update your profile to improve recommendations.',
}: {
  description?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 100,
        height: 100,
        borderRadius: 28,
        background: 'linear-gradient(135deg, #EDE9FE, #E0E7FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.12)',
      }}>
        <i className="fas fa-wand-magic-sparkles" style={{ fontSize: '2.2rem', color: '#7C3AED' }} />
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 28,
          border: '2px dashed rgba(139, 92, 246, 0.2)',
          pointerEvents: 'none',
        }} />
      </div>

      <h3 style={{
        fontSize: '1.15rem',
        fontWeight: 700,
        color: '#0F172A',
        margin: '0 0 10px',
        letterSpacing: '-0.01em',
      }}>
        No recommendations yet
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: '#64748B',
        margin: 0,
        maxWidth: 380,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}
