export function JobCardSkeleton() {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8ECF2',
      borderRadius: 20,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Header: logo + title */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
        <div className="skeleton" style={{ width: 58, height: 58, borderRadius: 16, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 18, borderRadius: 8, marginBottom: 8, width: '80%' }} />
          <div className="skeleton" style={{ height: 14, borderRadius: 8, width: '50%' }} />
        </div>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0 }} />
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 28, borderRadius: 8, width: 90 }} />
        <div className="skeleton" style={{ height: 28, borderRadius: 8, width: 80 }} />
        <div className="skeleton" style={{ height: 28, borderRadius: 8, width: 70 }} />
      </div>

      {/* Skills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        <div className="skeleton" style={{ height: 26, borderRadius: 50, width: 70 }} />
        <div className="skeleton" style={{ height: 26, borderRadius: 50, width: 60 }} />
        <div className="skeleton" style={{ height: 26, borderRadius: 50, width: 80 }} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 18,
        borderTop: '1px solid #F1F5F9',
      }}>
        <div>
          <div className="skeleton" style={{ height: 12, borderRadius: 6, marginBottom: 6, width: 50 }} />
          <div className="skeleton" style={{ height: 18, borderRadius: 8, width: 110 }} />
        </div>
        <div className="skeleton" style={{ height: 38, borderRadius: 12, width: 120 }} />
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #F1F5F9 25%, #E8ECF2 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function JobsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{
      display: 'grid',
      gap: 20,
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RecommendedGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{
      display: 'grid',
      gap: 20,
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ position: 'relative' }}>
          <JobCardSkeleton />
        </div>
      ))}
    </div>
  );
}
