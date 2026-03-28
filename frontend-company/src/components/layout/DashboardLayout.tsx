import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChangePasswordModal from '../ui/ChangePasswordModal';
import { useUserProfile } from '../../hooks/useCompany';

const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center p-10">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading...</span>
    </div>
  </div>
);

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { data: user } = useUserProfile();
  const { pathname } = useLocation();

  const userName = user?.fullName || 'Loading...';
  const userRole = user?.companyRole || '';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        onChangePassword={() => setShowPasswordModal(true)}
      />

      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        <Suspense fallback={<ContentLoader />}>
          <div key={pathname} className="flex flex-col flex-1 animate-fade-in">
            <Outlet context={{ onMenuToggle: () => setSidebarOpen(!sidebarOpen), user }} />
          </div>
        </Suspense>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          userName={userName}
          userEmail={user?.email || ''}
          userInitials={userInitials}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}
