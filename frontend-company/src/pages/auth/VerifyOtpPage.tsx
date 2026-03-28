import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ROUTES } from '../../constants';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; type?: string } | null;
  const email = state?.email || '';
  const type = (state?.type || 'VERIFY_ACCOUNT') as 'VERIFY_ACCOUNT' | 'RESET_PASSWORD';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (!email) navigate(ROUTES.LOGIN, { replace: true }); }, [email, navigate]);
  useEffect(() => {
    if (resendCooldown > 0) { const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000); return () => clearTimeout(t); }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const c = [...code]; c[index] = value.slice(-1); setCode(c);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const c = [...code]; for (let i = 0; i < p.length; i++) c[i] = p[i]; setCode(c);
    inputRefs.current[Math.min(p.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Please enter the complete 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      await authService.verifyOtp({ email, code: fullCode, type });
      if (type === 'RESET_PASSWORD') navigate(ROUTES.RESET_PASSWORD, { state: { email, code: fullCode } });
      else navigate(ROUTES.LOGIN, { state: { verified: true } });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Verification failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try { await authService.resendOtp(email); setResendCooldown(60); setError(''); }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to resend.';
      setError(msg);
    }
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
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-shield-alt w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Secure email verification</div>
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-bolt w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Code expires in 10 minutes</div>
          <div className="flex items-center gap-3.5 text-[0.95rem] opacity-[0.92]"><i className="fas fa-redo w-9 h-9 bg-white/[0.15] rounded-[10px] flex items-center justify-center text-sm" /> Request a new code anytime</div>
        </div>
      </div>

      {/* OTP Panel */}
      <div className="flex-1 flex items-center justify-center p-10 max-md:p-8">
        <div className="w-full max-w-[440px] text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-[1.75rem] font-bold mb-1.5">Check Your Email</h1>
          <p className="text-text-muted text-[0.95rem] mb-8">We've sent a 6-digit code to <strong>{email}</strong></p>

          {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-[10px] px-4 py-3 text-sm mb-5">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2.5 justify-center mt-6" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-[52px] h-[56px] text-center text-2xl font-semibold font-satoshi border-[1.5px] border-border rounded-xl bg-white transition-all focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-3.5 px-6 bg-primary text-white border-none rounded-[10px] text-[0.95rem] font-semibold font-satoshi cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(17,209,52,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}
            >
              {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-circle" />}
              Verify Code
            </button>
          </form>

          <p className="mt-5 text-sm text-text-muted">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="bg-transparent border-none text-primary font-semibold cursor-pointer font-satoshi text-sm disabled:text-text-light disabled:cursor-not-allowed"
              onClick={handleResend}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
