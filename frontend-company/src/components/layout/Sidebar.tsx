import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { ROUTES } from '../../constants';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userName: string;
  userRole: string;
  userInitials: string;
  onChangePassword: () => void;
  onLogout: () => void;
}

const MAIN_ITEMS = [
  { label: 'Dashboard', icon: 'fa-th-large', path: ROUTES.DASHBOARD },
  { label: 'Jobs', icon: 'fa-briefcase', path: ROUTES.JOBS },
  { label: 'Applications', icon: 'fa-file-alt', path: ROUTES.APPLICATIONS },
  { label: 'Interviews', icon: 'fa-calendar-check', path: ROUTES.INTERVIEWS },
];

const COMMUNICATION_ITEMS = [
  { label: 'Messages', icon: 'fa-comments', path: ROUTES.MESSAGES },
  { label: 'Notifications', icon: 'fa-bell', path: ROUTES.NOTIFICATIONS },
];

const MANAGEMENT_ITEMS = [
  { label: 'Staff', icon: 'fa-users', path: ROUTES.STAFF },
  { label: 'Company Profile', icon: 'fa-building', path: ROUTES.PROFILE },
  { label: 'Subscription', icon: 'fa-crown', path: ROUTES.SUBSCRIPTIONS },
];

interface NavItem { label: string; icon: string; path: string; }

function NavLabel({ text }: { text: string }) {
  return (
    <div className="px-3 pt-6 pb-2">
      <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">
        {text}
      </span>
    </div>
  );
}

function NavItem({ item, active, onClose }: { item: NavItem; active: boolean; onClose: () => void }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={`sidebar-nav-item mx-2 mb-0.5 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${active ? 'active' : ''}`}
    >
      <span className="nav-icon-wrap">
        <i className={`fas ${item.icon}`} />
      </span>
      <span className="font-medium text-sm flex-1">{item.label}</span>
      {active && (
        <span className="nav-active-dot w-1.5 h-1.5 rounded-full flex-shrink-0" />
      )}
    </NavLink>
  );
}

export default function Sidebar({ isOpen, onToggle, userName, userRole, userInitials, onChangePassword, onLogout }: SidebarProps) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const allGroups = [
    { label: 'Main', items: MAIN_ITEMS },
    { label: 'Communication', items: COMMUNICATION_ITEMS },
    { label: 'Management', items: MANAGEMENT_ITEMS },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[272px] bg-white flex flex-col z-50 transition-transform duration-300 ease-out shadow-xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ borderRight: '1px solid #E8EDF5' }}
      >
        {/* Brand Header */}
        <div className="h-[68px] flex items-center gap-3 px-5 border-b border-gray-100/80 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
            <i className="fas fa-rocket text-white text-sm" />
          </div>
          <span className="text-[1.1rem] font-bold text-gray-900 tracking-tight">
            RecruitPro
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {allGroups.map(({ label, items }) => (
            <div key={label}>
              <NavLabel text={label} />
              {items.map((item) => (
                <NavItem key={item.path} item={item} active={isActive(item.path)} onClose={onToggle} />
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile Area */}
        <div className="flex-shrink-0 border-t border-gray-100 p-2 relative" ref={menuRef}>
          {/* Popup Menu */}
          {showUserMenu && (
            <div
              className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 animate-scaleIn"
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-green-50 hover:text-primary transition-colors duration-150 text-left"
                onClick={() => { setShowUserMenu(false); onChangePassword(); }}
              >
                <i className="fas fa-key w-4 text-center text-gray-400" />
                <span className="font-medium">Change Password</span>
              </button>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150 text-left"
                onClick={() => { setShowUserMenu(false); onLogout(); }}
              >
                <i className="fas fa-sign-out-alt w-4 text-center" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}

          {/* User Card */}
          <button
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 text-left ${
              showUserMenu
                ? 'bg-green-50 ring-2 ring-primary/20'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
              style={{ boxShadow: '0 3px 8px rgba(16,185,129,0.3)' }}
            >
              {userInitials || <i className="fas fa-user text-sm" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {userName || 'User'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {userRole}
              </div>
            </div>
            <i
              className={`fas fa-chevron-up text-[10px] text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-nav-item {
          text-decoration: none;
          color: #475569;
        }
        .sidebar-nav-item:hover:not(.active) {
          background: #F8FAFC;
          color: #1E293B;
        }
        .sidebar-nav-item.active {
          background: #ECFDF5;
          color: #059669;
        }
        .sidebar-nav-item.active .nav-icon-wrap {
          color: #059669;
        }
        .nav-icon-wrap {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-size: 0.95rem;
          color: #94A3B8;
          flex-shrink: 0;
          background: transparent;
          transition: all 0.15s ease;
        }
        .sidebar-nav-item:hover:not(.active) .nav-icon-wrap {
          background: #ECFDF5;
          color: #10B981;
        }
        .sidebar-nav-item.active .nav-icon-wrap {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .nav-active-dot {
          background: #059669;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
