import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import {
  useCompanyProfile, useUpdateCompanyProfile, useUploadLogo,
  useCompanyAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress,
} from '../../hooks/useCompany';
import { useCountries, useCities } from '../../hooks/useLocation';
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
  const { data: allCountries } = useCountries();
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const { data: citiesForCountry } = useCities(selectedCountryId);

  useEffect(() => {
    if (!addrModal.open) {
      setSelectedCountryId(null);
    }
  }, [addrModal.open]);

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
    const selectedCountry = allCountries?.find(c => c.id === selectedCountryId);
    const selectedCity = citiesForCountry?.find(c => c.id === data.cityId);
    const payload: CompanyAddressRequest = {
      label: data.label,
      addressLine: data.addressLine,
      city: selectedCity?.name ?? '',
      country: selectedCountry?.name ?? '',
      countryId: selectedCountryId ?? undefined,
      cityId: data.cityId,
      isDefault: Boolean(data.isDefault),
    };

    if (addrModal.editing) {
      await updateAddress.mutateAsync({ id: addrModal.editing, data: payload });
    } else {
      await createAddress.mutateAsync(payload);
    }
    setAddrModal({ open: false });
    setSelectedCountryId(null);
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
          <div className="relative group">
            {/* Floating glow behind card */}
            <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-emerald-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-all duration-300 overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

              {/* Logo */}
              <div className="relative w-24 h-24 mt-2 mb-4">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-dashed border-emerald-300 shadow-lg group-hover:border-emerald-400 transition-colors overflow-hidden flex items-center justify-center">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-building text-3xl text-emerald-400" />
                  )}
                </div>
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-200 cursor-pointer">
                  <i className="fas fa-camera text-white opacity-0 group-hover:opacity-100 transition-opacity text-base" />
                </div>
              </div>

              {profile?.isVerified && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold rounded-full mb-3">
                  <i className="fas fa-shield-halved text-[10px]" />
                  Verified Company
                </div>
              )}
              <h3 className="text-base font-bold text-gray-900 mb-1">{profile?.name || 'Company'}</h3>
              <p className="text-xs text-gray-400 mb-4">Company Logo</p>
              <label className="w-full mt-auto px-4 py-2.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl text-sm font-bold cursor-pointer hover:from-primary-hover hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-px">
                <i className="fas fa-cloud-upload-alt text-xs" />
                Upload Logo
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          {/* Profile Info Card */}
          <div className="lg:col-span-2 relative group">
            {/* Glow on hover */}
            <div className="absolute -inset-2 bg-gradient-to-br from-primary/10 to-emerald-400/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-300">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white relative overflow-hidden">
                {/* Subtle left gradient bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-emerald-400 to-primary" />
                <div className="flex items-center gap-3 ml-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-md">
                    <i className="fas fa-building text-white text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-none">Company Information</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Core details about your organization</p>
                  </div>
                </div>
                {!editMode && (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary font-semibold bg-primary/5 hover:bg-primary/10 rounded-xl transition-all hover:-translate-y-px"
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
                  {/* Name */}
                  <div className="flex items-start gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover/item:bg-blue-100 transition-colors">
                      <i className="fas fa-building text-sm" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name</div>
                      <p className="text-sm font-bold text-gray-900">{profile?.name || '—'}</p>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-start gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 group-hover/item:bg-purple-100 transition-colors">
                      <i className="fas fa-globe text-sm" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Website</div>
                      {profile?.website ? (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                          <span>{profile.website}</span>
                          <i className="fas fa-external-link-alt text-[10px]" />
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Not provided</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex items-start gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover/item:bg-amber-100 transition-colors">
                      <i className="fas fa-align-left text-sm" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</div>
                      {profile?.description ? (
                        <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No description yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Addresses ───────────────────────────────── */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/30 to-primary/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-primary to-primary" />
              <div className="flex items-center gap-3 ml-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                  <i className="fas fa-map-location-dot text-white text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-none">Company Addresses</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {addresses && addresses.length > 0
                      ? `Manage your ${addresses.length} office location${addresses.length > 1 ? 's' : ''}`
                      : 'Add your office locations'}
                  </p>
                </div>
                {addresses && addresses.length > 0 && (
                  <span className="ml-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-600 text-[11px] font-bold rounded-full">
                    {addresses.length}
                  </span>
                )}
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-primary-hover hover:to-emerald-600 hover:-translate-y-px hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setAddrModal({ open: true });
                  setSelectedCountryId(null);
                  addrForm.reset({ label: '', addressLine: '', city: '', country: '', countryId: undefined, cityId: undefined as unknown as number, isDefault: false });
                }}
              >
                <i className="fas fa-plus text-xs" />
                Add Address
              </button>
            </div>

            <div className="p-6">
              {!addresses?.length ? (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-emerald-50/50 border-2 border-dashed border-gray-200 text-center py-14">
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full opacity-40 blur-xl" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/5 rounded-full opacity-60 blur-2xl" />

                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-5 shadow-inner">
                      <i className="fas fa-map-location-dot text-3xl text-primary/60" />
                    </div>
                    <h4 className="text-base font-bold text-gray-700 mb-2">No Locations Yet</h4>
                    <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Add your first office or branch location to help job seekers find you.</p>
                    <button
                      className="px-6 py-2.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-primary-hover hover:to-emerald-600 hover:-translate-y-px hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
                      onClick={() => {
                        setAddrModal({ open: true });
                        setSelectedCountryId(null);
                        addrForm.reset({ label: '', addressLine: '', city: '', country: '', countryId: undefined, cityId: undefined as unknown as number, isDefault: false });
                      }}
                    >
                      <i className="fas fa-plus text-xs" />
                      Add Your First Location
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {addresses.map((addr, idx) => (
                    <div
                      key={addr.id}
                      className={`group/addr relative border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden ${
                        addr.isDefault
                          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-white'
                          : 'border-gray-100 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      {/* Top accent for default */}
                      {addr.isDefault && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-primary to-emerald-400" />
                      )}

                      {/* Subtle number decoration */}
                      <div className={`absolute top-3 right-4 text-5xl font-black leading-none select-none ${
                        addr.isDefault ? 'text-emerald-100' : 'text-gray-50'
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Default badge */}
                      {addr.isDefault && (
                        <span className="absolute -top-2.5 left-4 px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold rounded-full shadow-md z-10">
                          <i className="fas fa-star text-[9px] mr-0.5" />
                          Default
                        </span>
                      )}

                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 mt-1">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                            addr.isDefault
                              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                              : 'bg-gradient-to-br from-primary/10 to-emerald-50 text-primary'
                          }`}>
                            <i className={`fas fa-building text-xs ${addr.isDefault ? 'text-white' : ''}`} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight">{addr.label}</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {addr.isDefault ? 'Primary location' : 'Office location'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Address details */}
                      <div className="space-y-2 mb-4 pl-0.5">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                            <i className="fas fa-map-pin text-[10px] text-gray-400" />
                          </div>
                          <span className="leading-snug">{addr.addressLine}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <i className="fas fa-city text-[10px] text-gray-400" />
                          </div>
                          <span>{addr.city}, {addr.country}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <button
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-primary-hover hover:to-emerald-600 hover:shadow-md hover:-translate-y-px transition-all duration-200"
                          onClick={() => {
                            setAddrModal({ open: true, editing: addr.id });
                            setSelectedCountryId(addr.countryId ?? null);
                            addrForm.reset(addr);
                          }}
                        >
                          <i className="fas fa-pen-to-square text-[11px]" />
                          Edit
                        </button>
                        {!addr.isDefault && (
                          <button
                            className="group inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-50 border border-red-100 hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 hover:text-white hover:border-transparent hover:shadow-md hover:-translate-y-px transition-all duration-200"
                            onClick={() => handleAddrDelete(addr.id)}
                          >
                            <i className="fas fa-trash-can text-[11px]" />
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
        </div>

        {/* Address Modal */}
        {addrModal.open && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setAddrModal({ open: false })}
          >
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in overflow-hidden">
              {/* Top gradient bar */}
              <div className="h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-md">
                    <i className="fas fa-map-location-dot text-white text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-none">
                      {addrModal.editing ? 'Edit Address' : 'Add New Location'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {addrModal.editing ? 'Update location details' : 'Add a new office or branch'}
                    </p>
                  </div>
                </div>
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all" onClick={() => setAddrModal({ open: false })}>
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              <form onSubmit={addrForm.handleSubmit(handleAddrSave)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Label <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="e.g. Headquarters, Branch Office"
                    {...addrForm.register('label', { required: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address Line <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Street, district, building..."
                    {...addrForm.register('addressLine', { required: true })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country <span className="text-red-500">*</span></label>
                    <select
                      className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                      value={selectedCountryId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedCountryId(val);
                        addrForm.setValue('cityId', undefined as unknown as number);
                      }}
                    >
                      <option value="">Select country...</option>
                      {allCountries?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">City <span className="text-red-500">*</span></label>
                    <select
                      className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                      disabled={!selectedCountryId}
                      {...addrForm.register('cityId', { required: true, valueAsNumber: true })}
                    >
                      <option value="">Select city...</option>
                      {citiesForCountry?.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group/checkbox p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" {...addrForm.register('isDefault')} />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-all" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Set as default address</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all" onClick={() => setAddrModal({ open: false })}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-primary-hover hover:to-emerald-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-px"
                  >
                    <i className="fas fa-check text-xs" />
                    {addrModal.editing ? 'Update Location' : 'Add Location'}
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
