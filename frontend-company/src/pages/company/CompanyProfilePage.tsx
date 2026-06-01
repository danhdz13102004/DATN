import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import {
  useCompanyProfile, useUpdateCompanyProfile, useUploadLogo,
  useCompanyAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress,
} from '../../hooks/useCompany';
import type { CompanyProfileUpdateRequest, CompanyAddressRequest } from '../../types/company';
import PageHeader from '../../components/common/PageHeader';

export default function CompanyProfilePage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: profile, isLoading } = useCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();
  const uploadLogo = useUploadLogo();
  const { data: addresses } = useCompanyAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [editMode, setEditMode] = useState(false);
  const [addrModal, setAddrModal] = useState<{ open: boolean; editing?: string }>({ open: false });
  const { register, handleSubmit, reset } = useForm<CompanyProfileUpdateRequest>();
  const addrForm = useForm<CompanyAddressRequest>();
  const [profileMsg, setProfileMsg] = useState('');

  const handleProfileSave = async (data: CompanyProfileUpdateRequest) => {
    try {
      await updateProfile.mutateAsync(data);
      setProfileMsg('Profile updated successfully!');
      setEditMode(false);
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Failed to update profile.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
  };

  const handleAddrSave = async (data: CompanyAddressRequest) => {
    if (addrModal.editing) {
      await updateAddress.mutateAsync({ id: addrModal.editing, data });
    } else {
      await createAddress.mutateAsync(data);
    }
    setAddrModal({ open: false });
    addrForm.reset();
  };

  const handleAddrDelete = async (id: string) => {
    if (confirm('Delete this address?')) await deleteAddress.mutateAsync(id);
  };

  if (isLoading) return (
    <>
      <Topbar title="Company Profile" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-100 rounded-2xl" />
            <div className="lg:col-span-2 h-64 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Topbar title="Company Profile" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-full mx-8 space-y-6">

        <PageHeader title="Company Profile" description="Manage your company information and office locations" />

        {/* Success / Error message */}
        {profileMsg && (
          <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
            profileMsg.includes('success')
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            <i className={`fas ${profileMsg.includes('success') ? 'fa-check-circle' : 'fa-exclamation-circle'} text-xs`} />
            {profileMsg}
          </div>
        )}

        {/* ── Profile + Logo ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Card */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow duration-200">
            {/* Top accent */}
            <div className="absolute top-0 left-6 right-6 h-1 rounded-b-xl bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" style={{ marginTop: '-24px' }} />
            {/* Logo */}
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-emerald-200 shadow-sm group hover:border-emerald-400 transition-colors relative">
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-building text-3xl text-gray-300" />
              )}
              {/* Camera overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-200 rounded-2xl">
                <i className="fas fa-camera text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg" />
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{profile?.name || 'Company'}</h3>
            {profile?.isVerified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full mb-3">
                <i className="fas fa-check-circle text-[10px]" />
                Verified Company
              </span>
            )}
            <label className="mt-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm hover:shadow-md">
              <i className="fas fa-cloud-upload-alt text-xs" />
              Upload Logo
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>

          {/* Profile Info Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-primary to-emerald-400 rounded-full" />
                <h3 className="text-base font-bold text-gray-900">Company Information</h3>
              </div>
              {!editMode && (
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
                  onClick={() => {
                    setEditMode(true);
                    reset({ name: profile?.name, website: profile?.website, description: profile?.description });
                  }}
                >
                  <i className="fas fa-pen text-xs" />
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSubmit(handleProfileSave)} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    {...register('name', { required: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    {...register('website')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all min-h-[120px] resize-y"
                    {...register('description')}
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button type="button" className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60" disabled={updateProfile.isPending}>
                    <i className="fas fa-save text-xs" />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-5">
                {[
                  { label: 'Company Name', value: profile?.name || '—', key: 'name' },
                  { label: 'Website', value: profile?.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profile.website}</a>
                  ) : '—', key: 'website' },
                  { label: 'Description', value: profile?.description || '—', key: 'description' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{item.label}</div>
                    {typeof item.value === 'string' ? (
                      <p className={`text-sm ${item.key === 'description' ? 'text-gray-600 leading-relaxed' : 'text-gray-900 font-medium'}`}>{item.value}</p>
                    ) : (
                      item.value
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Addresses ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Company Addresses</h3>
              {addresses && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-semibold rounded-full">
                  {addresses.length}
                </span>
              )}
            </div>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200"
              onClick={() => {
                setAddrModal({ open: true });
                addrForm.reset({ label: '', addressLine: '', city: '', country: '', isDefault: false });
              }}
            >
              <i className="fas fa-plus text-xs" />
              Add Address
            </button>
          </div>

          <div className="p-6">
            {!addresses?.length ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-map-marker-alt text-2xl text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 mb-4">No addresses added yet.</p>
                <button
                  className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    setAddrModal({ open: true });
                    addrForm.reset({ label: '', addressLine: '', city: '', country: '', isDefault: false });
                  }}
                >
                  <i className="fas fa-plus mr-1.5 text-xs" />
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`group relative border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                      addr.isDefault
                        ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-teal-50/30'
                        : 'border-gray-100 hover:border-emerald-200'
                    }`}
                  >
                    {/* Default badge */}
                    {addr.isDefault && (
                      <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                        Default
                      </span>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <i className="fas fa-building text-xs" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">{addr.label}</h4>
                      </div>
                    </div>

                    {/* Address details */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-start gap-2 text-sm text-gray-500">
                        <i className="fas fa-map-pin text-gray-400 text-xs mt-1 shrink-0" />
                        <span>{addr.addressLine}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <i className="fas fa-city text-xs shrink-0" />
                        <span>{addr.city}, {addr.country}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        onClick={() => {
                          setAddrModal({ open: true, editing: addr.id });
                          addrForm.reset(addr);
                        }}
                      >
                        <i className="fas fa-pen text-[10px]" />
                        Edit
                      </button>
                      {!addr.isDefault && (
                        <button
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-100 rounded-lg text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                          onClick={() => handleAddrDelete(addr.id)}
                        >
                          <i className="fas fa-trash text-[10px]" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address Modal */}
        {addrModal.open && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setAddrModal({ open: false })}
          >
            <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <i className="fas fa-map-marker-alt text-sm" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    {addrModal.editing ? 'Edit Address' : 'Add Address'}
                  </h3>
                </div>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" onClick={() => setAddrModal({ open: false })}>
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              <form onSubmit={addrForm.handleSubmit(handleAddrSave)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Label <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="e.g. Headquarters"
                    {...addrForm.register('label', { required: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address Line <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Street, district..."
                    {...addrForm.register('addressLine', { required: true })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">City <span className="text-red-500">*</span></label>
                    <input
                      className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      {...addrForm.register('city', { required: true })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country <span className="text-red-500">*</span></label>
                    <input
                      className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      {...addrForm.register('country', { required: true })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary rounded" {...addrForm.register('isDefault')} />
                  <span className="text-sm text-gray-600">Set as default address</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setAddrModal({ open: false })}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2"
                    onClick={addrForm.handleSubmit(handleAddrSave)}
                  >
                    <i className="fas fa-check text-xs" />
                    {addrModal.editing ? 'Update' : 'Add'} Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
