import { Link } from 'react-router-dom';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useJobDetail, useChangeJobStatus, useDeleteJob } from '../../hooks/useJobs';
import { useApplications } from '../../hooks/useApplications';
import { ROUTES } from '../../constants';
import { formatDate, formatRelativeDate } from '../../utils/date';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import InfoGrid from '../../components/common/InfoGrid';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import EmptyState from '../../components/common/EmptyState';

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: 'Full-time',
  PARTTIME: 'Part-time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: job, isLoading } = useJobDetail(id || '');
  const { data: appsData } = useApplications(id ? { jobId: id } : undefined);
  const changeStatus = useChangeJobStatus();
  const deleteJob = useDeleteJob();
  const toast = useToast();

  const apps = appsData?.data || [];

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this job? This cannot be undone.')) {
      try {
        await deleteJob.mutateAsync(id!);
        toast.success('Job deleted successfully');
        navigate(ROUTES.JOBS);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to delete job';
        toast.error(msg);
      }
    }
  };

  if (isLoading) return (
    <>
      <Topbar title="Job Detail" breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: 'Loading...' }]} onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
        <div className="animate-pulse space-y-5">
          <div className="h-10 bg-gray-100 rounded-xl w-64" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </>
  );

  if (!job) return (
    <>
      <Topbar title="Job Not Found" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
        <EmptyState
          icon="fa-exclamation-circle"
          title="Job not found"
          description="This job may have been deleted or doesn't exist."
          actionLabel="Back to Jobs"
          onAction={() => navigate(ROUTES.JOBS)}
        />
      </div>
    </>
  );

  const infoItems = [
    { label: 'Job Type', value: JOB_TYPE_LABELS[job.jobType] ?? job.jobType, icon: 'fa-clock' },
    { label: 'Level', value: job.experienceLevels?.map((l) => l.charAt(0) + l.slice(1).toLowerCase()).join(', ') || '—', icon: 'fa-signal' },
    { label: 'Industry', value: job.industry?.name || '—', icon: 'fa-building' },
    { label: 'Location', value: job.location, icon: 'fa-location-dot' },
    {
      label: 'Salary Range',
      value: job.salaryMin && job.salaryMax
        ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
        : 'Negotiable',
      icon: 'fa-dollar-sign',
      highlight: true,
    },
    { label: 'Created', value: formatDate(job.createdAt), icon: 'fa-calendar-plus' },
    {
      label: 'Applications',
      value: `${job.applicationCount ?? 0} applicant${(job.applicationCount ?? 0) !== 1 ? 's' : ''}`,
      icon: 'fa-users',
      highlight: true,
    },
  ];

  return (
    <>
      <Topbar title="Job Detail" breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: job.title }]} onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 space-y-6 max-w-full mx-8">

        {/* ── Header Card ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Title + Meta */}
              <div className="flex items-start gap-4">
                {/* Company avatar */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-xl font-bold shadow-sm border border-emerald-100 shrink-0 hidden sm:flex">
                  C
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                    {job.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={job.status} size="sm" />
                    <span className="text-sm text-gray-400">
                      <i className="fas fa-calendar-alt mr-1 text-gray-300" />
                      Posted {formatRelativeDate(job.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/jobs/${id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 no-underline"
                >
                  <i className="fas fa-pen text-xs text-gray-400" />
                  Edit
                </Link>

                {job.status === 'PUBLISHED' && (
                  <button
                    onClick={async () => {
                      try {
                        await changeStatus.mutateAsync({ id: id!, status: 'CLOSED' });
                        toast.success('Job closed successfully');
                      } catch (err: unknown) {
                        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to close job';
                        toast.error(msg);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl text-sm font-semibold hover:bg-amber-100 hover:-translate-y-px hover:shadow-sm transition-all duration-200"
                  >
                    <i className="fas fa-times-circle text-xs" />
                    Close Job
                  </button>
                )}

                {job.status === 'DRAFT' && (
                  <button
                    onClick={async () => {
                      try {
                        await changeStatus.mutateAsync({ id: id!, status: 'PUBLISHED' });
                        toast.success('Job published successfully');
                      } catch (err: unknown) {
                        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to publish job';
                        toast.error(msg);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 shadow-sm shadow-primary/20"
                  >
                    <i className="fas fa-rocket text-xs" />
                    Publish
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 hover:-translate-y-px hover:shadow-sm transition-all duration-200"
                >
                  <i className="fas fa-trash text-xs" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info Grid ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <h3 className="text-base font-bold text-gray-900">Job Details</h3>
          </div>
          <InfoGrid items={infoItems} columns={4} />
        </div>

        {/* ── Description ─────────────────────────────────── */}
        {job.description && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Job Description</h3>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pl-3.5 border-l-2 border-gray-100">
              {job.description}
            </div>
          </div>
        )}

        {/* ── Responsibilities ──────────────────────────────── */}
        {job.responsibilities && job.responsibilities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Responsibilities</h3>
            </div>
            <ul className="space-y-2.5">
              {job.responsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Requirements ─────────────────────────────────── */}
        {job.requirements && job.requirements.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Requirements</h3>
            </div>
            <ul className="space-y-2.5">
              {job.requirements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <i className="fas fa-check-circle text-primary mt-0.5 shrink-0 text-xs" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Skills ──────────────────────────────────────── */}
        {job.skills && job.skills.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Required Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100"
                >
                  <i className="fas fa-check text-[9px]" />
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Nice-to-have Skills ─────────────────────────── */}
        {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-gray-300 rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Nice-to-have Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.niceToHaveSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-200"
                >
                  <i className="fas fa-star text-[9px] text-gray-400" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Applications ────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Recent Applications</h3>
              {apps.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-semibold rounded-full">
                  {apps.length}
                </span>
              )}
            </div>
            <Link
              to={`${ROUTES.APPLICATIONS}?jobId=${id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors no-underline group"
            >
              View All
              <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {apps.length === 0 ? (
            <EmptyState
              icon="fa-user-plus"
              title="No applications yet"
              description="When candidates apply, they'll appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {['Applicant', 'AI Match', 'Status', 'Applied', ''].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.slice(0, 5).map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                            {app.candidateName?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {app.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <MatchScoreBadge score={app.aiScore ?? 0} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                          {formatRelativeDate(app.appliedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/applications/${app.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 hover:scale-110"
                          title="View application"
                        >
                          <i className="fas fa-expand text-sm" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
