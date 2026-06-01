import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { AUTH_STRINGS, ROUTES } from '../../constants';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Something went wrong.';
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
          <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
            <circle cx="32" cy="32" r="30" fill="#4fd1d9"/>
            <path d="M39.6 18.2c1.1.5 2 1.1 2.7 2c.6.7 1.1 1.5 1.5 2.4c.4.9.5 1.9.5 3.1c0 1.4-.3 2.7-1 4.1s-1.8 2.3-3.4 2.8c1.3.5 2.3 1.3 2.8 2.3c.6 1 .8 2.5.8 4.5v1.9c0 1.3.1 2.2.2 2.7c.2.7.5 1.3 1.1 1.7v.7h-6.7c-.2-.6-.3-1.2-.4-1.6c-.2-.8-.2-1.6-.3-2.5v-2.7c0-1.8-.3-3.1-1-3.7c-.6-.6-1.8-.9-3.5-.9H27v11.4h-5.9v-29H35c2 .1 3.6.4 4.6.8m-12.5 4.3v7.8h6.5c1.3 0 2.3-.2 2.9-.5c1.1-.6 1.7-1.6 1.7-3.3c0-1.8-.6-2.9-1.7-3.5c-.6-.3-1.6-.5-2.8-.5h-6.6" fill="#ffffff"/>
          </svg>
          RecruitPro
        </div>
        <p className="text-lg opacity-90 max-w-[380px] text-center leading-relaxed z-10">Your career journey starts here. Discover thousands of opportunities from top companies.</p>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-10 max-md:p-8">
        <div className="w-full max-w-[440px]">
          <h1 className="text-[1.75rem] font-bold mb-1.5">{AUTH_STRINGS.FORGOT_TITLE}</h1>
          <p className="text-text-muted text-[0.95rem] mb-8">{AUTH_STRINGS.FORGOT_SUBTITLE}</p>

          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-[10px] px-4 py-3 text-sm mb-5">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 border border-green-200 rounded-[10px] px-4 py-3 text-sm mb-5">If an account with that email exists, we've sent a password reset code. Check your inbox.</div>}

          {!success && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-5">
                <label className="block font-medium text-sm mb-1.5">{AUTH_STRINGS.EMAIL_LABEL} <span className="text-red-500">{AUTH_STRINGS.REQUIRED}</span></label>
                <input type="email" className={`w-full px-3.5 py-3 border-[1.5px] rounded-[10px] text-sm font-satoshi transition-all bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.email ? 'border-red-500' : 'border-border'}`} placeholder="you@email.com" {...register('email', { required: 'Email is required' })} />
                {errors.email && <span className="block text-red-500 text-xs mt-1">{errors.email.message}</span>}
              </div>
              <button type="submit" className="w-full py-3.5 px-6 bg-primary text-white border-none rounded-[10px] text-[0.95rem] font-semibold font-satoshi cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(66,135,245,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                {AUTH_STRINGS.FORGOT_BUTTON}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to={ROUTES.LOGIN} className="text-primary no-underline font-medium hover:underline inline-flex items-center gap-1.5">
              <i className="fas fa-arrow-left" /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
