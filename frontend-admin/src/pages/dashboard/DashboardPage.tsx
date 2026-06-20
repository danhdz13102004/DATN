import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useAdminStats } from '../../hooks/useAdminStats';

interface OutletCtx {
  onMenuToggle: () => void;
}

function StatCard({ label, value, icon, color, sub }: {
  label: string;
  value: number | undefined;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${color}`}>
          <i className={`fas ${icon}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">
        {value?.toLocaleString() ?? '—'}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" onMenuToggle={onMenuToggle} />

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-4">Platform Overview</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-36" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={stats?.totalUsers}
                icon="fa-users"
                color="bg-indigo-50 text-indigo-600"
                sub={`${stats?.activeUsers ?? 0} active · ${stats?.pendingUsers ?? 0} pending verification`}
              />
              <StatCard
                label="Total Companies"
                value={stats?.totalCompanies}
                icon="fa-building"
                color="bg-emerald-50 text-emerald-600"
                sub={`${stats?.verifiedCompanies ?? 0} verified · ${stats?.pendingCompanies ?? 0} pending`}
              />
              <StatCard
                label="Total Jobs"
                value={stats?.totalJobs}
                icon="fa-briefcase"
                color="bg-blue-50 text-blue-600"
                sub={`${stats?.publishedJobs ?? 0} published`}
              />
              <StatCard
                label="Total Applications"
                value={stats?.totalApplications}
                icon="fa-file-alt"
                color="bg-purple-50 text-purple-600"
                sub={`${stats?.appliedApplications ?? 0} new applications`}
              />
            </div>
          )}
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/users', icon: 'fa-users', label: 'Manage Users', color: 'text-indigo-600 bg-indigo-50' },
              { to: '/companies', icon: 'fa-building', label: 'Verify Companies', color: 'text-emerald-600 bg-emerald-50' },
              { to: '/jobs', icon: 'fa-briefcase', label: 'Review Jobs', color: 'text-blue-600 bg-blue-50' },
              { to: '/applications', icon: 'fa-file-alt', label: 'View Applications', color: 'text-purple-600 bg-purple-50' },
              { to: '/job-search-sync', icon: 'fa-sync-alt', label: 'Search Sync', color: 'text-cyan-600 bg-cyan-50' },
            ].map((item) => (
              <a
                key={item.to}
                href={item.to}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <i className={`fas ${item.icon}`} />
                </div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Status breakdown */}
        {stats && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-4">User Status Breakdown</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-right px-6 py-3 font-semibold">Count</th>
                    <th className="text-right px-6 py-3 font-semibold">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'Active', count: stats.activeUsers, color: 'text-emerald-600' },
                    { label: 'Pending Verification', count: stats.pendingUsers, color: 'text-amber-600' },
                    { label: 'Suspended', count: stats.suspendedUsers, color: 'text-red-500' },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-6 py-3 font-medium ${row.color}`}>{row.label}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">{row.count.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {stats.totalUsers > 0 ? ((row.count / stats.totalUsers) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
