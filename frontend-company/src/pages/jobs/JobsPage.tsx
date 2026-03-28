import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useCompanyJobs, useDeleteJob, useChangeJobStatus } from '../../hooks/useJobs';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';
import { formatRelativeDate } from '../../utils/date';

export default function JobsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const { data: jobs, isLoading } = useCompanyJobs(filters);
  const deleteJob = useDeleteJob();
  const changeStatus = useChangeJobStatus();

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const handleFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val) next[key] = val;
      else delete next[key];
      return next;
    });
  };

  return (
    <>
      <Topbar title="Jobs" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Job Postings</h2>
            <p className="text-sm text-gray-500">Manage your company's job listings</p>
          </div>
          <Link to={ROUTES.JOB_CREATE} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all flex items-center gap-2 no-underline">
            <i className="fas fa-plus" /> Create New Job
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary min-w-[130px]" onChange={(e) => handleFilter('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary min-w-[130px]" onChange={(e) => handleFilter('type', e.target.value)}>
            <option value="">All Types</option>
            <option value="FULLTIME">Full-time</option>
            <option value="PARTTIME">Part-time</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary min-w-[130px]" onChange={(e) => handleFilter('level', e.target.value)}>
            <option value="">All Levels</option>
            <option value="INTERN">Intern</option>
            <option value="FRESHER">Fresher</option>
            <option value="JUNIOR">Junior</option>
            <option value="MIDDLE">Middle</option>
            <option value="SENIOR">Senior</option>
            <option value="LEADER">Leader</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Job Title', 'Type', 'Level', 'Location', 'Salary Range', 'Status', 'Applications', 'Created', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
              ) : !jobs?.length ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">No jobs found. Create your first job posting!</td></tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5"><Link to={`/jobs/${job.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary no-underline">{job.title}</Link></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{{'FULLTIME':'Full-time','PARTTIME':'Part-time','REMOTE':'Remote','HYBRID':'Hybrid'}[job.jobType] ?? job.jobType}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{job.experienceLevels?.map((l) => l.charAt(0) + l.slice(1).toLowerCase()).join(', ') || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{job.location}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{job.applicationCount}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{formatRelativeDate(job.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link to={`/jobs/${job.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"><i className="fas fa-eye" /></Link>
                        <Link to={`/jobs/${job.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"><i className="fas fa-pen" /></Link>
                        {job.status === 'PUBLISHED' && (
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600" title="Close Job" onClick={() => changeStatus.mutate({ id: job.id, status: 'CLOSED' })}><i className="fas fa-times-circle" /></button>
                        )}
                        {job.status === 'DRAFT' && (
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600" title="Publish Job" onClick={() => changeStatus.mutate({ id: job.id, status: 'PUBLISHED' })}><i className="fas fa-rocket" /></button>
                        )}
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500" title="Delete" onClick={() => { if (confirm('Delete this job?')) deleteJob.mutate(job.id); }}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
