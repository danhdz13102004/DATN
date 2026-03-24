import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
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
      setAuth({ id: auth.userId, email: auth.email, role: auth.role }, auth.accessToken, auth.refreshToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Login failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="font-inter min-h-screen flex items-center justify-center bg-surface text-text relative overflow-hidden">
      {/* Animated BG blobs */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] -top-[200px] -right-[100px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.1)_0%,transparent_70%)] -bottom-[150px] -left-[100px] animate-pulse [animation-delay:2s]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:60px_60px] z-0" />

      {/* Login Card */}
      <div className="relative z-10 bg-white rounded-[20px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] p-12 max-sm:mx-4 max-sm:px-6 max-sm:py-9 animate-[cardIn_0.5s_ease]">
        {/* Brand */}
        <div className="text-center mb-9">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-light rounded-2xl inline-flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-[0_8px_24px_rgba(99,102,241,0.3)]">
            <i className="fas fa-shield-alt" />
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">{AUTH_STRINGS.LOGIN_TITLE}</h1>
          <p className="text-text-light text-[0.9rem] mt-1">{AUTH_STRINGS.LOGIN_SUBTITLE}</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-[10px] px-4 py-3 text-sm mb-5">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-5">
            <label className="block font-medium text-sm mb-1.5 text-text">{AUTH_STRINGS.EMAIL_LABEL} <span className="text-red-500">{AUTH_STRINGS.REQUIRED}</span></label>
            <div className="relative">
              <input
                type="email"
                className={`w-full py-3 pl-[42px] pr-3.5 border-[1.5px] rounded-[10px] text-sm font-inter transition-all bg-white text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.email ? 'border-red-500' : 'border-border'}`}
                placeholder="admin@recruitpro.com"
                {...register('email', { required: 'Email is required' })}
              />
              <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-text-light text-sm transition-colors peer-focus:text-primary" />
            </div>
            {errors.email && <span className="block text-red-500 text-xs mt-1">{errors.email.message}</span>}
          </div>

          <div className="mb-5">
            <label className="block font-medium text-sm mb-1.5 text-text">{AUTH_STRINGS.PASSWORD_LABEL} <span className="text-red-500">{AUTH_STRINGS.REQUIRED}</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full py-3 pl-[42px] pr-[42px] border-[1.5px] rounded-[10px] text-sm font-inter transition-all bg-white text-text focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.password ? 'border-red-500' : 'border-border'}`}
                placeholder="Enter your password"
                {...register('password', { required: 'Password is required' })}
              />
              <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-text-light text-sm" />
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-light text-sm p-1 transition-colors hover:text-text-muted" onClick={() => setShowPassword(!showPassword)}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {errors.password && <span className="block text-red-500 text-xs mt-1">{errors.password.message}</span>}
          </div>

          <div className="flex items-center justify-between mb-6 text-[0.86rem]">
            <label className="flex items-center gap-2 cursor-pointer text-text-muted">
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" /> {AUTH_STRINGS.REMEMBER_ME}
            </label>
            <a href="#" className="text-primary no-underline font-medium hover:underline">{AUTH_STRINGS.FORGOT_LINK}</a>
          </div>

          <button type="submit" className="w-full py-3.5 px-6 bg-gradient-to-br from-primary to-primary-hover text-white border-none rounded-[10px] text-[0.95rem] font-semibold font-inter cursor-pointer transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:from-primary-hover hover:to-primary-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sign-in-alt" />}
            {AUTH_STRINGS.LOGIN_BUTTON}
          </button>
        </form>

        <div className="text-center mt-7 text-[0.8rem] text-text-light flex items-center justify-center gap-1.5">
          <i className="fas fa-lock text-xs text-emerald-500" /> Secured with 256-bit SSL encryption
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs z-10 whitespace-nowrap">© 2026 RecruitPro. All rights reserved.</div>
    </div>
  );
}
