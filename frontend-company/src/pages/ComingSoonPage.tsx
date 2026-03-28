import { useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';

const TITLES: Record<string, string> = {
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/staff': 'Staff Management',
  '/subscriptions': 'Subscription',
};

export default function ComingSoonPage() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Coming Soon';

  return (
    <>
      <Topbar title={title} onMenuToggle={() => {}} />
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-rocket text-3xl text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-500 leading-relaxed">
            This feature is currently under development and will be available in the next sprint. Stay tuned!
          </p>
        </div>
      </div>
    </>
  );
}
