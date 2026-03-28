import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import {
  useCompanyProfile, useUpdateCompanyProfile, useUploadLogo,
  useCompanyAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress,
} from '../../hooks/useCompany';
import type { CompanyProfileUpdateRequest, CompanyAddressRequest } from '../../types/company';

export default function CompanyProfilePage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: profile, isLoading } = useCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();
  const uploadLogo = useUploadLogo();
  const { data: addresses } = useCompanyAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

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
      <div className="p-6 text-center text-gray-400">Loading...</div>
    </>
  );

  return (
    <>
      <Topbar title="Company Profile" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-6">
        {profileMsg && (
          <div className={`px-4 py-3 rounded-xl text-sm ${profileMsg.includes('success') ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {profileMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6 flex flex-col items-center">
            <div className="w-28 h-28 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 overflow-hidden">
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-building text-3xl text-gray-300" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{profile?.name}</h3>
            {profile?.isVerified && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary font-medium">
                <i className="fas fa-check-circle" /> Verified Company
              </span>
            )}
            <label className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition-colors">
              <i className="fas fa-camera mr-1" /> Upload Logo
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-50">
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Company Information</h3>
              {!editMode && (
                <button className="px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors" onClick={() => { setEditMode(true); reset({ name: profile?.name, website: profile?.website, description: profile?.description }); }}>
                  <i className="fas fa-pen mr-1" /> Edit
                </button>
              )}
            </div>
            {editMode ? (
              <form onSubmit={handleSubmit(handleProfileSave)} className="p-5 space-y-4">
                <div>
                  <label className="block text-md font-medium mb-1.5">Company Name <span className="text-red-500">*</span></label>
                  <input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" {...register('name', { required: true })} />
                </div>
                <div>
                  <label className="block text-md font-medium mb-1.5">Website</label>
                  <input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" {...register('website')} />
                </div>
                <div>
                  <label className="block text-md font-medium mb-1.5">Description</label>
                  <textarea className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 min-h-[120px]" {...register('description')} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50" onClick={() => setEditMode(false)}>Cancel</button>
                  <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors" disabled={updateProfile.isPending}>
                    <i className="fas fa-save mr-1" /> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4">
                <div><span className="text-xs text-gray-400 uppercase tracking-wider">Company Name</span><p className="text-sm text-gray-900 font-medium mt-1">{profile?.name || '—'}</p></div>
                <div><span className="text-xs text-gray-400 uppercase tracking-wider">Website</span><p className="text-sm text-gray-900 mt-1">{profile?.website || '—'}</p></div>
                <div><span className="text-xs text-gray-400 uppercase tracking-wider">Description</span><p className="text-sm text-gray-600 mt-1 leading-relaxed">{profile?.description || '—'}</p></div>
                {/* <div><span className="text-xs text-gray-400 uppercase tracking-wider">Member Since</span><p className="text-sm text-gray-900 mt-1">{profile?.createdAt || '—'}</p></div> */}
              </div>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900"><i className="fas fa-map-marker-alt text-primary mr-2" />Company Addresses</h3>
            <button className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors" onClick={() => { setAddrModal({ open: true }); addrForm.reset({ label: '', addressLine: '', city: '', country: '', isDefault: false }); }}>
              <i className="fas fa-plus mr-1" /> Add Address
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addresses?.map((addr) => (
              <div key={addr.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow relative">
                {addr.isDefault && <span className="absolute top-3 right-3 text-[0.65rem] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Default</span>}
                <h4 className="text-md font-semibold text-gray-900">{addr.label}</h4>
                <p className="text-sm text-gray-500 mt-1">{addr.addressLine}</p>
                <p className="text-sm text-gray-400">{addr.city}, {addr.country}</p>
                <div className="flex gap-2 mt-3">
                  <button className="border border-gray-200 rounded-xl px-2 py-1 text-md text-primary hover:underline" onClick={() => { setAddrModal({ open: true, editing: addr.id }); addrForm.reset(addr); }}>Edit</button>
                  {/* {!addr.isDefault && <button className="text-xs text-gray-400 hover:text-primary" onClick={() => setDefault.mutate(addr.id)}>Set Default</button>} */}
                  {!addr.isDefault && <button className="border border-gray-200 rounded-xl px-2 py-1 text-md text-red-400 hover:text-red-600" onClick={() => handleAddrDelete(addr.id)}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Address Modal */}
        {addrModal.open && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setAddrModal({ open: false })}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold">{addrModal.editing ? 'Edit Address' : 'Add Address'}</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setAddrModal({ open: false })}><i className="fas fa-times" /></button>
              </div>
              <form onSubmit={addrForm.handleSubmit(handleAddrSave)} className="p-5 space-y-4">
                <div><label className="block text-sm font-medium mb-1.5">Label <span className="text-red-500">*</span></label><input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="e.g. Headquarters" {...addrForm.register('label', { required: true })} /></div>
                <div><label className="block text-sm font-medium mb-1.5">Address Line <span className="text-red-500">*</span></label><input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="Street, district..." {...addrForm.register('addressLine', { required: true })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1.5">City <span className="text-red-500">*</span></label><input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" {...addrForm.register('city', { required: true })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Country <span className="text-red-500">*</span></label><input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" {...addrForm.register('country', { required: true })} /></div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-primary" {...addrForm.register('isDefault')} /><span className="text-sm text-gray-600">Set as default address</span></label>
              </form>
              <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50" onClick={() => setAddrModal({ open: false })}>Cancel</button>
                <button className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover" onClick={addrForm.handleSubmit(handleAddrSave)}>
                  {addrModal.editing ? 'Update' : 'Add'} Address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
