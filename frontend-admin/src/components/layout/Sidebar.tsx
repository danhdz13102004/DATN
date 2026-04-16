import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userName: string;
  userInitials: string;
  onLogout: () => void;
}

const NAV_ITEMS = {
  overview: [
    { to: ROUTES.DASHBOARD, icon: 'fa-th-large', label: 'Dashboard' },
  ],
  management: [
    { to: ROUTES.USERS, icon: 'fa-users', label: 'Users' },
    { to: ROUTES.COMPANIES, icon: 'fa-building', label: 'Companies' },
    { to: ROUTES.JOBS, icon: 'fa-briefcase', label: 'Jobs' },
    { to: ROUTES.APPLICATIONS, icon: 'fa-file-alt', label: 'Applications' },
  ],
  finance: [
    { to: ROUTES.SUBSCRIPTIONS, icon: 'fa-crown', label: 'Subscriptions' },
  ],
};

export default function Sidebar({ isOpen, onToggle, userName, userInitials, onLogout }: SidebarProps) {
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-gray-300 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-[260px] bg-[#1a1d26] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
            R
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">RecruitPro</div>
            <div className="text-[0.65rem] text-primary uppercase tracking-widest font-semibold">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-semibold px-4 mt-4 mb-2">Overview</div>
          {NAV_ITEMS.overview.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => isOpen && onToggle()}>
              <i className={`fas ${item.icon} w-5 text-center`} />
              {item.label}
            </NavLink>
          ))}

          <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-semibold px-4 mt-6 mb-2">Management</div>
          {NAV_ITEMS.management.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => isOpen && onToggle()}>
              <i className={`fas ${item.icon} w-5 text-center`} />
              {item.label}
            </NavLink>
          ))}

          <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-semibold px-4 mt-6 mb-2">Finance</div>
          {NAV_ITEMS.finance.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => isOpen && onToggle()}>
              <i className={`fas ${item.icon} w-5 text-center`} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="relative mx-3 mb-4" ref={menuRef}>
          {showUserMenu && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#2a2e39] rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 animate-fade-in">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
              >
                <i className="fas fa-sign-out-alt w-4 text-center" />
                Logout
              </button>
            </div>
          )}

          <div
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${showUserMenu ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{userName}</div>
              <div className="text-gray-400 text-xs">Administrator</div>
            </div>
            <i className={`fas fa-chevron-${showUserMenu ? 'down' : 'up'} text-gray-500 text-xs`} />
          </div>
        </div>
      </aside>
    </>
  );
}
