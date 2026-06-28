import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChangePasswordModal from '../ui/ChangePasswordModal';
import LogoutModal from '../ui/LogoutModal';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsLg(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const email = user?.email ?? '';
  const namePart = email.split('@')[0];
  const initials = namePart.slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onChangePassword={() => setShowPasswordModal(true)}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Main content area */}
      <div
        style={{ marginLeft: isLg ? (sidebarCollapsed ? '84px' : '272px') : 0 }}
        className="min-h-screen flex flex-col transition-all duration-300"
      >
        <Topbar
          onMenuClick={() => {
            if (isLg) setSidebarCollapsed((collapsed) => !collapsed);
            else setSidebarOpen(true);
          }}
        />

        {/* Page content */}
        <main
          className="p-6 lg:p-8 flex-1 max-w-screen-2xl mx-auto w-full"
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="w-10 h-10 border-[3px] border-solid border-blue-100 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          userName={namePart || 'User'}
          userEmail={email}
          userInitials={initials || 'U'}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {showLogoutModal && (
        <LogoutModal onClose={() => setShowLogoutModal(false)} />
      )}
    </div>
  );
}
