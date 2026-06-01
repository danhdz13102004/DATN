
import type { Job } from '../../types/job';

interface JobCardProps {
  job: Job;
  onView?: (jobId: string) => void;
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onPublish?: (jobId: string) => void;
  onClose?: (jobId: string) => void;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: 'Full-time',
  PARTTIME: 'Part-time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

function formatSalary(min: number | null | undefined, max: number | null | undefined) {
  if (!min && !max) return 'Negotiable';
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max!.toLocaleString()}`;
}

const LEVEL_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  INTERN:  { text: '#7C3AED', bg: '#EDE9FE', border: 'rgba(124,58,237,0.15)' },
  FRESHER: { text: '#059669', bg: '#D1FAE5', border: 'rgba(5,150,105,0.15)' },
  JUNIOR:  { text: '#0891B2', bg: '#E0F2FE', border: 'rgba(8,145,178,0.15)' },
  MIDDLE:  { text: '#1D4ED8', bg: '#DBEAFE', border: 'rgba(29,78,216,0.15)' },
  SENIOR:  { text: '#B45309', bg: '#FEF3C7', border: 'rgba(180,83,9,0.15)' },
  LEADER:  { text: '#DC2626', bg: '#FEE2E2', border: 'rgba(220,38,38,0.15)' },
};

export default function JobCard({
  job,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
}: JobCardProps) {
  const primaryLevel = job.experienceLevels?.[0] ?? '';
  const levelStyle = primaryLevel ? (LEVEL_COLORS[primaryLevel] ?? LEVEL_COLORS['MIDDLE']) : null;

  // Company logo: show first letter of company name or job title
  const companyInitial = 'C';

  return (
    <article
      className="job-card group relative flex flex-col bg-white border border-gray-100 rounded-2xl p-6 cursor-pointer"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.01)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
      onClick={() => onView?.(job.id)}
    >
      {/* Top gradient accent bar — always visible */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{
          background: 'linear-gradient(90deg, #0eb02b 0%, #11d134 40%, #4ae564 100%)',
          boxShadow: '0 0 16px rgba(17, 209, 52, 0.3)',
        }}
      />

      {/* Header: Logo + Title + Actions */}
      <div className="flex items-start gap-4 mb-5">
        {/* Company Logo */}
        <div
          className="card-logo"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.25rem',
            background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)',
            color: '#15803d',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(17, 209, 52, 0.15)',
            border: '1px solid rgba(17, 209, 52, 0.1)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          }}
        >
          {companyInitial}
        </div>

        {/* Title + Company */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.4,
              margin: 0,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {job.title}
          </h3>
        </div>

        {/* Inline action buttons (appear on hover) */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              className="action-btn-edit"
              onClick={(e) => { e.stopPropagation(); onEdit(job.id); }}
              title="Edit"
              style={{
                padding: 8,
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e7f0',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#eff6ff';
                el.style.color = '#2563eb';
                el.style.borderColor = '#bfdbfe';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#f8fafc';
                el.style.color = '#94a3b8';
                el.style.borderColor = '#e2e7f0';
              }}
            >
              <i className="fas fa-pen" style={{ fontSize: '0.8rem' }} />
            </button>
          )}
          {job.status === 'PUBLISHED' && onClose && (
            <button
              className="action-btn-close"
              onClick={(e) => { e.stopPropagation(); onClose(job.id); }}
              title="Close Job"
              style={{
                padding: 8,
                borderRadius: 10,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                cursor: 'pointer',
                color: '#f59e0b',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#fef3c7';
                el.style.color = '#d97706';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#fffbeb';
                el.style.color = '#f59e0b';
              }}
            >
              <i className="fas fa-times-circle" style={{ fontSize: '0.8rem' }} />
            </button>
          )}
          {job.status === 'DRAFT' && onPublish && (
            <button
              className="action-btn-publish"
              onClick={(e) => { e.stopPropagation(); onPublish(job.id); }}
              title="Publish"
              style={{
                padding: 8,
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                cursor: 'pointer',
                color: '#22c55e',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#dcfce7';
                el.style.color = '#15803d';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#f0fdf4';
                el.style.color = '#22c55e';
              }}
            >
              <i className="fas fa-rocket" style={{ fontSize: '0.8rem' }} />
            </button>
          )}
          {onDelete && (
            <button
              className="action-btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
              title="Delete"
              style={{
                padding: 8,
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                cursor: 'pointer',
                color: '#fca5a5',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#fee2e2';
                el.style.color = '#ef4444';
                el.style.borderColor = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = '#fef2f2';
                el.style.color = '#fca5a5';
                el.style.borderColor = '#fecaca';
              }}
            >
              <i className="fas fa-trash" style={{ fontSize: '0.8rem' }} />
            </button>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        {job.status === 'PUBLISHED' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Published
          </span>
        )}
        {job.status === 'DRAFT' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        )}
        {job.status === 'CLOSED' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 ring-1 ring-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Closed
          </span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.location && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: '#f8fafc',
            border: '1px solid #e2e7f0',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: 500,
          }}>
            <i className="fas fa-location-dot" style={{ color: '#11d134', fontSize: '0.7rem' }} />
            {job.location}
          </span>
        )}
        {job.jobType && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#15803d',
            fontWeight: 500,
          }}>
            <i className="fas fa-clock" style={{ fontSize: '0.7rem' }} />
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
        )}
        {primaryLevel && levelStyle && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: levelStyle.bg,
            border: `1px solid ${levelStyle.border}`,
            borderRadius: 8,
            fontSize: '0.8rem',
            color: levelStyle.text,
            fontWeight: 600,
          }}>
            <i className="fas fa-signal" style={{ fontSize: '0.7rem' }} />
            {primaryLevel.charAt(0) + primaryLevel.slice(1).toLowerCase()}
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {job.skills.slice(0, 3).map((skill) => (
            <span
              key={skill.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 11px',
                borderRadius: 50,
                fontSize: '0.78rem',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                letterSpacing: '0.01em',
              }}
            >
              {skill.name}
            </span>
          ))}
          {job.skills.length > 3 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 11px',
              borderRadius: 50,
              fontSize: '0.78rem',
              fontWeight: 500,
              background: '#f1f5f9',
              color: '#64748b',
            }}>
              +{job.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: salary + CTA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '1px solid #f1f5f9',
        gap: 12,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Salary
          </p>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#11d134' }}>
            {formatSalary(job.salaryMin, job.salaryMax)}
          </span>
        </div>
        <span
          className="card-view-btn"
          style={{
            padding: '9px 18px',
            background: '#11d134',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(17, 209, 52, 0.3)',
            letterSpacing: '0.01em',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={(e) => { e.stopPropagation(); onView?.(job.id); }}
        >
          View Details
          <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
        </span>
      </div>

      {/* Inline styles for hover effects */}
      <style>{`
        .job-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(17,209,52,0.12);
          border-color: #bbf7d0;
        }
        .job-card:hover .card-logo {
          transform: scale(1.06);
          box-shadow: 0 8px 20px rgba(17, 209, 52, 0.3);
        }
        .job-card:hover .card-view-btn {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(17, 209, 52, 0.4);
        }
        .action-btn-edit:hover,
        .action-btn-close:hover,
        .action-btn-publish:hover,
        .action-btn-delete:hover {
          transform: scale(1.08);
        }
      `}</style>
    </article>
  );
}
