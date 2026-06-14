import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import {
  useAdminSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from '../../hooks/useAdminSkills';
import {
  useAdminIndustries,
  useCreateIndustry,
  useUpdateIndustry,
  useDeleteIndustry,
} from '../../hooks/useAdminIndustries';
import { useToast } from '../../contexts/ToastContext';
import type { AdminSkill, AdminIndustry } from '../../types/admin';

interface OutletCtx {
  onMenuToggle: () => void;
}

type Tab = 'skills' | 'industries';

function extractErrorMsg(e: unknown): string {
  return (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
    ?? 'An unexpected error occurred';
}

interface ItemFormModalProps<T extends { name: string; id?: string }> {
  item?: T | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isPending: boolean;
  title: string;
  itemType: string;
}

function ItemFormModal<T extends { name: string; id?: string }>({
  item, onClose, onSubmit, isPending, itemType,
}: ItemFormModalProps<T>) {
  void itemType; // used in JSX rendering via prop
  const [name, setName] = useState(item?.name ?? '');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {item ? `Edit ${itemType}` : `Add New ${itemType}`}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg"
            onClick={onClose}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {itemType} Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder={`e.g. ${itemType === 'Skill' ? 'React, Python, AWS...' : 'Technology & IT, Healthcare...'}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            className="flex-1 px-4 py-2.5 border border-gray-200 text-sm rounded-xl font-medium hover:bg-gray-100 transition-colors text-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : item ? 'Save Changes' : `Create ${itemType}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface DataTableProps<T extends { id: string; name: string; jobUsageCount: number }> {
  items: T[] | undefined;
  isLoading: boolean;
  itemType: string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  deletePending: boolean;
  deletingId: string | null;
  emptyIcon: string;
  emptyMsg: string;
}

function DataTable<T extends { id: string; name: string; jobUsageCount: number }>({
  items, isLoading, itemType, onEdit, onDelete, deletePending, deletingId, emptyIcon, emptyMsg,
}: DataTableProps<T>) {
  void itemType; // used in generic table column headers
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3.5 font-semibold w-12">#</th>
              <th className="text-left px-6 py-3.5 font-semibold">Name</th>
              <th className="text-center px-6 py-3.5 font-semibold">Jobs Using</th>
              <th className="text-right px-6 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {['', '', '', ''].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !items || items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-gray-400">
                  <i className={`fas ${emptyIcon} text-3xl mb-3 block opacity-30`} />
                  <p className="text-sm">{emptyMsg}</p>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const inUse = item.jobUsageCount > 0;
                const isDeleting = deletingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {inUse ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          <i className="fas fa-briefcase text-[9px]" />
                          {item.jobUsageCount.toLocaleString()} job{item.jobUsageCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-100">
                          <i className="fas fa-minus text-[9px]" />
                          Not used
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-600"
                          onClick={() => onEdit(item)}
                          title="Edit"
                        >
                          <i className="fas fa-edit text-[10px]" />
                          Edit
                        </button>
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg font-medium transition-colors ${
                            inUse
                              ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                              : 'border-red-100 text-red-500 hover:bg-red-50'
                          }`}
                          onClick={() => !inUse && onDelete(item)}
                          disabled={inUse || isDeleting || deletePending}
                          title={inUse ? `Cannot delete — used by ${item.jobUsageCount} job(s)` : 'Delete'}
                        >
                          {isDeleting ? (
                            <span className="w-3 h-3 border-[1.5px] border-red-300/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <i className="fas fa-trash text-[10px]" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SkillsIndustriesPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddIndustry, setShowAddIndustry] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [editingIndustry, setEditingIndustry] = useState<AdminIndustry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: skills, isLoading: skillsLoading } = useAdminSkills();
  const { data: industries, isLoading: industriesLoading } = useAdminIndustries();

  const { mutate: createSkill, isPending: creatingSkill } = useCreateSkill();
  const { mutate: updateSkill, isPending: updatingSkill } = useUpdateSkill();
  const { mutate: deleteSkill, isPending: deletingSkill } = useDeleteSkill();

  const { mutate: createIndustry, isPending: creatingIndustry } = useCreateIndustry();
  const { mutate: updateIndustry, isPending: updatingIndustry } = useUpdateIndustry();
  const { mutate: deleteIndustry, isPending: deletingIndustry } = useDeleteIndustry();

  const handleCreateSkill = (name: string) => {
    createSkill(name, {
      onSuccess: () => { toast.success('Skill created successfully'); setShowAddSkill(false); },
      onError: (e) => toast.error(extractErrorMsg(e)),
    });
  };

  const handleUpdateSkill = (name: string) => {
    if (!editingSkill) return;
    updateSkill({ id: editingSkill.id, name }, {
      onSuccess: () => { toast.success('Skill updated successfully'); setEditingSkill(null); },
      onError: (e) => toast.error(extractErrorMsg(e)),
    });
  };

  const handleDeleteSkill = (item: AdminSkill) => {
    if (!confirm(`Delete skill "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    deleteSkill(item.id, {
      onSuccess: () => { toast.success('Skill deleted'); setDeletingId(null); },
      onError: (e) => { toast.error(extractErrorMsg(e)); setDeletingId(null); },
    });
  };

  const handleCreateIndustry = (name: string) => {
    createIndustry(name, {
      onSuccess: () => { toast.success('Industry created successfully'); setShowAddIndustry(false); },
      onError: (e) => toast.error(extractErrorMsg(e)),
    });
  };

  const handleUpdateIndustry = (name: string) => {
    if (!editingIndustry) return;
    updateIndustry({ id: editingIndustry.id, name }, {
      onSuccess: () => { toast.success('Industry updated successfully'); setEditingIndustry(null); },
      onError: (e) => toast.error(extractErrorMsg(e)),
    });
  };

  const handleDeleteIndustry = (item: AdminIndustry) => {
    if (!confirm(`Delete industry "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    deleteIndustry(item.id, {
      onSuccess: () => { toast.success('Industry deleted'); setDeletingId(null); },
      onError: (e) => { toast.error(extractErrorMsg(e)); setDeletingId(null); },
    });
  };

  const totalSkills = skills?.length ?? 0;
  const totalIndustries = industries?.length ?? 0;

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skills & Industries"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Skills & Industries' },
        ]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <i className="fas fa-tools text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalSkills}</div>
              <div className="text-sm text-gray-400">Skills</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <i className="fas fa-industry text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalIndustries}</div>
              <div className="text-sm text-gray-400">Industries</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
              <i className="fas fa-briefcase text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(skills?.reduce((acc, s) => acc + s.jobUsageCount, 0) ?? 0) +
                  (industries?.reduce((acc, i) => acc + i.jobUsageCount, 0) ?? 0)}
              </div>
              <div className="text-sm text-gray-400">Total usages</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'skills'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <i className="fas fa-tools text-xs" />
              Skills
              <span className="text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {totalSkills}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('industries')}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'industries'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <i className="fas fa-industry text-xs" />
              Industries
              <span className="text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {totalIndustries}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Skills</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Manage job skills. Skills in use cannot be deleted.
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 transition-colors"
                onClick={() => setShowAddSkill(true)}
              >
                <i className="fas fa-plus" />
                Add Skill
              </button>
            </div>

            <DataTable
              items={skills}
              isLoading={skillsLoading}
              itemType="Skill"
              onEdit={setEditingSkill}
              onDelete={handleDeleteSkill}
              deletePending={deletingSkill}
              deletingId={deletingId}
              emptyIcon="fa-tools"
              emptyMsg="No skills yet. Add your first skill."
            />
          </div>
        )}

        {activeTab === 'industries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Industries</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Manage job industries. Industries in use cannot be deleted.
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 transition-colors"
                onClick={() => setShowAddIndustry(true)}
              >
                <i className="fas fa-plus" />
                Add Industry
              </button>
            </div>

            <DataTable
              items={industries}
              isLoading={industriesLoading}
              itemType="Industry"
              onEdit={setEditingIndustry}
              onDelete={handleDeleteIndustry}
              deletePending={deletingIndustry}
              deletingId={deletingId}
              emptyIcon="fa-industry"
              emptyMsg="No industries yet. Add your first industry."
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddSkill && (
        <ItemFormModal
          itemType="Skill"
          title="Add New Skill"
          onClose={() => setShowAddSkill(false)}
          onSubmit={handleCreateSkill}
          isPending={creatingSkill}
        />
      )}
      {editingSkill && (
        <ItemFormModal
          item={editingSkill}
          itemType="Skill"
          title="Edit Skill"
          onClose={() => setEditingSkill(null)}
          onSubmit={handleUpdateSkill}
          isPending={updatingSkill}
        />
      )}
      {showAddIndustry && (
        <ItemFormModal
          itemType="Industry"
          title="Add New Industry"
          onClose={() => setShowAddIndustry(false)}
          onSubmit={handleCreateIndustry}
          isPending={creatingIndustry}
        />
      )}
      {editingIndustry && (
        <ItemFormModal
          item={editingIndustry}
          itemType="Industry"
          title="Edit Industry"
          onClose={() => setEditingIndustry(null)}
          onSubmit={handleUpdateIndustry}
          isPending={updatingIndustry}
        />
      )}
    </div>
  );
}
