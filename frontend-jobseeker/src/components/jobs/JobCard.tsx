import type { Job, Skill } from '../../types/job';

interface JobCardProps {
  job: Job;
  isApplied?: boolean;
  onClick: () => void;
  onToggleSave: (jobId: string, e: React.MouseEvent) => void;
  savePendingId: string | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: 'Full-time',
  PARTTIME: 'Part-time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const LEVEL_COLORS: Record<string, string> = {
  INTERN: '#7C3AED',
  FRESHER: '#059669',
  JUNIOR: '#0891B2',
  MIDDLE: '#1D4ED8',
  SENIOR: '#B45309',
  LEADER: '#DC2626',
};
const LEVEL_BG: Record<string, string> = {
  INTERN: '#EDE9FE',
  FRESHER: '#D1FAE5',
  JUNIOR: '#E0F2FE',
  MIDDLE: '#DBEAFE',
  SENIOR: '#FEF3C7',
  LEADER: '#FEE2E2',
};

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return 'Negotiable';
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max!.toLocaleString()}`;
}

export default function JobCard({ job, isApplied, onClick, onToggleSave, savePendingId }: JobCardProps) {
  const initial = job.companyName
    ? job.companyName.charAt(0).toUpperCase()
    : job.title.charAt(0).toUpperCase();

  const isPending = savePendingId === job.id;

  return (
    <article
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8ECF2',
        borderRadius: 20,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.01)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
      className="job-card"
    >
      {/* Top gradient accent */}
      <div className="card-top-accent" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, #1E40AF, #2563EB, #06B6D4)',
        opacity: 0,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Header: Logo + Title block + Save */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
        {/* Company Logo */}
        <div
          className="card-logo"
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.35rem',
            background: 'linear-gradient(145deg, #EFF6FF, #E0E7FF)',
            color: '#2563EB',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(37, 99, 235, 0.1)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          }}
        >
          {initial}
        </div>

        {/* Title + Company */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1.4,
            margin: '0 0 5px',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {job.title}
          </h3>
          <div style={{
            fontSize: '0.88rem',
            color: '#64748B',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {job.companyName || 'Company'}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={e => onToggleSave(job.id, e)}
          disabled={isPending}
          title={job.isSaved ? 'Remove from saved' : 'Save job'}
          className="card-save-btn"
          style={{
            padding: 10,
            borderRadius: 12,
            background: job.isSaved ? 'rgba(251, 191, 36, 0.12)' : '#F8FAFC',
            border: job.isSaved ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid #E2E7F0',
            cursor: 'pointer',
            color: job.isSaved ? '#F59E0B' : '#94A3B8',
            transition: 'all 0.2s ease',
            opacity: isPending ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <i className={`${job.isSaved ? 'fas' : 'far'} fa-bookmark`} style={{ fontSize: '1rem' }} />
        </button>

        {/* Applied Badge */}
        {isApplied && (
          <div
            title="Already applied"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              background: '#D1FAE5',
              border: '1px solid #A7F3D0',
              color: '#059669',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.15)',
            }}
          >
            <i className="fas fa-check" style={{ fontSize: '0.75rem' }} />
          </div>
        )}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {job.location && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: '#F8FAFC',
            border: '1px solid #E2E7F0',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: 500,
          }}>
            <i className="fas fa-location-dot" style={{ color: '#2563EB', fontSize: '0.7rem' }} />
            {job.location}
          </span>
        )}
        {job.jobType && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#15803D',
            fontWeight: 500,
          }}>
            <i className="fas fa-clock" style={{ fontSize: '0.7rem' }} />
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
        )}
        {job.experienceLevels?.map((level) => (
          <span
            key={level}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: LEVEL_BG[level] ?? '#F1F5F9',
              border: `1px solid ${(LEVEL_COLORS[level] ?? '#64748B')}22`,
              borderRadius: 8,
              fontSize: '0.8rem',
              color: LEVEL_COLORS[level] ?? '#64748B',
              fontWeight: 600,
            }}
          >
            <i className="fas fa-signal" style={{ fontSize: '0.7rem' }} />
            {level.charAt(0) + level.slice(1).toLowerCase()}
          </span>
        ))}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {job.skills.slice(0, 3).map((skill: Skill) => (
            <span
              key={skill.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 11px',
                borderRadius: 50,
                fontSize: '0.78rem',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
                color: '#4F46E5',
                border: '1px solid #E0E7FF',
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
              background: '#F1F5F9',
              color: '#64748B',
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
        paddingTop: 18,
        borderTop: '1px solid #F1F5F9',
        gap: 12,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Salary
          </p>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2563EB' }}>
            {formatSalary(job.salaryMin, job.salaryMax)}
          </span>
        </div>
        <span
          className="card-view-btn"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            letterSpacing: '0.01em',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          View Details
          <i className="fas fa-arrow-right" style={{ marginLeft: 7, fontSize: '0.72rem' }} />
        </span>
      </div>

      <style>{`
        .job-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(37,99,235,0.08);
          border-color: #BFDBFE;
        }
        .job-card:hover .card-top-accent {
          opacity: 1 !important;
        }
        .job-card:hover .card-logo {
          transform: scale(1.06);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
        }
        .job-card:hover .card-save-btn {
          background: rgba(251, 191, 36, 0.15) !important;
          color: #F59E0B !important;
          border-color: rgba(251, 191, 36, 0.3) !important;
          transform: scale(1.08);
        }
        .job-card:hover .card-view-btn {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }
        .card-save-btn:hover {
          background: rgba(251, 191, 36, 0.12) !important;
          color: #F59E0B !important;
          border-color: rgba(251, 191, 36, 0.25) !important;
          transform: scale(1.08);
        }
      `}</style>
    </article>
  );
}
