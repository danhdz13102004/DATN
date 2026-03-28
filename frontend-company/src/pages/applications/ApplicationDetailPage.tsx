import { Link, useParams, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useApplicationDetail, useUpdateApplicationStatus } from '../../hooks/useApplications';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';
import type { ApplicationStatus } from '../../types/application';

const STATUS_FLOW: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: app, isLoading } = useApplicationDetail(id || '');
  const updateStatus = useUpdateApplicationStatus();

  const handleStatusChange = (status: string) => {
    if (id) updateStatus.mutate({ id, status });
  };

  const handleResumeDownload = () => {
    if (app?.id) {
      window.open(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080'}/api/v1/company/applications/${app.id}/resume`, '_blank');
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

  const scoreColor = app.aiScore >= 80 ? 'text-emerald-600' : app.aiScore >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreBarColor = app.aiScore >= 80 ? 'bg-emerald-500' : app.aiScore >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <>
      <Topbar title="Application Detail" breadcrumbs={[{ label: 'Applications', to: ROUTES.APPLICATIONS }, { label: app.applicantName }]} onMenuToggle={onMenuToggle} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Applicant Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">{app.applicantInitials}</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{app.applicantName}</h2>
                  <p className="text-sm text-gray-500">{app.applicantEmail}</p>
                  <p className="text-xs text-gray-400 mt-1">{app.applicantLocation} · {app.applicantExperience}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 border-t border-gray-50 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                <p className="leading-relaxed">{app.bio || 'No bio provided.'}</p>
              </div>
            </div>

            {/* Resume */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Resume</h3>
                <button className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 flex items-center gap-2" onClick={handleResumeDownload}>
                  <i className="fas fa-download" /> Download
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {app.resumeContent || 'No resume content available.'}
              </div>
            </div>

            {/* Skills */}
            {app.resumeSkills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {app.resumeSkills.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column — AI Score + Status + Timeline */}
          <div className="space-y-5">
            {/* AI Score */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Match Score</h3>
              <div className="text-center mb-4">
                <div className={`text-4xl font-bold ${scoreColor}`}>{app.aiScore}%</div>
                <div className="text-xs text-gray-400 mt-1">{app.aiScoreDescription || 'Match score'}</div>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${scoreBarColor}`} style={{ width: `${app.aiScore}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Applied For</h3>
              <Link to={`/jobs/${app.jobId}`} className="text-sm text-primary font-medium hover:underline no-underline">{app.jobTitle}</Link>
              <div className="mt-2"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status]}`}>{STATUS_LABELS[app.status]}</span></div>
            </div>

            {/* Status Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
              <div className="space-y-2">
                {STATUS_FLOW.filter((s) => s !== app.status).map((status) => (
                  <button key={status} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2" onClick={() => handleStatusChange(status)} disabled={updateStatus.isPending}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]?.split(' ')[0]}`} /> Move to {STATUS_LABELS[status]}
                  </button>
                ))}
                {app.status !== 'REJECTED' && (
                  <button className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 text-left flex items-center gap-2" onClick={() => handleStatusChange('REJECTED')} disabled={updateStatus.isPending}>
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Reject
                  </button>
                )}
              </div>
            </div>

            {/* Timeline */}
            {app.timeline?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h3>
                <div className="space-y-3">
                  {app.timeline.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${entry.color || 'bg-gray-300'}`} />
                      <div>
                        <div className="text-sm text-gray-900">{entry.event}</div>
                        <div className="text-xs text-gray-400">{entry.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
