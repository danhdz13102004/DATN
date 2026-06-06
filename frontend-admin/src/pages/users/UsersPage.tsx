import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { useAdminUsers, useUpdateUserStatus } from '../../hooks/useAdminUsers';
import { useToast } from '../../contexts/ToastContext';
import type { UserRole, UserStatus, AdminUser } from '../../types/admin';

interface OutletCtx { onMenuToggle: () => void; }

const ROLES: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COMPANY_OWNER', label: 'Company Owner' },
  { value: 'COMPANY_STAFF', label: 'Company Staff' },
  { value: 'JOB_SEEKER', label: 'Job Seeker' },
];

const STATUSES: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function UsersPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { data, isLoading } = useAdminUsers({
    page,
    size: 20,
    role: role || undefined,
    status: status || undefined,
  });

  const { mutate: updateStatus, isPending } = useUpdateUserStatus();

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.pageSize) : 1;

  useEffect(() => {
    if (!selectedUser) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selectedUser]);

  const handleClose = useCallback(() => setSelectedUser(null), []);

  const handleStatusChange = (user: AdminUser, newStatus: UserStatus) => {
    updateStatus(
      { id: user.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`User status updated to ${newStatus}`);
          handleClose();
        },
        onError: () => toast.error('Failed to update user status'),
      }
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Users"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Users' }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
            value={role}
            onChange={(e) => { setRole(e.target.value as UserRole | ''); setPage(1); }}
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
            value={status}
            onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="ml-auto text-sm text-gray-400">
            {data ? `${data.meta.total.toLocaleString()} users` : ''}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Email</th>
                  <th className="text-left px-6 py-3 font-semibold">Role</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-left px-6 py-3 font-semibold">Joined</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <i className="fas fa-users text-3xl mb-3 block opacity-30" />
                      No users found
                    </td>
                  </tr>
                ) : (
                  data?.data.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 text-gray-500">{user.role.replace('_', ' ')}</td>
                      <td className="px-6 py-4">
                        <StatusBadge value={user.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-sm text-primary hover:underline font-medium"
                          onClick={() => setSelectedUser(user)}
                        >
                          Manage
                        </button>
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

      {/* User action modal — portal to body so it's outside all stacking contexts */}
      {selectedUser && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-overlay"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Manage User</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedUser.email}</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-16">Role:</span>
                <span className="font-medium">{selectedUser.role.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-16">Status:</span>
                <StatusBadge value={selectedUser.status} />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-16">Joined:</span>
                <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              {selectedUser.status !== 'ACTIVE' && (
                <button
                  className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                  onClick={() => handleStatusChange(selectedUser, 'ACTIVE')}
                  disabled={isPending}
                >
                  Activate
                </button>
              )}
              {selectedUser.status !== 'SUSPENDED' && (
                <button
                  className="px-4 py-2 bg-red-500 text-white text-sm rounded-xl font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
                  onClick={() => handleStatusChange(selectedUser, 'SUSPENDED')}
                  disabled={isPending}
                >
                  Suspend
                </button>
              )}
              <button
                className="ml-auto px-4 py-2 border border-gray-200 text-sm rounded-xl font-medium hover:bg-gray-100 transition-colors"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
