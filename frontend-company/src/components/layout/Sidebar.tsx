import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userName: string;
  userRole: string;
  userInitials: string;
  onChangePassword: () => void;
}

const NAV_ITEMS = {
  main: [
    { to: ROUTES.DASHBOARD, icon: 'fa-th-large', label: 'Dashboard' },
    { to: ROUTES.JOBS, icon: 'fa-briefcase', label: 'Jobs' },
    { to: ROUTES.APPLICATIONS, icon: 'fa-file-alt', label: 'Applications' },
    { to: ROUTES.INTERVIEWS, icon: 'fa-calendar-check', label: 'Interviews' },
  ],
  communication: [
    { to: ROUTES.MESSAGES, icon: 'fa-comments', label: 'Messages' },
    { to: ROUTES.NOTIFICATIONS, icon: 'fa-bell', label: 'Notifications' },
  ],
  management: [
    { to: ROUTES.STAFF, icon: 'fa-users', label: 'Staff' },
    { to: ROUTES.PROFILE, icon: 'fa-building', label: 'Company Profile' },
    { to: ROUTES.SUBSCRIPTIONS, icon: 'fa-crown', label: 'Subscription' },
  ],
};

export default function Sidebar({ isOpen, onToggle, userName, userRole, userInitials, onChangePassword }: SidebarProps) {
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
          <span className="text-white font-bold text-xl">RecruitPro</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-semibold px-4 mt-4 mb-2">Main</div>
          {NAV_ITEMS.main.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => isOpen && onToggle()}>
              <i className={`fas ${item.icon} w-5 text-center`} />
              {item.label}
            </NavLink>
          ))}

          <div className="text-[0.7rem] uppercase tracking-wider text-gray-500 font-semibold px-4 mt-6 mb-2">Communication</div>
          {NAV_ITEMS.communication.map((item) => (
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
        </nav>

        <div
          className="mx-3 mb-4 p-3 rounded-lg bg-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={onChangePassword}
          title="Click to change password"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-gray-400 text-xs truncate">{userRole}</div>
          </div>
          <i className="fas fa-key text-gray-500 text-xs" />
        </div>
      </aside>
    </>
  );
}
