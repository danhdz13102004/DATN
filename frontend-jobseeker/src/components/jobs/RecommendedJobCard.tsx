import type { Job, Skill } from '../../types/job';
import MatchScoreBadge from './MatchScoreBadge';

interface RecommendedJobCardProps {
  job: Job;
  score: number;
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

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return 'Negotiable';
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max!.toLocaleString()}`;
}

const levelColors: Record<string, string> = {
  INTERN: '#7C3AED', FRESHER: '#059669', JUNIOR: '#0891B2',
  MIDDLE: '#1D4ED8', SENIOR: '#B45309', LEADER: '#DC2626',
};
const levelBg: Record<string, string> = {
  INTERN: '#EDE9FE', FRESHER: '#D1FAE5', JUNIOR: '#E0F2FE',
  MIDDLE: '#DBEAFE', SENIOR: '#FEF3C7', LEADER: '#FEE2E2',
};

export default function RecommendedJobCard({
  job, score, onClick, onToggleSave, savePendingId,
}: RecommendedJobCardProps) {
  const initial = job.companyName
    ? job.companyName.charAt(0).toUpperCase()
    : job.title.charAt(0).toUpperCase();

  const isPending = savePendingId === job.id;
  const level = job.experienceLevels?.[0] ?? '';

  return (
    <div>
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        }}
        className="rec-card"
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #2563EB)',
          opacity: 0, transition: 'opacity 0.3s ease',
        }} className="card-top-accent" />

        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, padding: 1,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          opacity: 0, transition: 'opacity 0.3s ease', pointerEvents: 'none',
        }} className="ai-glow-border" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
          <div
            className="card-logo"
            style={{
              width: 58, height: 58, borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.35rem',
              background: 'linear-gradient(145deg, #EEF2FF, #E0E7FF)',
              color: '#4F46E5', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '1.05rem', fontWeight: 700, color: '#0F172A',
              lineHeight: 1.4, margin: '0 0 5px', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {job.title}
            </h3>
            <div style={{
              fontSize: '0.88rem', color: '#64748B', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.companyName || 'Company'}
            </div>
          </div>

          {/* Right: match score + save */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <MatchScoreBadge score={score} size="sm" />
            <button
              onClick={e => onToggleSave(job.id, e)}
              disabled={isPending}
              title={job.isSaved ? 'Remove from saved' : 'Save job'}
              className="card-save-btn"
              style={{
                padding: 10, borderRadius: 12,
                background: job.isSaved ? 'rgba(251, 191, 36, 0.12)' : '#F8FAFC',
                border: job.isSaved ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid #E2E7F0',
                cursor: 'pointer', color: job.isSaved ? '#F59E0B' : '#94A3B8',
                transition: 'all 0.2s ease', opacity: isPending ? 0.5 : 1,
              }}
            >
              <i className={`${job.isSaved ? 'fas' : 'far'} fa-bookmark`} style={{ fontSize: '1rem' }} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {job.location && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', background: '#F8FAFC',
              border: '1px solid #E2E7F0', borderRadius: 8,
              fontSize: '0.8rem', color: '#475569', fontWeight: 500,
            }}>
              <i className="fas fa-location-dot" style={{ color: '#2563EB', fontSize: '0.7rem' }} />
              {job.location}
            </span>
          )}
          {job.jobType && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', background: '#F0FDF4',
              border: '1px solid #BBF7D0', borderRadius: 8,
              fontSize: '0.8rem', color: '#15803D', fontWeight: 500,
            }}>
              <i className="fas fa-clock" style={{ fontSize: '0.7rem' }} />
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </span>
          )}
          {level && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: levelBg[level] ?? '#F1F5F9',
              border: `1px solid ${(levelColors[level] ?? '#64748B')}22`,
              borderRadius: 8, fontSize: '0.8rem',
              color: levelColors[level] ?? '#64748B', fontWeight: 600,
            }}>
              <i className="fas fa-signal" style={{ fontSize: '0.7rem' }} />
              {level.charAt(0) + level.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {job.skills.slice(0, 3).map((skill: Skill) => (
              <span key={skill.id} style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 11px', borderRadius: 50,
                fontSize: '0.78rem', fontWeight: 500,
                background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
                color: '#6D28D9', border: '1px solid #DDD6FE',
              }}>
                {skill.name}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 11px', borderRadius: 50,
                fontSize: '0.78rem', fontWeight: 500,
                background: '#F1F5F9', color: '#64748B',
              }}>
                +{job.skills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'auto', paddingTop: 18,
          borderTop: '1px solid #F1F5F9', gap: 12,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Salary
            </p>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4F46E5' }}>
              {formatSalary(job.salaryMin, job.salaryMax)}
            </span>
          </div>
          <span className="card-view-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600,
            borderRadius: 12, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
            fontFamily: 'inherit', flexShrink: 0,
          }}>
            View Details
            <i className="fas fa-arrow-right" style={{ fontSize: '0.72rem' }} />
          </span>
        </div>
      </article>

      <style>{`
        .rec-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(99, 102, 241, 0.12), 0 0 0 1px rgba(99,102,241,0.1);
          border-color: #C7D2FE;
        }
        .rec-card:hover .card-top-accent { opacity: 1 !important; }
        .rec-card:hover .ai-glow-border { opacity: 1 !important; }
        .rec-card:hover .card-logo {
          transform: scale(1.06);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
        }
        .rec-card:hover .card-save-btn {
          background: rgba(251, 191, 36, 0.15) !important;
          color: #F59E0B !important;
          border-color: rgba(251, 191, 36, 0.3) !important;
          transform: scale(1.08);
        }
        .rec-card:hover .card-view-btn {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }
        .card-save-btn:hover {
          background: rgba(251, 191, 36, 0.12) !important;
          color: #F59E0B !important;
          border-color: rgba(251, 191, 36, 0.25) !important;
          transform: scale(1.08);
        }
      `}</style>
    </div>
  );
}
