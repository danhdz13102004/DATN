import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../../components/layout/Topbar';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../contexts/ToastContext';
import {
  useStaff,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaffName,
} from '../../../hooks/useStaff';
import type { StaffMember } from '../../../types/staff';

/* ─── Avatar color palette ─── */
const AVATAR_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-sky-100', text: 'text-sky-600' },
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-pink-100', text: 'text-pink-600' },
];

const getAvatarColor = (str: string) =>
  AVATAR_COLORS[Math.abs([...str].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  HR: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200',
  RECRUITER: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
};

export default function StaffManagementPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { user } = useAuthStore();
  const toast = useToast();

  const { data: staffList = [], isLoading } = useStaff();
  const createMutation = useCreateStaff();
  const deleteMutation = useDeleteStaff();
  const updateNameMutation = useUpdateStaffName();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<'HR' | 'RECRUITER'>('HR');
  const [createPassword, setCreatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');

  const isOwner = user?.companyRole === 'OWNER';

  /* ─── Helpers ─── */
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : '?';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      s.role.toLowerCase().includes(q)
    );
  });

  /* ─── Stats (derived) ─── */
  const totalStaff = staffList.length;
  const ownerCount = staffList.filter((s) => s.role === 'OWNER').length;
  const hrCount = staffList.filter((s) => s.role === 'HR').length;
  const recruiterCount = staffList.filter((s) => s.role === 'RECRUITER').length;

  /* ─── Handlers ─── */
  const resetCreateForm = () => {
    setCreateEmail('');
    setCreateName('');
    setCreateRole('HR');
    setCreatePassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setShowConfirmPwd(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await createMutation.mutateAsync({ email: createEmail, fullName: createName, password: createPassword, role: createRole });
      toast.success('Staff member created successfully');
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create staff');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await updateNameMutation.mutateAsync({ id: editingStaff.id, data: { fullName: editName } });
      toast.success('Profile updated successfully');
      setIsEditOpen(false);
      setEditingStaff(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    }
  };

  const handleDelete = async () => {
    if (!deletingStaff) return;
    try {
      await deleteMutation.mutateAsync(deletingStaff.id);
      toast.success('Staff member removed');
      setIsDeleteOpen(false);
      setDeletingStaff(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove staff');
    }
  };

  const openEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setEditName(s.fullName || '');
    setIsEditOpen(true);
  };

  const openDelete = (s: StaffMember) => {
    setDeletingStaff(s);
    setIsDeleteOpen(true);
  };

  /* ─── Stat Card Helper ─── */
  const statCards = [
    { label: 'Total Staff', value: totalStaff, icon: 'fa-users', color: 'bg-primary/10 text-primary' },
    { label: 'Owners', value: ownerCount, icon: 'fa-user-shield', color: 'bg-emerald-100 text-emerald-600' },
    { label: 'HR', value: hrCount, icon: 'fa-user-tie', color: 'bg-sky-100 text-sky-600' },
    { label: 'Recruiters', value: recruiterCount, icon: 'fa-headset', color: 'bg-amber-100 text-amber-600' },
  ];

  /* ─── Shared CSS classes ─── */
  const inputCls =
    'w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-150';
  const modalOverlayCls =
    'fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4';
  const modalCls = 'bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in';

  return (
    <>
      <Topbar title="Staff Management" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your company's staff and roles</p>
          </div>
          {isOwner && (
            <button
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 flex items-center gap-2 self-start"
              onClick={() => setIsCreateOpen(true)}
            >
              <i className="fas fa-user-plus" /> Create Staff
            </button>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>
                  <i className={`fas ${c.icon} text-base`} />
                </div>
                <div>
                  <h4 className="text-xs text-gray-500 font-medium uppercase tracking-wider">{c.label}</h4>
                  <div className="text-2xl font-bold text-gray-900 mt-0.5">{c.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-gray-50 gap-3">
            <h3 className="text-lg font-bold text-gray-900">All Staff</h3>
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by name, email or role…"
                className="w-full pl-9 pr-3.5 py-2 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Joined
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-gray-400 mt-3">Loading staff…</p>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-users text-xl text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">
                        {searchQuery ? 'No staff matching your search' : 'No staff members yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const color = getAvatarColor(staff.email);
                    const isSelf = user?.id === staff.userId;
                    return (
                      <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-bold shrink-0`}
                            >
                              {getInitials(staff.fullName, staff.email)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 leading-tight">
                                {staff.fullName || '—'}
                              </div>
                              {isSelf && (
                                <span className="text-[0.65rem] text-primary font-medium">You</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{staff.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[0.7rem] font-semibold ${ROLE_BADGE[staff.role] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(staff.joinedAt)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {isSelf && (
                              <button
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                onClick={() => openEdit(staff)}
                                title="Edit name"
                              >
                                <i className="fas fa-pen text-xs" />
                              </button>
                            )}
                            {isOwner && !isSelf && (
                              <button
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                onClick={() => openDelete(staff)}
                                title="Remove staff"
                                disabled={deleteMutation.isPending}
                              >
                                <i className="fas fa-trash-alt text-xs" />
                              </button>
                            )}
                            {!isSelf && !isOwner && (
                              <span className="text-xs text-gray-300 px-2">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredStaff.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
              Showing {filteredStaff.length} of {staffList.length} members
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          Create Staff Modal
         ════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className={modalOverlayCls} onClick={(e) => e.target === e.currentTarget && setIsCreateOpen(false)}>
          <div className={modalCls}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <i className="fas fa-user-plus text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create Staff Member</h3>
                  <p className="text-xs text-gray-400">Account will be active immediately</p>
                </div>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="email"
                    autoComplete="off"
                    className={`${inputCls} pl-9`}
                    placeholder="colleague@company.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    autoComplete="off"
                    className={`${inputCls} pl-9`}
                    placeholder="e.g. Nguyen Van A"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(['HR', 'RECRUITER'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-[1.5px] transition-all duration-150 ${
                        createRole === r
                          ? 'border-primary bg-primary/5 text-primary ring-[3px] ring-primary/10'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => setCreateRole(r)}
                    >
                      <i className={`fas ${r === 'HR' ? 'fa-user-tie' : 'fa-headset'} mr-1.5 text-xs`} />
                      {r === 'RECRUITER' ? 'Recruiter' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputCls} pl-9 pr-10`}
                    placeholder="Create a password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
                <p className="text-[0.7rem] text-gray-400 mt-1 ml-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${inputCls} pl-9 pr-10`}
                    placeholder="Re-enter the password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i className={`fas ${showConfirmPwd ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20 disabled:opacity-60"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    <><i className="fas fa-check mr-1.5" /> Create Account</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Edit Profile Modal
         ════════════════════════════════════════════════ */}
      {isEditOpen && editingStaff && (
        <div className={modalOverlayCls} onClick={(e) => e.target === e.currentTarget && setIsEditOpen(false)}>
          <div className={modalCls}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <i className="fas fa-pen text-sky-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                onClick={() => setIsEditOpen(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {/* User context card */}
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(editingStaff.email).bg} ${getAvatarColor(editingStaff.email).text} flex items-center justify-center text-xs font-bold`}>
                  {getInitials(editingStaff.fullName, editingStaff.email)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{editingStaff.fullName || '—'}</div>
                  <div className="text-xs text-gray-400 truncate">{editingStaff.email}</div>
                </div>
                <span className={`ml-auto shrink-0 inline-flex px-2 py-0.5 rounded-full text-[0.65rem] font-semibold ${ROLE_BADGE[editingStaff.role]}`}>
                  {editingStaff.role}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    className={`${inputCls} pl-9`}
                    placeholder="Full name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20 disabled:opacity-60"
                  disabled={updateNameMutation.isPending}
                >
                  {updateNameMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    <><i className="fas fa-save mr-1.5" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Delete Confirmation Modal
         ════════════════════════════════════════════════ */}
      {isDeleteOpen && deletingStaff && (
        <div className={modalOverlayCls} onClick={(e) => e.target === e.currentTarget && setIsDeleteOpen(false)}>
          <div className={`${modalCls} max-w-sm`}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-xl text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Staff Member</h3>
              <p className="text-sm text-gray-500 mb-1">
                Are you sure you want to remove
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-4">
                {deletingStaff.fullName || deletingStaff.email}?
              </p>
              <p className="text-xs text-gray-400">
                This action cannot be undone. The user will lose access to this company.
              </p>
            </div>
            <div className="flex gap-2 p-5 border-t border-gray-100">
              <button
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => { setIsDeleteOpen(false); setDeletingStaff(null); }}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm shadow-red-200 disabled:opacity-60"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing…
                  </span>
                ) : (
                  <><i className="fas fa-trash-alt mr-1.5" /> Remove</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
