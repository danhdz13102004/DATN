import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useApplications } from '../../hooks/useApplications';
import { useJobSelectOptions } from '../../hooks/useJobs';
import { STATUS_LABELS, STATUS_COLORS } from '../../constants';

export default function ApplicationsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const { data: appsData, isLoading } = useApplications(filters);
  const { data: jobOptions } = useJobSelectOptions();

  const apps = appsData?.data || [];
  const stats = appsData?.stats;

  const handleFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val) next[key] = val;
      else delete next[key];
      return next;
    });
  };

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, color: 'bg-sky-100 text-sky-600', icon: 'fa-file-alt' },
    { label: 'Screening', value: stats?.screening ?? 0, color: 'bg-amber-100 text-amber-600', icon: 'fa-search' },
    { label: 'Interview', value: stats?.interview ?? 0, color: 'bg-emerald-100 text-emerald-600', icon: 'fa-calendar' },
    { label: 'Hired', value: stats?.hired ?? 0, color: 'bg-green-100 text-green-600', icon: 'fa-check-circle' },
  ];

  return (
    <>
      <Topbar title="Applications" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><i className={`fas ${s.icon}`} /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="Search applicant..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter('search', search)} />
          </div>
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary min-w-[140px]" onChange={(e) => handleFilter('status', e.target.value)}>
            <option value="">All Status</option>
            {['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary min-w-[160px]" onChange={(e) => handleFilter('jobId', e.target.value)}>
            <option value="">All Jobs</option>
            {jobOptions?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Applicant', 'Job Position', 'AI Score', 'Status', 'Applied', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No applications found</td></tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {app.candidateName?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{app.candidateName}</div>
                          <div className="text-xs text-gray-400">{app.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{app.jobTitle}</td>
                    <td className="px-5 py-3.5">
                      {app.aiScore != null ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${app.aiScore >= 80 ? 'text-emerald-600' : app.aiScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{app.aiScore}%</span>
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${app.aiScore >= 80 ? 'bg-emerald-500' : app.aiScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${app.aiScore}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status]}`}>{STATUS_LABELS[app.status]}</span></td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <Link to={`/applications/${app.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"><i className="fas fa-eye" /></Link>
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
