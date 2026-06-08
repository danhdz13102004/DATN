import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { useAdminJobs } from '../../hooks/useAdminJobs';
import type { JobStatus } from '../../types/admin';

interface OutletCtx { onMenuToggle: () => void; }

const STATUSES: { value: JobStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function JobsPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAdminJobs({
    page,
    size: 20,
    status: status || undefined,
    keyword: search || undefined,
  });

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.pageSize) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(keyword);
    setPage(1);
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Jobs"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Jobs' }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search job titles..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button type="submit" className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors">
              <i className="fas fa-search" />
            </button>
          </form>
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
            value={status}
            onChange={(e) => { setStatus(e.target.value as JobStatus | ''); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="ml-auto text-sm text-gray-400">
            {data ? `${data.meta.total.toLocaleString()} jobs` : ''}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Job Title</th>
                  <th className="text-left px-6 py-3 font-semibold">Type</th>
                  <th className="text-left px-6 py-3 font-semibold">Location</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-left px-6 py-3 font-semibold">Posted</th>
                  <th className="text-right px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <i className="fas fa-briefcase text-3xl mb-3 block opacity-30" />
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  data?.data.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link to={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{job.jobType ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{job.location ?? '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge value={job.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
                        >
                          <i className="fas fa-eye text-xs" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
