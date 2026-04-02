import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuthStore } from '../../store/authStore';

// Match design CSS exactly
const S = {
  sidebarBg: '#0f1117',
  sidebarHover: '#1a1d27',
  sidebarActive: '#232735',
  sidebarText: '#9ca3b0',
  sidebarTextActive: '#ffffff',
  primary: '#4287f5',
  borderAlpha: 'rgba(255,255,255,0.06)',
};

const MAIN_ITEMS = [
  { label: 'Dashboard',       icon: 'fa-th-large',       path: ROUTES.DASHBOARD },
  { label: 'Browse Jobs',     icon: 'fa-briefcase',      path: ROUTES.JOBS },
  { label: 'My Applications', icon: 'fa-file-alt',       path: ROUTES.APPLICATIONS },
  { label: 'Interviews',      icon: 'fa-calendar-check', path: ROUTES.INTERVIEWS },
];
const COMMUNICATION_ITEMS = [
  { label: 'Messages',      icon: 'fa-comments', path: ROUTES.MESSAGES },
  { label: 'Notifications', icon: 'fa-bell',     path: ROUTES.NOTIFICATIONS },
];
const PERSONAL_ITEMS = [
  { label: 'My Resumes', icon: 'fa-file-pdf',    path: ROUTES.RESUMES },
  { label: 'Profile',     icon: 'fa-user-circle', path: ROUTES.PROFILE },
];

interface NavItem { label: string; icon: string; path: string; }
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

function NavLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: S.sidebarText, opacity: 0.5,
      padding: '18px 12px 8px',
    }}>
      {text}
    </div>
  );
}

function NavItem({ item, active, onClose }: { item: NavItem; active: boolean; onClose: () => void }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      style={({ isActive: _ }) => ({
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', borderRadius: '6px',
        color: active ? S.primary : S.sidebarText,
        background: active ? S.sidebarActive : 'transparent',
        fontSize: '0.92rem', fontWeight: active ? 500 : 400,
        textDecoration: 'none', marginBottom: '2px',
        transition: 'all 0.2s ease',
      })}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = S.sidebarHover;
          (e.currentTarget as HTMLElement).style.color = S.sidebarTextActive;
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = S.sidebarText;
        }
      }}
    >
      <i
        className={`fas ${item.icon}`}
        style={{
          width: '20px', textAlign: 'center', fontSize: '1rem',
          opacity: active ? 1 : 0.7, color: active ? S.primary : 'inherit',
        }}
      />
      {item.label}
    </NavLink>
  );
}

export default function Sidebar({ isOpen, onClose, onChangePassword, onLogout }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === ROUTES.DASHBOARD) return location.pathname === ROUTES.DASHBOARD || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const email = user?.email ?? '';
  const namePart = email.split('@')[0];
  const initials = namePart.slice(0, 2).toUpperCase();

  const allGroups = [
    { label: 'Main', items: MAIN_ITEMS },
    { label: 'Communication', items: COMMUNICATION_ITEMS },
    { label: 'Personal', items: PERSONAL_ITEMS },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
          className="lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '260px', background: S.sidebarBg,
          display: 'flex', flexDirection: 'column',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s ease',
        }}
        className={`${isOpen ? '' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Brand */}
        <div style={{
          height: '64px', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 24px', borderBottom: `1px solid ${S.borderAlpha}`,
        }}>
          <div style={{
            width: '36px', height: '36px', background: S.primary,
            borderRadius: '6px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem',
            flexShrink: 0,
          }}>J</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
            JobSeeker
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {allGroups.map(({ label, items }) => (
            <div key={label}>
              <NavLabel text={label} />
              {items.map((item) => (
                <NavItem key={item.path} item={item} active={isActive(item.path)} onClose={onClose} />
              ))}
            </div>
          ))}
        </nav>

        {/* User profile with popup menu */}
        <div style={{ padding: '12px', borderTop: `1px solid ${S.borderAlpha}`, position: 'relative' }} ref={menuRef}>
          {/* Popup menu — appears above the user card */}
          {showUserMenu && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% - 12px)', left: '12px', right: '12px',
              background: '#2a2e39', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 200,
              animation: 'fadeInUp 0.15s ease',
            }}>
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', fontSize: '0.875rem', color: '#d1d5db',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db';
                }}
                onClick={() => { setShowUserMenu(false); onChangePassword(); }}
              >
                <i className="fas fa-key" style={{ width: '16px', textAlign: 'center' }} />
                Change Password
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', fontSize: '0.875rem', color: '#f87171',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                }}
                onClick={() => { setShowUserMenu(false); onLogout(); }}
              >
                <i className="fas fa-sign-out-alt" style={{ width: '16px', textAlign: 'center' }} />
                Logout
              </button>
            </div>
          )}

          {/* User card trigger */}
          <div
            style={{
              padding: '10px 12px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
              background: showUserMenu ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              transition: 'background 0.2s',
            }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            onMouseEnter={e => {
              if (!showUserMenu) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              if (!showUserMenu) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            }}
            title="User Menu"
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: S.primary, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 600,
              fontSize: '0.85rem', flexShrink: 0,
            }}>
              {initials || <i className="fas fa-user" style={{ fontSize: '0.85rem' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {namePart || 'User'}
              </div>
              <div style={{ fontSize: '0.78rem', color: S.sidebarText }}>Job Seeker</div>
            </div>
            <i
              className={`fas fa-chevron-${showUserMenu ? 'down' : 'up'}`}
              style={{ fontSize: '0.7rem', color: S.sidebarText, transition: 'transform 0.2s' }}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
