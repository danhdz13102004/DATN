import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuthStore } from '../../store/authStore';

export default function PublicLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#f4f6fa' }}>
      {/* Public Topbar */}
      <header style={{
        height: '64px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e6ed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/jobs')}>
          <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
            <circle cx="32" cy="32" r="30" fill="#4fd1d9"/>
            <path d="M39.6 18.2c1.1.5 2 1.1 2.7 2c.6.7 1.1 1.5 1.5 2.4c.4.9.5 1.9.5 3.1c0 1.4-.3 2.7-1 4.1s-1.8 2.3-3.4 2.8c1.3.5 2.3 1.3 2.8 2.3c.6 1 .8 2.5.8 4.5v1.9c0 1.3.1 2.2.2 2.7c.2.7.5 1.3 1.1 1.7v.7h-6.7c-.2-.6-.3-1.2-.4-1.6c-.2-.8-.2-1.6-.3-2.5v-2.7c0-1.8-.3-3.1-1-3.7c-.6-.6-1.8-.9-3.5-.9H27v11.4h-5.9v-29H35c2 .1 3.6.4 4.6.8m-12.5 4.3v7.8h6.5c1.3 0 2.3-.2 2.9-.5c1.1-.6 1.7-1.6 1.7-3.3c0-1.8-.6-2.9-1.7-3.5c-.6-.3-1.6-.5-2.8-.5h-6.6" fill="#ffffff"/>
          </svg>
          <span style={{ color: '#1a1d26', fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
            RecruitPro
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e6ed',
                background: 'white',
                color: '#5f6780',
                fontSize: '0.83rem',
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#4287f5'; (e.currentTarget as HTMLButtonElement).style.color = '#4287f5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e6ed'; (e.currentTarget as HTMLButtonElement).style.color = '#5f6780'; }}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate(ROUTES.LOGIN, { state: { from: '/jobs' } })}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e6ed',
                  background: 'white',
                  color: '#5f6780',
                  fontSize: '0.83rem',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#4287f5'; (e.currentTarget as HTMLButtonElement).style.color = '#4287f5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e6ed'; (e.currentTarget as HTMLButtonElement).style.color = '#5f6780'; }}
              >
                Login
              </button>
              <button
                onClick={() => navigate(ROUTES.SIGNUP, { state: { from: '/jobs' } })}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#4287f5',
                  color: 'white',
                  fontSize: '0.83rem',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#2b6de0'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#4287f5'}
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      {/* Page content */}
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
  );
}
