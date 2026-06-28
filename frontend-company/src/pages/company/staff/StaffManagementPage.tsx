import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../../components/layout/Topbar';
import {
  useStaff, useCreateStaff, useUpdateStaffName, useDeleteStaff,
} from '../../../hooks/useStaff';
import type { StaffMember, CreateStaffRequest, UpdateStaffRequest } from '../../../types/staff';
import type { UserProfile } from '../../../types/company';
import PageHeader from '../../../components/common/PageHeader';
import EmptyState from '../../../components/common/EmptyState';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  HR: 'HR Manager',
  RECRUITER: 'Recruiter',
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  OWNER:     { text: '#7C3AED', bg: '#EDE9FE', border: 'rgba(124,58,237,0.15)' },
  HR:        { text: '#0891B2', bg: '#E0F2FE', border: 'rgba(8,145,178,0.15)' },
  RECRUITER: { text: '#059669', bg: '#D1FAE5', border: 'rgba(5,150,105,0.15)' },
};

const AVATAR_GRADIENTS = [
  'from-emerald-50 to-teal-50 text-emerald-600',
  'from-blue-50 to-indigo-50 text-blue-600',
  'from-violet-50 to-purple-50 text-violet-600',
  'from-amber-50 to-orange-50 text-amber-600',
  'from-rose-50 to-pink-50 text-rose-600',
];

