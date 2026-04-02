import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import ScoreBar from '../../components/common/ScoreBar';
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-text-muted hover:text-text flex items-center gap-2 transition-colors">
        <i className="fas fa-arrow-left"></i> Back to Applications
      </button>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="text-lg font-bold text-text mb-6">Application Progress</h3>
        {isRejected || isWithdrawn ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50">
            <i className={`fas ${isWithdrawn ? 'fa-undo' : 'fa-times-circle'} text-red-500`}></i>
            <span className="text-sm font-semibold text-red-700">Application {isWithdrawn ? 'Withdrawn' : 'Rejected'}</span>
          </div>
        ) : (
          <div className="flex items-center">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= currentStep ? 'bg-primary text-white' : 'bg-gray-100 text-text-light'
                  }`}>
                    {i <= currentStep ? <i className="fas fa-check text-[10px]"></i> : i + 1}
                  </div>
                  <span className={`text-[11px] font-medium mt-1.5 ${i <= currentStep ? 'text-primary' : 'text-text-light'}`}>
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < currentStep ? 'bg-primary' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Info */}
        <div className="bg-white rounded-2xl border border-border p-6">
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
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border mt-3">
                {detail.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-surface rounded-lg text-xs font-medium text-text-muted">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Score + Interview */}
        <div className="space-y-4">
          {detail.aiScore != null && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">AI Match Score</h3>
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-primary">{Math.round(detail.aiScore)}%</span>
              </div>
              <ScoreBar score={Math.round(detail.aiScore)} />
            </div>
          )}

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
          <h3 className="text-lg font-bold text-text mb-4">Application History</h3>
          <div className="space-y-4">
            {detail.history.map((entry, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-primary rounded-full shrink-0 mt-1"></div>
                  {i < detail.history.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1"></div>}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-text">{entry.event}</p>
                  <p className="text-xs text-text-muted">{entry.details}</p>
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
