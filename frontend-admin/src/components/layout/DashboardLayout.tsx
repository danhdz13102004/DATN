import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import LogoutModal from '../ui/LogoutModal';
import { useAuthStore } from '../../store/authStore';

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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();

  const userName = user?.email || 'Admin';
  const userInitials = userName
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
        userInitials={userInitials}
        onLogout={() => setShowLogoutModal(true)}
      />

      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        <Suspense fallback={<ContentLoader />}>
          <div key={pathname} className="flex flex-col flex-1 animate-fade-in">
            <Outlet context={{ onMenuToggle: () => setSidebarOpen(!sidebarOpen) }} />
          </div>
        </Suspense>
      </div>

      {showLogoutModal && (
        <LogoutModal onClose={() => setShowLogoutModal(false)} />
      )}
    </div>
  );
}
