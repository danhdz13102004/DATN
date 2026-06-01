import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationService } from '../../services/applicationService';
import type { ApplicationDetail } from '../../types/application';

const TIMELINE_STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

const STEP_ICONS: Record<string, string> = {
  APPLIED: 'fa-paper-plane',
  SCREENING: 'fa-search',
  INTERVIEW: 'fa-comments',
  OFFER: 'fa-handshake',
  HIRED: 'fa-star',
};

function getStatusTone(status: string) {
  switch (status) {
    case 'REJECTED':
    case 'WITHDRAWN':
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', ring: '#EF4444' };
    case 'OFFER':
    case 'HIRED':
      return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', ring: '#10B981' };
    case 'INTERVIEW':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', ring: '#F59E0B' };
    case 'SCREENING':
      return { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE', ring: '#8B5CF6' };
    default:
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', ring: '#3B82F6' };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function InfoRow({ icon, label, value, highlight = false }: {
  icon: string; label: string; value: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: highlight ? '#F0F9FF' : 'transparent',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => { if (!highlight) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
      onMouseLeave={e => { if (!highlight) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: '8px',
        background: highlight ? '#DBEAFE' : '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: highlight ? '#2563EB' : '#64748B',
        fontSize: '0.8rem', flexShrink: 0,
      }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0, fontWeight: 500 }}>{label}</p>
        <p style={{
          fontSize: '0.875rem', fontWeight: 600, color: '#111827',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</p>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    applicationService.getDetail(id)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!detail) return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: '#6B7280' }}>
      <i className="fas fa-search" style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}></i>
      Application not found
    </div>
  );

  const currentStep = TIMELINE_STEPS.indexOf(detail.status);
  const isTerminal = detail.status === 'REJECTED' || detail.status === 'WITHDRAWN';
  const salaryRange = formatSalary(detail.salaryMin, detail.salaryMax);
  const statusTone = getStatusTone(detail.status);
  const statusLabel = detail.status.replace(/_/g, ' ');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '48px' }}>

      {/* Page Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', flexWrap: 'wrap', gap: '12px',
        animation: 'fadeSlideDown 0.4s ease',
      }}>
        <button>
        </button>
        <button
          onClick={() => navigate(`/jobs/${detail.jobId}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: '#FFFFFF',
            border: '1.5px solid #E5E7EB', cursor: 'pointer',
            color: '#374151', fontSize: '0.8rem', fontFamily: 'inherit',
            borderRadius: '8px', fontWeight: 600,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
            (e.currentTarget as HTMLElement).style.color = '#2563EB';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
            (e.currentTarget as HTMLElement).style.color = '#374151';
          }}
        >
          <i className="fas fa-external-link-alt"></i> View Job Posting
        </button>
      </div>

      {/* ─── Hero Header Card ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 60%, #4F46E5 100%)',
        borderRadius: '20px',
        padding: '32px 36px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeSlideUp 0.5s ease',
        boxShadow: '0 8px 32px rgba(37, 99, 235, 0.25)',
      }}>
        {/* Floating decorative circles */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-20px',
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-30px', right: 100,
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }} />
        <div style={{
          position: 'absolute', top: 20, right: 180,
          width: 12, height: 12, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          animation: 'statusPulse 3s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: 24, right: 60,
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(16,185,129,0.4)',
          animation: 'statusPulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: 50, right: 80,
          width: 6, height: 6, borderRadius: '50%',
          background: 'rgba(251,191,36,0.4)',
          animation: 'statusPulse 4s ease-in-out infinite',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          {/* Company Logo */}
          <div style={{
            width: '72px', height: '72px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 800,
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            {detail.companyInitial}
          </div>

          {/* Title + Meta */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{
              fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)',
              margin: '0 0 6px 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="fas fa-sparkles" style={{ fontSize: '0.65rem' }} />
              Application Details
            </p>
            <h1 style={{
              fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF',
              margin: '0 0 6px 0', letterSpacing: '-0.025em', lineHeight: 1.2,
            }}>{detail.jobTitle}</h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 500 }}>
              {detail.companyName}
              {detail.location && (
                <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>
                  {detail.location}
                </span>
              )}
            </p>

            {/* Tags row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem',
                fontWeight: 600, background: statusTone.bg, color: statusTone.text,
                border: `1px solid ${statusTone.border}`,
              }}>
                <i className={`fas ${statusTone.text === '#991B1B' ? 'fa-times-circle' : statusTone.text === '#065F46' ? 'fa-check-circle' : 'fa-circle'}`} style={{ fontSize: '0.65rem' }}></i>
                {statusLabel}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem',
                fontWeight: 600, background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <i className="fas fa-calendar" style={{ fontSize: '0.65rem' }}></i>
                Applied {formatDate(detail.appliedAt)}
              </span>
              {detail.jobType && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem',
                  fontWeight: 600, background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <i className="fas fa-briefcase" style={{ fontSize: '0.65rem' }}></i>
                  {detail.jobType}
                </span>
              )}
              {salaryRange && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem',
                  fontWeight: 600, background: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <i className="fas fa-dollar-sign" style={{ fontSize: '0.65rem' }}></i>
                  {salaryRange}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Horizontal Timeline ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #E5E7EB',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        animation: 'fadeSlideUp 0.5s ease 0.08s both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              <i className="fas fa-route" style={{ marginRight: '8px', color: '#2563EB' }}></i>
              Application Journey
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '3px' }}>
              Track your progress through the hiring pipeline
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem',
            fontWeight: 600, background: statusTone.bg, color: statusTone.text,
            border: `1px solid ${statusTone.border}`,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: statusTone.ring, display: 'inline-block',
              animation: 'pulse 2s infinite',
            }}></span>
            {statusLabel}
          </span>
        </div>

        {isTerminal ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '20px 24px',
            background: detail.status === 'REJECTED' ? '#FEF2F2' : '#F9FAFB',
            border: `1px solid ${detail.status === 'REJECTED' ? '#FECACA' : '#E5E7EB'}`,
            borderRadius: '14px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: detail.status === 'REJECTED' ? '#FEE2E2' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: detail.status === 'REJECTED' ? '#EF4444' : '#9CA3AF',
              fontSize: '1.1rem', flexShrink: 0,
            }}>
              <i className={`fas ${detail.status === 'REJECTED' ? 'fa-times-circle' : 'fa-undo'}`}></i>
            </div>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Application {detail.status === 'REJECTED' ? 'Was Not Selected' : 'Withdrawn'}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '3px' }}>
                {detail.status === 'REJECTED'
                  ? 'The employer has decided not to move forward with your application. Keep applying!'
                  : 'You withdrew this application from consideration.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {TIMELINE_STEPS.map((step, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Connector line */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '22px',
                      left: '50%',
                      width: '100%',
                      height: '3px',
                      background: isDone ? '#2563EB' : '#E5E7EB',
                      zIndex: 0,
                      borderRadius: '2px',
                      transition: 'background 0.4s ease',
                    }} />
                  )}

                  {/* Step circle */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: isDone || isCurrent
                      ? `linear-gradient(135deg, #2563EB, #4F46E5)`
                      : '#FFFFFF',
                    border: isDone || isCurrent ? 'none' : '2px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDone || isCurrent ? '#FFFFFF' : '#D1D5DB',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    zIndex: 1,
                    boxShadow: isCurrent
                      ? '0 0 0 4px rgba(37,99,235,0.15), 0 4px 12px rgba(37,99,235,0.3)'
                      : isDone
                        ? '0 2px 8px rgba(37,99,235,0.25)'
                        : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}>
                    {isDone ? (
                      <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>
                    ) : isCurrent ? (
                      <i className={`fas ${STEP_ICONS[step]}`} style={{ fontSize: '0.8rem' }}></i>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</span>
                    )}
                    {isCurrent && (
                      <span style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: '#10B981',
                        border: '2px solid #FFFFFF',
                        animation: 'pulse 2s infinite',
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <p style={{
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 700 : isDone ? 600 : 500,
                    color: isDone ? '#2563EB' : isCurrent ? '#111827' : '#9CA3AF',
                    marginTop: '10px',
                    textAlign: 'center',
                    transition: 'color 0.3s ease',
                  }}>
                    {step.replace(/_/g, ' ')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Main 3-column Grid ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        animation: 'fadeSlideUp 0.5s ease 0.16s both',
      }}>

        {/* Job Information */}
        <div className="card-lift"
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #DBEAFE, #E0E7FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2563EB', fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
            }}>
              <i className="fas fa-building"></i>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>Job Information</h3>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Details from the posting</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <InfoRow
              icon="fa-briefcase"
              label="Job Title"
              value={detail.jobTitle}
              highlight
            />
            <InfoRow
              icon="fa-building"
              label="Company"
              value={detail.companyName}
            />
            {detail.location && (
              <InfoRow
                icon="fa-map-marker-alt"
                label="Location"
                value={detail.location}
              />
            )}
            {salaryRange && (
              <InfoRow
                icon="fa-dollar-sign"
                label="Salary Range"
                value={
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{salaryRange}</span>
                }
              />
            )}
            {detail.jobType && (
              <InfoRow
                icon="fa-clock"
                label="Job Type"
                value={<Badge value={detail.jobType} />}
              />
            )}
            {detail.experienceLevels && detail.experienceLevels.length > 0 && (
              <InfoRow
                icon="fa-layer-group"
                label="Experience"
                value={
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {detail.experienceLevels.map(l => (
                      <Badge key={l} value={l} />
                    ))}
                  </div>
                }
              />
            )}
          </div>

          {detail.skills && detail.skills.length > 0 && (
            <div style={{
              marginTop: '16px', paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <i className="fas fa-code" style={{ marginRight: '5px' }}></i>Required Skills
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detail.skills.map(s => (
                  <span key={s} style={{
                    padding: '4px 10px', background: '#F1F5F9',
                    color: '#475569', borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 500,
                    border: '1px solid #E2E8F0',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Application Snapshot */}
        <div className="card-lift"
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #D1FAE5, #FEF3C7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#059669', fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(5,150,105,0.15)',
            }}>
              <i className="fas fa-file-alt"></i>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>Your Application</h3>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Submission details</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <InfoRow
              icon="fa-toggle-on"
              label="Status"
              value={<Badge value={detail.status} />}
              highlight
            />
            <InfoRow
              icon="fa-calendar-day"
              label="Applied On"
              value={formatDate(detail.appliedAt)}
            />
            <InfoRow
              icon="fa-clock"
              label="Applied At"
              value={formatTime(detail.appliedAt)}
            />
            <InfoRow
              icon="fa-file-pdf"
              label="Resume"
              value={detail.resumeLabel || 'Attached'}
            />
            <InfoRow
              icon="fa-id-card"
              label="Application ID"
              value={
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748B' }}>
                  #{detail.id.slice(0, 8).toUpperCase()}
                </span>
              }
            />
          </div>

          {detail.coverLetter && (
            <div style={{
              marginTop: '16px', paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <i className="fas fa-envelope" style={{ marginRight: '5px' }}></i>Cover Letter
              </p>
              <div style={{
                padding: '14px 16px', background: '#F8FAFC',
                borderRadius: '10px', border: '1px solid #F1F5F9',
                maxHeight: '180px', overflowY: 'auto',
              }}>
                <p style={{
                  fontSize: '0.82rem', color: '#374151', lineHeight: 1.7,
                  margin: 0, whiteSpace: 'pre-wrap',
                }}>{detail.coverLetter}</p>
              </div>
            </div>
          )}
        </div>

        {/* Interview / Right Column */}
        <div className="card-lift"
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #EDE9FE, #FCE7F3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9333EA', fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(147,51,234,0.15)',
            }}>
              <i className="fas fa-calendar-check"></i>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {detail.interviewId ? 'Interview' : 'Timeline'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>
                {detail.interviewId ? 'Scheduled interview details' : 'Application activity'}
              </p>
            </div>
          </div>

          {detail.interviewId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <InfoRow
                icon="fa-toggle-on"
                label="Interview Status"
                value={<Badge value={detail.interviewStatus!} />}
                highlight
              />
              <InfoRow
                icon="fa-calendar-day"
                label="Date"
                value={formatDate(detail.interviewScheduledTime!)}
              />
              <InfoRow
                icon="fa-clock"
                label="Time"
                value={formatTime(detail.interviewScheduledTime!)}
              />
              <InfoRow
                icon="fa-video"
                label="Format"
                value={<Badge value={detail.interviewMeetingType!} />}
              />
              {detail.interviewNote && (
                <InfoRow
                  icon="fa-sticky-note"
                  label="Note"
                  value={
                    <span style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{detail.interviewNote}</span>
                  }
                />
              )}
              {detail.interviewMeetingLink && (
                <div style={{ marginTop: '12px' }}>
                  <a
                    href={detail.interviewMeetingLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '12px 16px',
                      background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                      color: '#FFFFFF', borderRadius: '12px',
                      fontSize: '0.875rem', fontWeight: 600,
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(37,99,235,0.35)';
                    }}
                  >
                    <i className="fas fa-video"></i>
                    Join Meeting
                    <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '12px', padding: '32px 16px', textAlign: 'center',
              background: '#F8FAFC', borderRadius: '12px',
              border: '1px dashed #E5E7EB',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#DBEAFE', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#2563EB', fontSize: '1.2rem',
              }}>
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                  Waiting for Response
                </p>
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '4px' }}>
                  The employer will review your application and reach out if there's a match.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {TIMELINE_STEPS.map((step, i) => (
                  <div key={step} style={{
                    padding: '3px 8px', borderRadius: '6px',
                    fontSize: '0.7rem', fontWeight: 600,
                    background: i <= currentStep ? '#DBEAFE' : '#F3F4F6',
                    color: i <= currentStep ? '#2563EB' : '#D1D5DB',
                  }}>
                    {step.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Application History ─── */}
      {detail.history && detail.history.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E5E7EB',
          padding: '28px 32px',
          marginTop: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          animation: 'fadeSlideUp 0.5s ease 0.24s both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #EDE9FE, #DBEAFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7C3AED', fontSize: '0.9rem',
            }}>
              <i className="fas fa-history"></i>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Activity Timeline
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
                All updates and events for this application
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', paddingLeft: '28px' }}>
            {/* Vertical connector line */}
            <div style={{
              position: 'absolute', left: '9px', top: '8px', bottom: '8px',
              width: '2px', background: 'linear-gradient(to bottom, #2563EB, #E5E7EB)',
              borderRadius: '1px',
            }} />

            {detail.history.map((item, i) => {
              const isLast = i === detail.history.length - 1;
              const dotColor = isLast ? '#2563EB' : '#A5B4FC';
              return (
                <div key={i} style={{
                  display: 'flex', gap: '16px', marginBottom: isLast ? 0 : '20px',
                  position: 'relative',
                }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: '-24px', top: '10px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: dotColor,
                    border: '3px solid #FFFFFF',
                    boxShadow: isLast ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}>
                    {isLast && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFFFFF' }} />}
                  </div>

                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {item.event}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500, flexShrink: 0 }}>
                        <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>
                        {formatDate(item.date)} at {formatTime(item.date)}
                      </span>
                    </div>
                    {item.details && (
                      <p style={{
                        fontSize: '0.82rem', color: '#6B7280', marginTop: '4px',
                        lineHeight: 1.6,
                      }}>{item.details}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .card-lift {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .card-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
