import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { AUTH_STRINGS, ROUTES } from '../../constants';
import type { LoginRequest } from '../../types/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;

  const onSubmit = async (data: LoginRequest) => {
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(data);
      const auth = res.data.data;
      setAuth(
        { id: auth.userId, email: auth.email, role: auth.role, companyId: auth.companyId, companyRole: auth.companyRole },
        auth.accessToken, auth.refreshToken
      );
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Login failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen font-satoshi bg-surface text-text">
      {/* Brand Panel */}
      <div className="hidden md:flex flex-col justify-center items-center w-[45%] bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white p-16 relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-white/[0.06] -top-[120px] -right-[120px]" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-white/[0.04] -bottom-[80px] -left-[80px]" />
        <div className="text-4xl font-bold mb-4 flex items-center gap-3 z-10">
          <div className="w-[52px] h-[52px] bg-white/20 rounded-[14px] flex items-center justify-center text-2xl backdrop-blur-sm">R</div>
          RecruitPro
        </div>
        <p className="text-lg opacity-90 max-w-[380px] text-center leading-relaxed z-10">The modern recruitment platform that helps companies find and hire the best talent efficiently.</p>
        <div className="mt-12 flex flex-col gap-[18px] z-10">
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-bolt w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Post jobs and get applicants in minutes</div>
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-brain w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> AI-powered candidate matching</div>
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-chart-line w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Analytics dashboard for hiring insights</div>
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-users w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Team collaboration tools</div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-10 max-md:p-8">
        <div className="w-full max-w-[440px]">
          <h1 className="text-[1.75rem] font-bold mb-1.5">{AUTH_STRINGS.LOGIN_TITLE}</h1>
          <p className="text-text-muted text-[0.95rem] mb-8">
            {AUTH_STRINGS.LOGIN_SUBTITLE}{' '}
            <Link to={ROUTES.SIGNUP} className="text-primary font-semibold no-underline hover:underline">{AUTH_STRINGS.LOGIN_LINK}</Link>
          </p>

          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-[10px] px-4 py-3 text-sm mb-5">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-5">
              <label className="block font-medium text-sm mb-1.5">{AUTH_STRINGS.EMAIL_LABEL} <span className="text-red-500">{AUTH_STRINGS.REQUIRED}</span></label>
              <input type="email" className={`w-full px-3.5 py-3 border-[1.5px] rounded-[10px] text-sm font-satoshi transition-all bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.email ? 'border-red-500' : 'border-border'}`} placeholder="you@company.com" {...register('email', { required: 'Email is required' })} />
              {errors.email && <span className="block text-red-500 text-xs mt-1">{errors.email.message}</span>}
            </div>

            <div className="mb-5">
              <label className="block font-medium text-sm mb-1.5">{AUTH_STRINGS.PASSWORD_LABEL} <span className="text-red-500">{AUTH_STRINGS.REQUIRED}</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={`w-full px-3.5 py-3 pr-[42px] border-[1.5px] rounded-[10px] text-sm font-satoshi transition-all bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.password ? 'border-red-500' : 'border-border'}`} placeholder="Enter your password" {...register('password', { required: 'Password is required' })} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-light text-sm p-1" onClick={() => setShowPassword(!showPassword)}>
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {errors.password && <span className="block text-red-500 text-xs mt-1">{errors.password.message}</span>}
            </div>

            <div className="flex items-center justify-between mb-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-text-muted">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" /> {AUTH_STRINGS.REMEMBER_ME}
              </label>
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-primary no-underline font-medium hover:underline">{AUTH_STRINGS.FORGOT_LINK}</Link>
            </div>

            <button type="submit" className="w-full py-3.5 px-6 bg-primary text-white border-none rounded-[10px] text-[0.95rem] font-semibold font-satoshi cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(17,209,52,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sign-in-alt" />}
              {AUTH_STRINGS.LOGIN_BUTTON}
            </button>
          </form>

          <div className="flex items-center gap-4 my-7 text-text-light text-[0.85rem] before:content-[''] before:flex-1 before:h-px before:bg-border after:content-[''] after:flex-1 after:h-px after:bg-border">{AUTH_STRINGS.OR_CONTINUE}</div>

          <div className="flex gap-3 mb-6">
            <button type="button" className="flex-1 py-3 border-[1.5px] border-border rounded-[10px] bg-white cursor-pointer flex items-center justify-center gap-2 text-sm font-medium font-satoshi transition-all text-text hover:border-border-hover hover:bg-gray-50">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} /> Google
            </button>
            <button type="button" className="flex-1 py-3 border-[1.5px] border-border rounded-[10px] bg-white cursor-pointer flex items-center justify-center gap-2 text-sm font-medium font-satoshi transition-all text-text hover:border-border-hover hover:bg-gray-50">
              <i className="fab fa-github text-lg" /> GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
