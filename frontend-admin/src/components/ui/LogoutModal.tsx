import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { ROUTES } from '../../constants';

interface LogoutModalProps {
  onClose: () => void;
}

export default function LogoutModal({ onClose }: LogoutModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutStore = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      try {
        await authService.logout();
      } catch {
        // ignore API errors — log out regardless
      }
      logoutStore();
      navigate(ROUTES.LOGIN);
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-2">
            <i className="fas fa-sign-out-alt" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Confirm Logout</h3>
          <p className="text-gray-500 text-sm">
            Are you sure you want to log out of the admin panel?
          </p>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            onClick={onClose}
            disabled={isLoggingOut}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
