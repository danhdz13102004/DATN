import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useJobDetail, useChangeJobStatus, useDeleteJob } from '../../hooks/useJobs';
import { useApplications } from '../../hooks/useApplications';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';
import { formatDate, formatRelativeDate } from '../../utils/date';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: job, isLoading } = useJobDetail(id || '');
  const { data: appsData } = useApplications(id ? { jobId: id } : undefined);
  const changeStatus = useChangeJobStatus();
  const deleteJob = useDeleteJob();

  const apps = appsData?.data || [];

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this job?')) {
      await deleteJob.mutateAsync(id!);
      navigate(ROUTES.JOBS);
    }
  };

  if (isLoading) return (
    <>
      <Topbar title="Job Detail" breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: 'Loading...' }]} onMenuToggle={onMenuToggle} />
      <div className="p-6 text-center text-gray-400">Loading...</div>
    </>
  );

  if (!job) return (
    <>
      <Topbar title="Job Not Found" onMenuToggle={onMenuToggle} />
      <div className="p-6 text-center text-gray-400">Job not found</div>
    </>
  );

  const JOB_TYPE_LABELS: Record<string, string> = {
    FULLTIME: 'Full-time',
    PARTTIME: 'Part-time',
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
  };

  const infoItems = [
    { label: 'Job Type', value: JOB_TYPE_LABELS[job.jobType] ?? job.jobType },
    { label: 'Experience Level', value: job.experienceLevels?.map((l) => l.charAt(0) + l.slice(1).toLowerCase()).join(', ') || '—' },
    { label: 'Location', value: job.location },
    { label: 'Salary Range', value: job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}` : '—' },
    { label: 'Created', value: formatDate(job.createdAt) },
    { label: 'Applications', value: `${job.applicationCount ?? 0} applicants`, highlight: true },
  ];

  return (
    <>
      <Topbar title="Job Detail" breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: job.title }]} onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/jobs/${id}/edit`} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 no-underline text-gray-700">
              <i className="fas fa-pen" /> Edit
            </Link>
            {job.status === 'PUBLISHED' && (
              <button className="px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 flex items-center gap-2" onClick={() => changeStatus.mutate({ id: id!, status: 'CLOSED' })}>
                <i className="fas fa-times-circle" /> Close Job
              </button>
            )}
            {job.status === 'DRAFT' && (
              <button className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover flex items-center gap-2" onClick={() => changeStatus.mutate({ id: id!, status: 'PUBLISHED' })}>
                <i className="fas fa-rocket" /> Publish
              </button>
            )}
            <button className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2" onClick={handleDelete}>
              <i className="fas fa-trash" /> Delete
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {infoItems.map((item) => (
              <div key={item.label}>
                <div className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</div>
                <div className={`text-sm font-semibold mt-1 ${item.highlight ? 'text-primary' : 'text-gray-900'}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Job Description</h3>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</div>
        </div>

        {/* Skills */}
        {job.skills?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill.id} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{skill.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Recent Applications</h3>
            <Link to={`${ROUTES.APPLICATIONS}?jobId=${id}`} className="text-sm text-primary font-medium hover:underline flex items-center gap-1 no-underline">View All <i className="fas fa-arrow-right text-xs" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Applicant', 'AI Score', 'Status', 'Applied', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No applications yet</td></tr>
                ) : (
                  apps.slice(0, 5).map((app) => (
                    <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{app.applicantInitials}</div>
                          <span className="text-sm font-medium">{app.applicantName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className={`text-sm font-semibold ${app.aiScore >= 80 ? 'text-emerald-600' : app.aiScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{app.aiScore}%</span></td>
                      <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status]}`}>{STATUS_LABELS[app.status]}</span></td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{formatRelativeDate(app.appliedDate)}</td>
                      <td className="px-5 py-3.5"><Link to={`/applications/${app.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"><i className="fas fa-eye" /></Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
