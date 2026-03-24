import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import { ROUTES } from './constants';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));

const DashboardPlaceholder = () => <div style={{ padding: 40 }}>Company Dashboard — Coming Soon</div>;

function App() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
        <Route path={ROUTES.DASHBOARD} element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>} />
        <Route path={ROUTES.HOME} element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>} />
      </Routes>
    </Suspense>
  );
}

export default App;
