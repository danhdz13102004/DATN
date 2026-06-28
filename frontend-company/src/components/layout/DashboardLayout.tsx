import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChangePasswordModal from '../ui/ChangePasswordModal';
import LogoutModal from '../ui/LogoutModal';
import { useUserProfile } from '../../hooks/useCompany';
import LoadingSpinner from '../common/LoadingSpinner';

const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center p-10">
    <LoadingSpinner size="lg" label="Loading..." />
  </div>
);

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { data: user } = useUserProfile();
  const { pathname } = useLocation();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const userName = user?.fullName || 'Loading...';
  const userRole = user?.companyRole || '';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-emerald-50/30">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        onChangePassword={() => setShowPasswordModal(true)}
        onLogout={() => setShowLogoutModal(true)}
      />

      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: isLg ? (sidebarCollapsed ? '84px' : '272px') : 0 }}
      >
        <Suspense fallback={<ContentLoader />}>
          <div key={pathname} className="flex flex-col flex-1 animate-fade-in">
            <Outlet
              context={{
                onMenuToggle: () => {
                  if (isLg) setSidebarCollapsed((collapsed) => !collapsed);
                  else setSidebarOpen((open) => !open);
                },
                user,
              }}
            />
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

      {showLogoutModal && (
        <LogoutModal onClose={() => setShowLogoutModal(false)} />
      )}
    </div>
  );
}
