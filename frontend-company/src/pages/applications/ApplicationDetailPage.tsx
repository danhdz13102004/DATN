import { useState } from 'react';
import { Link, useParams, useOutletContext, useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useApplicationDetail, useUpdateApplicationStatus } from '../../hooks/useApplications';
import { chatService } from '../../services/chatService';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';
import type { ApplicationStatus, AiMatchingResult } from '../../types/application';

const STATUS_FLOW: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

/** Derive initials from a name or email */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(/[\s@]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Map timeline event type to a dot color */
function timelineColor(type: string): string {
  switch (type) {
    case 'APPLICATION_RECEIVED': return 'bg-blue-400';
    case 'AI_SCORE':             return 'bg-purple-400';
    case 'STATUS_CHANGE':        return 'bg-emerald-400';
    default:                     return 'bg-gray-300';
  }
}

/** Format ISO timestamp to a readable date */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Detect file type from URL */
function getFileType(url: string): 'pdf' | 'docx' | 'image' | 'other' {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf')) return 'pdf';
  if (lower.includes('.docx') || lower.includes('.doc')) return 'docx';
  if (lower.match(/\.(png|jpg|jpeg|gif|webp)/)) return 'image';
  return 'other';
}

/** Render one scoring row */
function ScoreRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500 capitalize">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Breakdown table from json_matching */
function AiMatchingBreakdown({ matching }: { matching: AiMatchingResult }) {
  const rows: { label: string; value: number | null }[] = [
    { label: 'Skills', value: matching.skills },
    { label: 'Experience', value: matching.experience },
    { label: 'Seniority', value: matching.seniority },
    { label: 'Industry', value: matching.industry },
    { label: 'Nice-to-have Skills', value: matching.nice_to_have_skills },
  ];
  return (
    <div className="border-t border-gray-50 pt-4 space-y-2.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Breakdown</p>
      {rows.map((r) => <ScoreRow key={r.label} label={r.label} value={r.value} />)}
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const { data: app, isLoading } = useApplicationDetail(id || '');
  const updateStatus = useUpdateApplicationStatus();
  const [messagingLoading, setMessagingLoading] = useState(false);

  const handleStartConversation = async () => {
    if (!id) return;
    setMessagingLoading(true);
    try {
      const conv = await chatService.createConversation(id);
      navigate(`/messages/${conv.id}`);
    } catch (e) {
      console.error('Failed to start conversation', e);
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleStatusChange = (status: string) => {
    if (id) updateStatus.mutate({ id, status });
  };

  const handleResumeDownload = () => {
    if (app?.resumeUrl) {
      const a = document.createElement('a');
      a.href = app.resumeUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = '';
      a.click();
    }
  };

  const handleResumePreview = () => {
    if (app?.resumeUrl) {
      window.open(app.resumeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) return (
    <>
      <Topbar title="Application Detail" breadcrumbs={[{ label: 'Applications', to: ROUTES.APPLICATIONS }, { label: 'Loading...' }]} onMenuToggle={onMenuToggle} />
      <div className="p-6 text-center text-gray-400">Loading...</div>
    </>
  );

  if (!app) return (
    <>
      <Topbar title="Not Found" onMenuToggle={onMenuToggle} />
      <div className="p-6 text-center text-gray-400">Application not found</div>
    </>
  );

  const score = Math.round((app.aiScore ?? 0) * 100);
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreBarColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const initials = getInitials(app.candidateName);
  const fileType = app.resumeUrl ? getFileType(app.resumeUrl) : null;

  return (
    <>
      <Topbar
        title="Application Detail"
        breadcrumbs={[{ label: 'Applications', to: ROUTES.APPLICATIONS }, { label: app.candidateName }]}
        onMenuToggle={onMenuToggle}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column ─────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <div className="flex items-start gap-4 mb-4">
                {app.candidateAvatar ? (
                  <img
                    src={`http://127.0.0.1:9000/recruitpro/${app.candidateAvatar}`}
                    alt={app.candidateName}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                    {initials}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{app.candidateName}</h2>
                  <p className="text-sm text-gray-500">{app.candidateEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.candidateLocation ?? 'Location not specified'}
                    {app.candidateExperienceYears != null && ` · ${app.candidateExperienceYears} yr${app.candidateExperienceYears !== 1 ? 's' : ''} experience`}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 border-t border-gray-50 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                <p className="leading-relaxed">{app.candidateBio || 'No bio provided.'}</p>
              </div>
            </div>

            {/* Resume Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Resume</h3>
                {app.resumeUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-preview-resume"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2 transition-colors"
                      onClick={handleResumePreview}
                    >
                      <i className="fas fa-eye" /> Preview
                    </button>
                    <button
                      id="btn-download-resume"
                      className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 flex items-center gap-2 transition-colors"
                      onClick={handleResumeDownload}
                    >
                      <i className="fas fa-download" /> Download
                    </button>
                  </div>
                )}
              </div>

              {app.resumeUrl ? (
                <>
                  {/* PDF inline preview */}
                  {fileType === 'pdf' && (
                    <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 520 }}>
                      <iframe
                        src={app.resumeUrl}
                        className="w-full h-full"
                        title="Resume Preview"
                      />
                    </div>
                  )}

                  {/* DOCX — cannot inline preview, show a card */}
                  {fileType === 'docx' && (
                    <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                      <i className="fas fa-file-word text-4xl text-blue-500" />
                      <p className="text-sm text-gray-600 font-medium">Word Document (.docx)</p>
                      <p className="text-xs text-gray-400">Click <strong>Preview</strong> to open in a new tab or <strong>Download</strong> to save.</p>
                    </div>
                  )}

                  {/* Image resume */}
                  {fileType === 'image' && (
                    <div className="rounded-xl overflow-hidden border border-gray-100">
                      <img src={app.resumeUrl} alt="Resume" className="w-full" />
                    </div>
                  )}

                  {/* Generic fallback */}
                  {fileType === 'other' && (
                    <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                      <i className="fas fa-file text-4xl text-gray-400" />
                      <p className="text-sm text-gray-600">Resume file attached. Use the buttons above to view or download.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
                  No resume attached to this application.
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column ─────────────────────── */}
          <div className="space-y-5">

            {/* Schedule Interview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <Link
                to={`${ROUTES.INTERVIEW_SCHEDULE}?applicationId=${id}`}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 no-underline"
              >
                <i className="fas fa-calendar-plus" />
                {app.hasScheduledInterview ? 'Reschedule Interview' : 'Schedule Interview'}
              </Link>
              {app.hasScheduledInterview && (
                <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                  <i className="fas fa-calendar-check" /> Interview already scheduled
                </p>
              )}
            </div>

            {/* Message Applicant */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
              <button
                id="btn-message-applicant"
                onClick={handleStartConversation}
                disabled={messagingLoading}
                className="w-full px-4 py-2.5 bg-white border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {messagingLoading
                  ? <><i className="fas fa-spinner fa-spin" /> Opening chat…</>
                  : <><i className="fas fa-comment-dots" /> Message Applicant</>}
              </button>
              <p className="mt-2 text-xs text-gray-400 text-center">
                Start a direct conversation with {app.candidateName?.split(' ')[0] ?? 'the applicant'}
              </p>
            </div>

            {/* AI Score */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Match Score</h3>
              {app.aiScore != null ? (
                <>
                  <div className="text-center mb-4">
                    <div className={`text-4xl font-bold ${scoreColor}`}>{score}%</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {score >= 80 ? 'Strong match' : score >= 60 ? 'Good match' : 'Low match'}
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full transition-all ${scoreBarColor}`} style={{ width: `${score}%` }} />
                  </div>
                  {app.jsonMatching && <AiMatchingBreakdown matching={app.jsonMatching} />}
                </>
              ) : (
                <div className="text-center text-gray-400 text-sm py-2">AI score not yet calculated</div>
              )}
            </div>

            {/* Applied For */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Applied For</h3>
              <Link to={`/jobs/${app.jobId}`} className="text-sm text-primary font-medium hover:underline no-underline">
                {app.jobTitle}
              </Link>
              <div className="mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status]}`}>
                  {STATUS_LABELS[app.status]}
                </span>
              </div>
              {app.hasScheduledInterview && (
                <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <i className="fas fa-calendar-check" /> Interview scheduled
                </p>
              )}
            </div>

            {/* Status Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
              <div className="space-y-2">
                {STATUS_FLOW.filter((s) => s !== app.status).map((status) => (
                  <button
                    key={status}
                    id={`btn-status-${status.toLowerCase()}`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors"
                    onClick={() => handleStatusChange(status)}
                    disabled={updateStatus.isPending}
                  >
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]?.split(' ')[0]}`} />
                    Move to {STATUS_LABELS[status]}
                  </button>
                ))}
                {app.status !== 'REJECTED' && (
                  <button
                    id="btn-status-rejected"
                    className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={updateStatus.isPending}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Reject
                  </button>
                )}
              </div>
            </div>

            {/* Timeline
            {app.timeline?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h3>
                <div className="space-y-3">
                  {app.timeline.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${timelineColor(entry.type)}`} />
                      <div>
                        <div className="text-sm text-gray-900">{entry.description}</div>
                        <div className="text-xs text-gray-400">{formatDate(entry.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
          </div>
        </div>
      </div>
    </>
  );
}
