import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChangePasswordModal from '../ui/ChangePasswordModal';
import LogoutModal from '../ui/LogoutModal';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="min-h-screen" style={{ background: '#f4f6fa', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onChangePassword={() => setShowPasswordModal(true)}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Content offset = exact sidebar width (260px) */}
      <div style={{ marginLeft: isLg ? '260px' : 0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ padding: '32px' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
              <div className="w-8 h-8 border-[3px] border-solid border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          }>
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
