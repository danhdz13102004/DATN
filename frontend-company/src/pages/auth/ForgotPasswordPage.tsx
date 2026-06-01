import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { AUTH_STRINGS, ROUTES } from '../../constants';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Step 1 form
  const emailForm = useForm<{ email: string }>();
  // Step 2 OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  // Step 3 password
  const pwdForm = useForm<{ newPassword: string; confirmPassword: string }>();

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP
  const handleSendOtp = async (data: { email: string }) => {
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setEmail(data.email);
      setStep(2);
      startCountdown();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to send verification code.';
      setError(msg);
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.verifyOtp({ email, code, type: 'RESET_PASSWORD' });
      setStep(3);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Invalid verification code.';
      setError(msg);
    } finally { setLoading(false); }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (data: { newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword({ email, code: otp.join(''), newPassword: data.newPassword });
      setStep(4);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to reset password.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try { await authService.forgotPassword(email); startCountdown(); } catch { /* ignore */ }
  };

  const handleOtpInput = (i: number, val: string) => {
    const v = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[i] = v;
    setOtp(newOtp);
    if (v && i < 5) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
  };

  // Step indicators
  const stepDots = [1, 2, 3].map((s) => (
    <div key={s} className={`h-1 rounded-full transition-all ${s < step ? 'w-9 bg-primary' : s === step ? 'w-13 bg-primary' : 'w-9 bg-gray-200'}`} />
  ));

  return (
    <div className="flex min-h-screen font-sans bg-surface text-text">
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
        <p className="text-lg opacity-90 max-w-[380px] text-center leading-relaxed z-10">Don't worry, we'll help you get back into your account safely and securely.</p>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-10 max-md:p-8">
        <div className="w-full max-w-[440px]">
          <div className="flex justify-center gap-2 mb-9">{stepDots}</div>

          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-[10px] px-4 py-3 text-sm mb-5">{error}</div>}

          {/* Step 1: Email */}
          {step === 1 && (
            <>
              <h1 className="text-[1.75rem] font-bold mb-1.5">{AUTH_STRINGS.FORGOT_TITLE}</h1>
              <p className="text-text-muted text-[0.95rem] mb-8">{AUTH_STRINGS.FORGOT_SUBTITLE}</p>
              <form onSubmit={emailForm.handleSubmit(handleSendOtp)}>
                <div className="mb-5">
                  <label className="block font-medium text-sm mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-[10px] text-sm font-sans focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="you@company.com" {...emailForm.register('email', { required: true })} />
                </div>
                <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-[10px] text-[0.95rem] font-semibold font-sans flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-60" disabled={loading}>
                  <i className="fas fa-paper-plane" /> {AUTH_STRINGS.FORGOT_BUTTON}
                </button>
              </form>
              <Link to={ROUTES.LOGIN} className="w-full mt-3 py-3.5 border-[1.5px] border-border rounded-[10px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 no-underline text-text hover:bg-gray-50 transition-all">
                <i className="fas fa-arrow-left" /> Back to Sign In
              </Link>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <h1 className="text-[1.75rem] font-bold mb-1.5">Verify Your Email 📬</h1>
              <p className="text-text-muted text-[0.95rem] mb-6">We've sent a 6-digit code to <strong>{email}</strong></p>
              <div className="flex gap-2.5 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" maxLength={1} className={`w-[52px] h-[58px] border-[1.5px] rounded-xl text-center text-2xl font-bold font-sans focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${digit ? 'border-primary bg-primary/[0.04]' : 'border-border'}`} value={digit} onChange={(e) => handleOtpInput(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} />
                ))}
              </div>
              <div className="text-center text-sm text-text-muted mb-6">
                Didn't receive the code?{' '}
                {canResend ? <button className="text-primary font-semibold" onClick={handleResend}>Resend code</button> : <span className="text-text-light">Resend in <strong>{countdown}</strong>s</span>}
              </div>
              <button className="w-full py-3.5 bg-primary text-white rounded-[10px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-60" onClick={handleVerifyOtp} disabled={loading}>
                <i className="fas fa-check-circle" /> Verify Code
              </button>
              <button className="w-full mt-3 py-3.5 border-[1.5px] border-border rounded-[10px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all" onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left" /> Change Email
              </button>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <h1 className="text-[1.75rem] font-bold mb-1.5">Set New Password 🔑</h1>
              <p className="text-text-muted text-[0.95rem] mb-8">Your identity has been verified. Create a strong new password.</p>
              <form onSubmit={pwdForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <div>
                  <label className="block font-medium text-sm mb-1.5">New Password <span className="text-red-500">*</span></label>
                  <input type="password" className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-[10px] text-sm font-sans focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="Enter new password" {...pwdForm.register('newPassword', { required: true, minLength: 8 })} />
                  <div className="text-xs text-text-light mt-1">Minimum 8 characters with at least one uppercase letter and one number</div>
                </div>
                <div>
                  <label className="block font-medium text-sm mb-1.5">Confirm New Password <span className="text-red-500">*</span></label>
                  <input type="password" className="w-full px-3.5 py-3 border-[1.5px] border-border rounded-[10px] text-sm font-sans focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="Confirm new password" {...pwdForm.register('confirmPassword', { required: true })} />
                </div>
                <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-[10px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-60" disabled={loading}>
                  <i className="fas fa-save" /> Reset Password
                </button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-5"><i className="fas fa-check" /></div>
              <h1 className="text-[1.75rem] font-bold mb-2">Password Reset! 🎉</h1>
              <p className="text-text-muted text-[0.95rem] mb-6">Your password has been successfully reset. You can now sign in with your new password.</p>
              <Link to={ROUTES.LOGIN} className="w-full py-3.5 bg-primary text-white rounded-[10px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 no-underline hover:bg-primary-hover transition-all">
                <i className="fas fa-sign-in-alt" /> Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