function avatarGradient(name: string | null | undefined) {
  if (!name) return AVATAR_GRADIENTS[0];
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export default function StaffManagementPage() {
  const { onMenuToggle, user } = useOutletContext<{ onMenuToggle: () => void; user?: UserProfile }>();
  const { data: members, isLoading, isError, error } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaffName = useUpdateStaffName();
  const deleteStaff = useDeleteStaff();

  const [inviteModal, setInviteModal] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; member?: StaffMember }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; member?: StaffMember }>({ open: false });

  const { register: inviteRegister, handleSubmit: inviteSubmit, formState: { errors: inviteErrors }, reset: inviteReset } = useForm<CreateStaffRequest>();
  const { register: editRegister, handleSubmit: editSubmit, formState: { errors: editErrors } } = useForm<UpdateStaffRequest>();

  const handleInvite = async (data: CreateStaffRequest) => {
    const payload: CreateStaffRequest = {
      ...data,
      role: 'HR',
      password: data.password?.trim() || '12345678',
    };
    await createStaff.mutateAsync(payload);
    setInviteModal(false);
    inviteReset();
  };

  const handleUpdate = async (data: UpdateStaffRequest) => {
    if (!editModal.member) return;
    await updateStaffName.mutateAsync({ id: editModal.member.id, data });
    setEditModal({ open: false });
  };

  const handleDelete = async () => {
    if (!deleteModal.member) return;
    await deleteStaff.mutateAsync(deleteModal.member.id);
    setDeleteModal({ open: false });
  };

  const roleStats = {
    total: members?.length || 0,
    owners: members?.filter((m: StaffMember) => m.role === 'OWNER').length || 0,
    hr: members?.filter((m: StaffMember) => m.role === 'HR').length || 0,
    recruiters: members?.filter((m: StaffMember) => m.role === 'RECRUITER').length || 0,
  };
  const isOwner = user?.companyRole === 'OWNER';

  return (
    <>
      <Topbar title="Staff Management" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-full mx-8 space-y-6">

        <PageHeader
          title="Staff Management"
          description="Manage your company's team members and their roles"
          action={
            isOwner ? (
              <button
                onClick={() => { setInviteModal(true); setShowInvitePassword(false); inviteReset(); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 shadow-sm"
              >
                <i className="fas fa-user-plus text-xs" />
                Invite Member
              </button>
            ) : null
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-16">
          {[
            { label: 'Total Members', value: roleStats.total,       icon: 'fa-users',       bg: 'from-blue-50 to-indigo-50',    border: 'border-blue-100/50',    iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
            { label: 'HR Managers',    value: roleStats.hr,          icon: 'fa-id-card',     bg: 'from-amber-50 to-orange-50',    border: 'border-amber-100/50',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
            // { label: 'Recruiters',     value: roleStats.recruiters,   icon: 'fa-user-tie',    bg: 'from-emerald-50 to-green-50',   border: 'border-emerald-100/50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
          ].map((s, idx) => (
            <div
              key={s.label}
              className={`animate-fadeSlideUp group relative overflow-hidden bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-30 bg-blue-400" />
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <i className={`fas ${s.icon} text-base`} />
                </div>
                <div>
                  <div className="text-3xl font-black text-gray-900 tracking-tight tabular-nums">{s.value}</div>
                  <div className="text-sm font-medium text-gray-500 mt-0.5">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Team Members</h3>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading staff members...</div>
          ) : isError ? (
            <div className="p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-exclamation-triangle" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">Failed to load staff members</p>
                    <p className="text-sm mt-1 text-red-600/90 break-words">
                      {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Please try again.'}
                    </p>
                    <p className="text-xs mt-2 text-red-500/80">
                      Tip: if your login session expired, reload and sign in again.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !members?.length ? (
            <EmptyState
              icon="fa-users"
              title="No team members yet"
              description={isOwner ? 'Invite your first team member to collaborate.' : 'No team members have been added yet.'}
              actionLabel={isOwner ? 'Invite Member' : undefined}
              onAction={isOwner ? () => { setInviteModal(true); setShowInvitePassword(false); inviteReset(); } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Member', 'Role', 'Email', 'Joined', ''].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: StaffMember) => {
                    const roleStyle = ROLE_COLORS[member.role] ?? { text: '#64748b', bg: '#f1f5f9', border: 'rgba(0,0,0,0.06)' };
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient(member.fullName)} flex items-center justify-center text-xs font-bold shadow-sm shrink-0`}>
                              {member.fullName?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{member.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}` }}
                          >
                            <i className={`fas ${member.role === 'OWNER' ? 'fa-crown' : member.role === 'HR' ? 'fa-id-card' : 'fa-user-tie'} text-[9px]`} />
                            {ROLE_LABELS[member.role] ?? member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-600">{member.email}</span>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-sm text-gray-400">
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {member.role !== 'OWNER' && (
                              <>
                                {/* <button
                                  onClick={() => { setEditModal({ open: true, member }); editReset({ fullName: member.fullName }); }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150 hover:scale-105"
                                  title="Edit name"
                                >
                                  <i className="fas fa-pen text-xs" />
                                </button> */}
                                <button
                                  onClick={() => setDeleteModal({ open: true, member })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150 hover:scale-105"
                                  title="Remove member"
                                >
                                  <i className="fas fa-trash text-xs" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setInviteModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <i className="fas fa-user-plus text-base" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Team Member</h3>
                <p className="text-xs text-gray-400 mt-0.5">Create a new HR staff account</p>
              </div>
            </div>

            <form onSubmit={inviteSubmit(handleInvite)} className="p-6 space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Full Name <span className="text-red-500 text-xs">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="John Doe"
                  {...inviteRegister('fullName', { required: 'Full name is required' })}
                />
                {inviteErrors.fullName && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <i className="fas fa-circle-exclamation" />
                    {inviteErrors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address <span className="text-red-500 text-xs">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="john@company.com"
                  {...inviteRegister('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
                  })}
                />
                {inviteErrors.email && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <i className="fas fa-circle-exclamation" />
                    {inviteErrors.email.message}
                  </p>
                )}
              </div>

              {/* Role — auto-assigned HR */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Assigned Role</label>
                <div className="flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <i className="fas fa-id-card" />
                    HR
                  </span>
                  <span>HR Manager</span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Password <span className="text-xs text-gray-400 font-normal bg-gray-100 px-1.5 py-0.5 rounded">optional</span>
                </label>
                <div className="relative">
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 pr-11 border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Leave blank for default: 12345678"
                    {...inviteRegister('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword((show) => !show)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    aria-label={showInvitePassword ? 'Hide password' : 'Show password'}
                    title={showInvitePassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas ${showInvitePassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Default is <strong>12345678</strong></p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  onClick={() => setInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={createStaff.isPending}
                >
                  {createStaff.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus text-xs" />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.member && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditModal({ open: false })}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <i className="fas fa-pen text-base" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Member</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editModal.member.email}</p>
              </div>
            </div>

            <form onSubmit={editSubmit(handleUpdate)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  {...editRegister('fullName', { required: 'Full name is required' })}
                />
                {editErrors.fullName && <p className="text-xs text-red-500 mt-1">{editErrors.fullName.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setEditModal({ open: false })}>
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2" disabled={updateStaffName.isPending}>
                  <i className="fas fa-check text-xs" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.member && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteModal({ open: false })}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="flex flex-col items-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <i className="fas fa-user-minus text-2xl text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Team Member?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to remove <strong className="text-gray-700">{deleteModal.member.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => setDeleteModal({ open: false })}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  onClick={handleDelete}
                  disabled={deleteStaff.isPending}
                >
                  <i className="fas fa-trash text-xs" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
