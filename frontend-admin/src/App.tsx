import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import { ROUTES } from './constants';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const CompaniesPage = lazy(() => import('./pages/companies/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('./pages/companies/CompanyDetailPage'));
const JobsPage = lazy(() => import('./pages/jobs/JobsPage'));
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'));
const SubscriptionsPage = lazy(() => import('./pages/subscriptions/SubscriptionsPage'));

const Loader = () => (
  <div className="flex items-center justify-center h-screen bg-[#f4f6fa]">
    <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.USERS} element={<UsersPage />} />
          <Route path={ROUTES.COMPANIES} element={<CompaniesPage />} />
          <Route path={`${ROUTES.COMPANIES}/:id`} element={<CompanyDetailPage />} />
          <Route path={ROUTES.JOBS} element={<JobsPage />} />
          <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
          <Route path={ROUTES.SUBSCRIPTIONS} element={<SubscriptionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

