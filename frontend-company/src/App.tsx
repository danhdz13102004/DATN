import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import { ROUTES } from './constants';

/* Layout — NOT lazy, so sidebar/topbar never unmount */
import DashboardLayout from './components/layout/DashboardLayout';

/* Auth Pages */
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));

/* Dashboard */
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

/* Company */
const CompanyProfilePage = lazy(() => import('./pages/company/CompanyProfilePage'));
const StaffManagementPage = lazy(() => import('./pages/company/staff/StaffManagementPage'));

/* Jobs */
const JobsPage = lazy(() => import('./pages/jobs/JobsPage'));
const JobCreatePage = lazy(() => import('./pages/jobs/JobCreatePage'));
const JobDetailPage = lazy(() => import('./pages/jobs/JobDetailPage'));

/* Applications */
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('./pages/applications/ApplicationDetailPage'));

/* Interviews */
const InterviewsPage = lazy(() => import('./pages/interviews/InterviewsPage'));
const InterviewSchedulePage = lazy(() => import('./pages/interviews/InterviewSchedulePage'));

/* Placeholders */
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));

const AuthFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public Auth Routes — own Suspense (full-screen is fine for auth) */}
      <Route path={ROUTES.LOGIN} element={<Suspense fallback={<AuthFallback />}><LoginPage /></Suspense>} />
      <Route path={ROUTES.SIGNUP} element={<Suspense fallback={<AuthFallback />}><SignupPage /></Suspense>} />
      <Route path={ROUTES.VERIFY_OTP} element={<Suspense fallback={<AuthFallback />}><VerifyOtpPage /></Suspense>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<Suspense fallback={<AuthFallback />}><ForgotPasswordPage /></Suspense>} />

      {/* Authenticated Routes — DashboardLayout is always mounted, Suspense is INSIDE it */}
      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PROFILE} element={<CompanyProfilePage />} />

        <Route path={ROUTES.JOBS} element={<JobsPage />} />
        <Route path={ROUTES.JOB_CREATE} element={<JobCreatePage />} />
        <Route path={ROUTES.JOB_EDIT} element={<JobCreatePage />} />
        <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />

        <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
        <Route path={ROUTES.APPLICATION_DETAIL} element={<ApplicationDetailPage />} />

        <Route path={ROUTES.INTERVIEWS} element={<InterviewsPage />} />
        <Route path={ROUTES.INTERVIEW_SCHEDULE} element={<InterviewSchedulePage />} />
        <Route path={ROUTES.INTERVIEW_EDIT} element={<InterviewSchedulePage />} />

        <Route path={ROUTES.MESSAGES} element={<ComingSoonPage />} />
        <Route path={ROUTES.NOTIFICATIONS} element={<ComingSoonPage />} />
        <Route path={ROUTES.STAFF} element={<StaffManagementPage />} />
        <Route path={ROUTES.SUBSCRIPTIONS} element={<ComingSoonPage />} />
      </Route>

      {/* Fallback */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

export default App;

