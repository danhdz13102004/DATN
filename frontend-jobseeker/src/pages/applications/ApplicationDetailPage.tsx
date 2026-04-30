import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { applicationService } from '../../services/applicationService';
import type { ApplicationDetail } from '../../types/application';

const TIMELINE_STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

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
  if (!detail) return <div className="text-center py-16 text-text-muted">Application not found</div>;

  const currentStep = TIMELINE_STEPS.indexOf(detail.status);
  const isRejected = detail.status === 'REJECTED';
  const isWithdrawn = detail.status === 'WITHDRAWN';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const statusLabel = detail.status.replace(/_/g, ' ');
  const statusTone = isRejected || isWithdrawn
    ? 'bg-red-50 text-red-700 border-red-100'
    : detail.status === 'OFFER'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : detail.status === 'INTERVIEW'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-primary/10 text-primary border-primary/10';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted hover:text-text flex items-center gap-2 transition-colors">
        <i className="fas fa-arrow-left"></i> Back to Applications
      </button>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl font-bold shrink-0">
              {detail.companyInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-light mb-1">Application Details</p>
              <h1 className="text-2xl md:text-3xl font-bold text-text truncate">{detail.jobTitle}</h1>
              <p className="text-sm text-text-muted mt-1">{detail.companyName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${statusTone}`}>
                  {statusLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-xs font-medium text-text-muted border border-border">
                  <i className="fas fa-calendar-alt text-[10px]"></i>
                  Applied {formatDate(detail.appliedAt)}
                </span>
                {detail.jobType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-xs font-medium text-text-muted border border-border">
                    <i className="fas fa-briefcase text-[10px]"></i>
                    {detail.jobType}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[360px]">
            <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-text-light font-semibold">Status</div>
              <div className="mt-1 text-sm font-semibold text-text">{statusLabel}</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-text-light font-semibold">Applied</div>
              <div className="mt-1 text-sm font-semibold text-text">{formatDate(detail.appliedAt)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-text-light font-semibold">Time</div>
              <div className="mt-1 text-sm font-semibold text-text">{formatTime(detail.appliedAt)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-text-light font-semibold">Skills</div>
              <div className="mt-1 text-sm font-semibold text-text">{detail.skills?.length ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-text">Application Progress</h3>
            <p className="text-sm text-text-muted mt-1">Track where your application is in the hiring process.</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${statusTone}`}>
            {statusLabel}
          </span>
        </div>
        {isRejected || isWithdrawn ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <i className={`fas ${isWithdrawn ? 'fa-undo' : 'fa-times-circle'} text-red-500`}></i>
            <div>
              <p className="text-sm font-semibold text-red-700">Application {isWithdrawn ? 'Withdrawn' : 'Rejected'}</p>
              <p className="text-xs text-red-600 mt-0.5">This application is no longer active.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-4 bg-surface/30">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= currentStep ? 'bg-primary text-white' : 'bg-gray-100 text-text-light'
                  }`}>
                    {i <= currentStep ? <i className="fas fa-check text-[10px]"></i> : i + 1}
                  </div>
                  <span className={`text-[11px] font-medium mt-1.5 ${i <= currentStep ? 'text-primary' : 'text-text-light'}`}>
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-transparent'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Job Info */}
        <div className="bg-white rounded-2xl border border-border p-6 lg:col-span-3">
          <h3 className="text-lg font-bold text-text mb-4">Job Information</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-sm font-bold text-primary shrink-0">{detail.companyInitial}</div>
              <div>
                <p className="text-base font-bold text-text">{detail.jobTitle}</p>
                <p className="text-sm text-text-muted">{detail.companyName}</p>
              </div>
            </div>
            {detail.location && <p className="text-sm text-text-muted flex items-center gap-2"><i className="fas fa-map-marker-alt w-4"></i> {detail.location}</p>}
            {detail.jobType && <p className="text-sm text-text-muted flex items-center gap-2"><i className="fas fa-briefcase w-4"></i> <Badge value={detail.jobType} /></p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {detail.experienceLevels?.map(l => <Badge key={l} value={l} />)}
            </div>
            {detail.skills && detail.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border mt-3">
                {detail.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-surface rounded-lg text-xs font-medium text-text-muted">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary + Interview */}
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="text-lg font-bold text-text mb-4">Application Snapshot</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">Status</span>
                <Badge value={detail.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">Applied date</span>
                <span className="text-sm font-semibold text-text text-right">{formatDate(detail.appliedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">Applied time</span>
                <span className="text-sm font-semibold text-text text-right">{formatTime(detail.appliedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">Resume</span>
                <span className="text-sm font-semibold text-text text-right">{detail.resumeLabel || 'Attached'}</span>
              </div>
              {detail.coverLetter && (
                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-text-muted mb-2">Cover letter</p>
                  <p className="text-sm text-text leading-6 whitespace-pre-wrap">{detail.coverLetter}</p>
                </div>
              )}
            </div>
          </div>

          {detail.interviewId && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">Interview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Status</span>
                  <Badge value={detail.interviewStatus!} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Date</span>
                  <span className="text-sm font-semibold text-text">{formatDate(detail.interviewScheduledTime!)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Time</span>
                  <span className="text-sm font-semibold text-text">{formatTime(detail.interviewScheduledTime!)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Type</span>
                  <Badge value={detail.interviewMeetingType!} />
                </div>
                {detail.interviewMeetingLink && (
                  <a href={detail.interviewMeetingLink} target="_blank" rel="noreferrer"
                    className="block text-center py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors mt-2">
                    <i className="fas fa-video mr-2"></i> Join Meeting
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {detail.history && detail.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-text">Application History</h3>
              <p className="text-sm text-text-muted mt-1">A compact log of what happened on this application.</p>
            </div>
            <span className="text-xs font-medium text-text-light">{detail.history.length} event{detail.history.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-4 relative">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
            {detail.history.map((entry, i) => (
              <div key={i} className="flex gap-4 relative pl-2">
                <div className="w-3 h-3 bg-primary rounded-full shrink-0 mt-1 relative z-10"></div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-text">{entry.event}</p>
                  <p className="text-xs text-text-muted mt-0.5">{entry.details}</p>
                  <p className="text-xs text-text-light mt-1">{formatDate(entry.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
