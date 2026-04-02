import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '../../hooks/useChangePassword';
import type { ChangePasswordRequest } from '../../types/auth';

interface ChangePasswordModalProps {
  userName: string;
  userEmail: string;
  userInitials: string;
  onClose: () => void;
}

export default function ChangePasswordModal({ userName, userEmail, userInitials, onClose }: ChangePasswordModalProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ChangePasswordRequest & { confirmPassword: string }>();
  const changePassword = useChangePassword();
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: ChangePasswordRequest & { confirmPassword: string }) => {
    setError('');
    try {
      await changePassword.mutateAsync({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to change password.';
      setError(msg);
    }
  };

  const togglePwd = (field: 'current' | 'new' | 'confirm') =>
    setShowPwd((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <i className="fas fa-lock text-primary" /> Change Password
          </h3>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
              {userInitials}
            </div>
            <div>
              <div className="font-semibold text-sm">{userName}</div>
              <div className="text-xs text-gray-400">{userEmail}</div>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 border border-green-200 rounded-lg px-4 py-2.5 text-sm">Password changed successfully!</div>}

          {(['current', 'new', 'confirm'] as const).map((field) => {
            const fieldName = field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword';
            const label = field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm New Password';
            const placeholder = field === 'current' ? 'Enter your current password' : field === 'new' ? 'Enter a new password' : 'Re-enter new password';
            return (
              <div key={field}>
                <label className="block text-sm font-medium mb-1.5">{label} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPwd[field] ? 'text' : 'password'}
                    className={`w-full px-3.5 py-2.5 pr-10 border-[1.5px] rounded-xl text-sm bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors[fieldName] ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder={placeholder}
                    {...register(fieldName, {
                      required: `${label} is required`,
                      ...(field === 'new' && {
                        minLength: { value: 8, message: 'Minimum 8 characters' },
                        pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, message: 'Must include uppercase, lowercase, number and special character' }
                      }),
                      ...(field === 'confirm' && {
                        validate: (val: string) => val === watch('newPassword') || 'Passwords do not match'
                      }),
                    })}
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm p-1" onClick={() => togglePwd(field)}>
                    <i className={`fas ${showPwd[field] ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                {field === 'new' && <div className="text-xs text-gray-400 mt-1">Minimum 8 characters with uppercase, lowercase, number, and special character</div>}
                {errors[fieldName] && <span className="text-red-500 text-xs mt-0.5 block">{errors[fieldName]?.message}</span>}
              </div>
            );
          })}
        </form>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60"
            onClick={handleSubmit(onSubmit)}
            disabled={changePassword.isPending}
          >
            <i className="fas fa-key" /> Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
