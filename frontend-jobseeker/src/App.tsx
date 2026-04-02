import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import { ROUTES } from './constants';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const JobsPage = lazy(() => import('./pages/jobs/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/jobs/JobDetailPage'));
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('./pages/applications/ApplicationDetailPage'));
const InterviewsPage = lazy(() => import('./pages/interviews/InterviewsPage'));
const ResumesPage = lazy(() => import('./pages/resumes/ResumesPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Auth routes (no layout) */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtpPage />} />

        {/* App routes (with sidebar layout) */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path={ROUTES.HOME} element={<DashboardPage />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.JOBS} element={<JobsPage />} />
          <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />
          <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
          <Route path={ROUTES.APPLICATION_DETAIL} element={<ApplicationDetailPage />} />
          <Route path={ROUTES.INTERVIEWS} element={<InterviewsPage />} />
          <Route path={ROUTES.RESUMES} element={<ResumesPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.MESSAGES} element={<ComingSoonPage />} />
          <Route path={ROUTES.NOTIFICATIONS} element={<ComingSoonPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
