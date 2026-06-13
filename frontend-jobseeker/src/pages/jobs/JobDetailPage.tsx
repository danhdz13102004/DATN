import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState';
import { jobService } from '../../services/jobService';
import { resumeService } from '../../services/resumeService';
import { applicationService } from '../../services/applicationService';
import { useAuthStore } from '../../store/authStore';
import type { Job } from '../../types/job';
import type { Resume } from '../../types/resume';

// ============================================================
// DESIGN TOKENS
// ============================================================
const c = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryLighter: '#DBEAFE',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
};

// ============================================================
// ICONS (SVG components for consistency)
// ============================================================
const Icon = ({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, JSX.Element> = {
    'bookmark': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    'bookmark-filled': <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    'share': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
    'map': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    'briefcase': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    'clock': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    'calendar': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    'dollar': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    'chart': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    'send': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    'check': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    'check-circle': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    'user': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    'login': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
    'user-plus': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
    'building': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
    'users': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    'link': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    'upload': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    'alert': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    'file': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    'tools': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    'gift': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
    'x': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    'chevron': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    'industry': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>,
    'external': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    'pdf': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    'image': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    'search': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  };
  return icons[name] || <span style={{ width: size, height: size, display: 'inline-block' }} />;
};

// ============================================================
// TOAST COMPONENT
// ============================================================
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            background: toast.type === 'success' ? c.successLight : toast.type === 'error' ? c.dangerLight : c.primaryLight,
            color: toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#991B1B' : c.primaryHover,
            border: `1px solid ${toast.type === 'success' ? '#A7F3D0' : toast.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
            minWidth: 300,
            animation: 'slideIn 0.3s ease',
          }}
        >
          <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert' : 'alert'} size={18} color={toast.type === 'success' ? c.success : toast.type === 'error' ? c.danger : c.primary} />
          <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{toast.message}</span>
          <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.6 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function JobDetailSkeleton() {
  return (
    <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <div style={{ width: 80, height: 14, background: c.borderLight, borderRadius: 4 }} />
        <div style={{ width: 12, height: 12, background: c.borderLight, borderRadius: 2 }} />
        <div style={{ width: 100, height: 14, background: c.borderLight, borderRadius: 4 }} />
      </div>

      {/* Header */}
      <div style={{ background: c.white, borderRadius: 20, border: `1px solid ${c.border}`, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, background: c.borderLight, borderRadius: 16 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '70%', height: 28, background: c.borderLight, borderRadius: 6, marginBottom: 12 }} />
            <div style={{ width: '40%', height: 18, background: c.borderLight, borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 100, background: c.borderLight, borderRadius: 12 }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ background: c.white, borderRadius: 20, border: `1px solid ${c.border}`, padding: 32 }}>
              <div style={{ width: 150, height: 22, background: c.borderLight, borderRadius: 4, marginBottom: 16 }} />
              <div style={{ height: 14, background: c.borderLight, borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: '85%', height: 14, background: c.borderLight, borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: '70%', height: 14, background: c.borderLight, borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ background: c.white, borderRadius: 20, border: `1px solid ${c.border}`, padding: 32 }}>
              <div style={{ width: 120, height: 22, background: c.borderLight, borderRadius: 4, marginBottom: 20 }} />
              <div style={{ height: 44, background: c.borderLight, borderRadius: 10, marginBottom: 12 }} />
              <div style={{ height: 120, background: c.borderLight, borderRadius: 10, marginBottom: 12 }} />
              <div style={{ height: 50, background: c.borderLight, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// BREADCRUMB
// ============================================================
function Breadcrumb() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
      <Link
        to="/jobs"
        style={{
          color: c.text2,
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = c.primary}
        onMouseLeave={(e) => e.currentTarget.style.color = c.text2}
      >
        Browse Jobs
      </Link>
      <Icon name="chevron" size={12} color={c.text3} />
      <span style={{ color: c.text, fontWeight: 600 }}>Job Details</span>
    </nav>
  );
}

// ============================================================
// SKILL CHIP
// ============================================================
function SkillChip({ name }: { name: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '6px 14px',
      borderRadius: 50,
      fontSize: 13,
      fontWeight: 500,
      background: c.primaryLight,
      color: c.primary,
      border: `1px solid ${c.primaryLighter}`,
    }}>
      {name}
    </span>
  );
}

// ============================================================
// EXPERIENCE BADGE
// ============================================================
function ExperienceBadge({ level }: { level: string }) {
  const normalized = level.toUpperCase().replace(/\s+/g, '_');
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    FRESHER: { bg: c.borderLight, text: c.text2, border: c.border },
    JUNIOR: { bg: c.primaryLighter, text: c.primaryHover, border: '#BFDBFE' },
    MIDDLE: { bg: c.purpleLight, text: c.purple, border: '#DDD6FE' },
    SENIOR: { bg: c.warningLight, text: '#B45309', border: '#FDE68A' },
    LEAD: { bg: c.successLight, text: c.success, border: '#A7F3D0' },
    MANAGER: { bg: c.successLight, text: c.success, border: '#A7F3D0' },
  };
  const style = styles[normalized] || { bg: c.borderLight, text: c.text2, border: c.border };
  const display = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      background: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`,
    }}>
      {display}
    </span>
  );
}

// ============================================================
// INFO CARD
// ============================================================
interface InfoCardProps {
  icon: string;
  label: string;
  value: React.ReactNode;
  color: string;
  highlight?: boolean;
}

function InfoCard({ icon, label, value, color, highlight }: InfoCardProps) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: 18,
        borderRadius: 14,
        background: hovered ? c.white : c.borderLight,
        border: `1px solid ${hovered ? c.border : 'transparent'}`,
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name={icon} size={16} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text3 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? c.primary : c.text }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================
// SECTION CARD
// ============================================================
interface SectionCardProps {
  icon?: string;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div style={{
      background: c.white,
      borderRadius: 20,
      border: `1px solid ${c.border}`,
      padding: 28,
    }}>
      <h2 style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 18, fontWeight: 700, color: c.text,
        marginBottom: 16,
      }}>
        {icon && <Icon name={icon} size={20} color={c.primary} />}
        {title}
      </h2>
      <div style={{ fontSize: 15, color: c.text2, lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [job, setJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [coverFocused, setCoverFocused] = useState(false);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const toastId = Date.now().toString();
    setToasts(prev => [...prev, { id: toastId, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadJob = jobService.getJobById(id).then(j => setJob(j)).catch(console.error);
    const promises: Promise<any>[] = [loadJob];

    if (isAuthenticated) {
      promises.push(
        resumeService.listResumes().then(r => {
          setResumes(r);
          const primary = r.find((res: Resume) => res.isPrimary);
          if (primary) setSelectedResume(primary.id);
          else if (r.length > 0) setSelectedResume(r[0].id);
        }).catch(() => setResumes([])),
        jobService.getSaveStatus(id).then(saved => setIsSaved(saved)).catch(() => setIsSaved(false)),
        jobService.getAppliedJobIds().then(ids => {
          setIsApplied(ids.includes(id));
        }).catch(() => setIsApplied(false))
      );
    }

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!id || loading) return;

    const scheduleClick = () => {
      clickTimerRef.current = setTimeout(() => {
        if (isAuthenticated) jobService.logInteraction(id, 'click');
      }, 5000);
    };

    const cancelClick = () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };

    scheduleClick();
    const handleVisibilityChange = () => {
      if (document.hidden) cancelClick();
      else scheduleClick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelClick();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, loading, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!id || savePending) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/jobs/${id}` } });
      return;
    }
    setSavePending(true);
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) {
        await jobService.unsaveJob(id);
        showToast('Job removed from saved list', 'info');
      } else {
        await jobService.saveJob(id);
        jobService.logInteraction(id, 'save');
        showToast('Job saved successfully!', 'success');
      }
    } catch {
      setIsSaved(wasSaved);
      showToast('Failed to save job', 'error');
    } finally {
      setSavePending(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleApply = async () => {
    if (!id || !selectedResume) return;
    setApplying(true);
    setErrorMsg('');
    try {
      await applicationService.apply({
        jobId: id,
        resumeId: selectedResume,
        coverLetter: coverLetter || undefined,
      });
      setSuccessMsg('Application submitted successfully!');
      setIsApplied(true);
      showToast('Application submitted successfully!', 'success');
      setTimeout(() => navigate('/applications'), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit application');
      showToast('Failed to submit application', 'error');
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Negotiable';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max!.toLocaleString()}`;
  };

  const formatJobType = (type: string) => {
    return type
      .replace('FULLTIME', 'Full-time')
      .replace('PARTTIME', 'Part-time')
      .replace('REMOTE', 'Remote')
      .replace('HYBRID', 'Hybrid')
      .replace('CONTRACT', 'Contract')
      .replace('INTERNSHIP', 'Internship');
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffTime = Math.abs(now.getTime() - posted.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return posted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <JobDetailSkeleton />
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Breadcrumb />
        <EmptyState
          icon="fa-briefcase"
          title="Job not found"
          description="This job posting may have been removed or is no longer available."
          action={{ label: 'Browse Other Jobs', onClick: () => navigate('/jobs') }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* <Breadcrumb /> */}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Job Header Card */}
          <div style={{
            background: c.white,
            borderRadius: 24,
            border: `1px solid ${c.border}`,
            padding: 32,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            animation: 'fadeSlideUp 0.45s ease both',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${c.primary}, #06B6D4, ${c.purple})`,
            }} />

            {/* Floating decorations */}
            <div style={{
              position: 'absolute', top: -30, right: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(37,99,235,0.04)',
              border: '1px solid rgba(37,99,235,0.06)',
            }} />
            <div style={{
              position: 'absolute', bottom: -20, right: 80,
              width: 70, height: 70, borderRadius: '50%',
              background: 'rgba(139,92,246,0.03)',
            }} />
            <div style={{
              position: 'absolute', top: 40, right: 140,
              width: 8, height: 8, borderRadius: '50%',
              background: 'rgba(16,185,129,0.3)',
              animation: 'statusPulse 3s ease-in-out infinite',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
              {/* Company Logo */}
              <div style={{
                width: 88, height: 88,
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 800,
                background: job.company?.logoUrl
                  ? `linear-gradient(135deg, ${c.primaryLighter}, ${c.primaryLight})`
                  : `linear-gradient(135deg, ${c.primaryLighter}, ${c.primaryLight})`,
                color: c.primary,
                boxShadow: `0 8px 24px ${c.primaryLighter}`,
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {job.company?.logoUrl ? (
                  <img
                    src={job.company.logoUrl}
                    alt={job.company?.name || 'Company'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (job.company?.name || job.title).charAt(0).toUpperCase()
                )}
              </div>

              {/* Job Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#9CA3AF',
                  margin: '0 0 6px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <i className="fas fa-briefcase" style={{ fontSize: '0.65rem', color: '#2563EB' }} />
                  Job Details
                </p>
                <h1 style={{
                  fontSize: 26, fontWeight: 800, color: c.text,
                  lineHeight: 1.3, marginBottom: 10, letterSpacing: '-0.02em',
                }}>
                  {job.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: c.text2 }}>
                    {job.company?.name || 'Company not specified'}
                  </span>
                  <span style={{ color: c.text3 }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: c.text3 }}>
                    <Icon name="map" size={14} color={c.text3} />
                    {job.location || 'Location not specified'}
                  </span>
                </div>
                {job.industry && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    marginTop: 8, padding: '4px 12px',
                    borderRadius: 50, fontSize: 12, fontWeight: 500,
                    background: c.purpleLight, color: c.purple,
                  }}>
                    {job.industry.name}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button
                  onClick={handleToggleSave}
                  disabled={savePending}
                  title={isSaved ? 'Unsave job' : 'Save job'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    border: isSaved ? '2px solid #FDE68A' : '2px solid #E2E8F0',
                    background: isSaved ? '#FFFBEB' : c.white,
                    color: isSaved ? '#B45309' : c.text2,
                    cursor: savePending ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSaved ? '0 2px 8px rgba(251, 191, 36, 0.2)' : 'none',
                  }}
                >
                  <Icon name={isSaved ? 'bookmark-filled' : 'bookmark'} size={16} color={isSaved ? '#F59E0B' : c.text3} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleShare}
                  title="Share job"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    border: '2px solid #E2E8F0',
                    background: c.white,
                    color: c.text2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon name="share" size={16} color={c.text3} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <InfoCard
                icon="dollar"
                label="Salary"
                value={formatSalary(job.salaryMin, job.salaryMax)}
                color={c.success}
                highlight
              />
              <InfoCard
                icon="clock"
                label="Job Type"
                value={formatJobType(job.jobType || 'Not specified')}
                color={c.primary}
              />
              <InfoCard
                icon="calendar"
                label="Posted"
                value={formatDate(job.createdAt)}
                color={c.text3}
              />
              <InfoCard
                icon="chart"
                label="Experience"
                value={
                  job.experienceLevels && job.experienceLevels.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {job.experienceLevels.map((level, idx) => (
                        <ExperienceBadge key={idx} level={level} />
                      ))}
                    </div>
                  ) : (
                    'Not specified'
                  )
                }
                color={c.purple}
              />
            </div>
          </div>

          {/* Job Description */}
          <SectionCard icon="file" title="Job Description">
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit', margin: 0,
            }}>
              {job.description || 'No description provided by the employer.'}
            </pre>
          </SectionCard>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <SectionCard icon="check-circle" title="Responsibilities">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {job.responsibilities.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.primaryLight, color: c.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <Icon name="check" size={12} color={c.primary} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <SectionCard icon="file" title="Requirements">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {job.requirements.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: c.warningLight, color: c.warning,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <Icon name="check" size={12} color={c.warning} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <SectionCard icon="tools" title="Required Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {job.skills.map((skill) => (
                  <SkillChip key={skill.id} name={skill.name} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Nice to Have Skills */}
          {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
            <SectionCard icon="external" title="Nice to Have">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {job.niceToHaveSkills.map((skill, idx) => (
                  <span key={idx} style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: 50,
                    fontSize: 13, fontWeight: 500,
                    background: c.borderLight,
                    color: c.text2,
                    border: `1px solid ${c.border}`,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Benefits */}
          <SectionCard icon="gift" title="What We Offer">
            {job.company?.benefits ? (
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'inherit', margin: 0,
              }}>
                {job.company.benefits}
              </pre>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Competitive salary and performance bonuses',
                  'Comprehensive health, dental, and vision insurance',
                  'Professional development and learning opportunities',
                  'Flexible working arrangements and work-life balance',
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.successLight, color: c.success,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <Icon name="check" size={12} color={c.success} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Attachment */}
          {job.attachmentUrl && (
            <SectionCard icon="paperclip" title="Job Attachment">
              {/\.(jpeg|jpg|png)$/i.test(job.attachmentUrl) ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                  <img
                    src={job.attachmentUrl}
                    alt="Job attachment"
                    style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }}
                  />
                </div>
              ) : (
                <a
                  href={job.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: `1.5px solid ${c.border}`,
                    background: c.borderLight,
                    textDecoration: 'none',
                    color: c.primary,
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#FEE2E2', color: '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name="pdf" size={20} color="#DC2626" />
                  </div>
                  <div>
                    <div>View PDF Attachment</div>
                    <div style={{ fontSize: 12, color: c.text3, fontWeight: 400 }}>
                      Opens in a new tab
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Icon name="external" size={16} color={c.primary} />
                  </div>
                </a>
              )}
            </SectionCard>
          )}
        </div>

        {/* Right Column - Sticky Sidebar */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 24,
          position: 'sticky', top: 100,
        }}>
          {/* Apply Card */}
          <div className="card-lift" style={{
            background: c.white,
            borderRadius: 24,
            border: `1px solid ${c.border}`,
            padding: 28,
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 18, fontWeight: 700, color: c.text,
              marginBottom: 4,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${c.primaryLighter}, ${c.primaryLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.primary,
              }}>
                <Icon name="send" size={16} color={c.primary} />
              </div>
              Apply for This Position
              {isApplied && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 50,
                  fontSize: 12, fontWeight: 700,
                  background: c.successLight, color: c.success,
                  border: `1px solid ${'#A7F3D0'}`,
                  letterSpacing: '0.03em',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
                }}>
                  <Icon name="check" size={12} color={c.success} />
                  APPLIED
                </span>
              )}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 20px', paddingLeft: 46 }}>
              Submit your application in just a few clicks
            </p>

            {successMsg ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: c.successLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: `2px solid ${'#A7F3D0'}`,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
                }}>
                  <Icon name="check" size={28} color={c.success} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#065F46', margin: '0 0 8px' }}>
                  Application Submitted!
                </h4>
                <p style={{ fontSize: 13, color: '#047857', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Your application has been sent to {job.company?.name || 'the company'}.<br />
                  Good luck with your application!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => navigate('/applications')}
                    style={{
                      width: '100%', padding: '13px 20px',
                      borderRadius: 12,
                      fontSize: 14, fontWeight: 600,
                      background: c.success, color: '#FFFFFF',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon name="briefcase" size={15} color="#FFFFFF" />
                    View My Applications
                  </button>
                  <button
                    onClick={() => navigate('/jobs')}
                    style={{
                      width: '100%', padding: '13px 20px',
                      borderRadius: 12,
                      fontSize: 14, fontWeight: 600,
                      background: c.white, color: c.text2,
                      border: `1.5px solid ${c.border}`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon name="search" size={15} color={c.text2} />
                    Browse More Jobs
                  </button>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: c.primaryLighter, color: c.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Icon name="user" size={32} color={c.primary} />
                </div>
                <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
                  Sign in to apply for this job and track your applications.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => navigate('/login', { state: { from: `/jobs/${id}` } })}
                    style={{
                      width: '100%', padding: '14px 20px',
                      borderRadius: 12,
                      fontSize: 15, fontWeight: 600,
                      background: c.primary, color: c.white,
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: `0 4px 14px rgba(37, 99, 235, 0.35)`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon name="login" size={16} color={c.white} />
                    Login to Apply
                  </button>
                  <button
                    onClick={() => navigate('/signup', { state: { from: `/jobs/${id}` } })}
                    style={{
                      width: '100%', padding: '14px 20px',
                      borderRadius: 12,
                      fontSize: 15, fontWeight: 600,
                      background: c.white, color: c.primary,
                      border: `2px solid ${c.primary}`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon name="user-plus" size={16} color={c.primary} />
                    Create Account
                  </button>
                </div>
              </div>
            ) : isApplied ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: c.successLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: `2px solid ${'#A7F3D0'}`,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
                }}>
                  <Icon name="check" size={28} color={c.success} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#065F46', margin: '0 0 8px' }}>
                  You've Already Applied
                </h4>
                <p style={{ fontSize: 13, color: '#047857', margin: '0 0 20px', lineHeight: 1.6 }}>
                  Your application is currently under review.<br />
                  Good luck!
                </p>
                <button
                  onClick={() => navigate('/applications')}
                  style={{
                    width: '100%', padding: '13px 20px',
                    borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    background: c.success, color: '#FFFFFF',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <Icon name="briefcase" size={15} color="#FFFFFF" />
                  View My Applications
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Resume Selection */}
                <div>
                  <label style={{
                    display: 'block', fontSize: 14, fontWeight: 600, color: c.text,
                    marginBottom: 8,
                  }}>
                    Select Resume <span style={{ color: c.danger }}>*</span>
                  </label>
                  <select
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    style={{
                      width: '100%', padding: '14px 16px',
                      borderRadius: 12,
                      fontSize: 14, color: c.text,
                      background: c.white,
                      border: `1.5px solid ${c.border}`,
                      outline: 'none', cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Choose a resume...</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label || 'Untitled Resume'} {r.isPrimary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                  {resumes.length === 0 ? (
                    <div style={{
                      marginTop: 12, padding: 14,
                      borderRadius: 10,
                      fontSize: 13, color: '#92400E',
                      background: c.warningLight,
                      border: '1px solid #FDE68A',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <Icon name="alert" size={16} color="#B45309" />
                      <span>
                        You need to{' '}
                        <button
                          onClick={() => navigate('/resumes')}
                          style={{
                            fontWeight: 600, background: 'none', border: 'none',
                            cursor: 'pointer', color: '#92400E', textDecoration: 'underline',
                            fontFamily: 'inherit', fontSize: 'inherit',
                          }}
                        >
                          upload a resume
                        </button>{' '}
                        before applying.
                      </span>
                    </div>
                  ) : (
                    <p style={{ marginTop: 10, fontSize: 13, color: c.text3 }}>
                      Or{' '}
                      <button
                        onClick={() => navigate('/resumes')}
                        style={{
                          fontWeight: 500, background: 'none', border: 'none',
                          cursor: 'pointer', color: c.primary,
                          fontFamily: 'inherit', fontSize: 'inherit',
                        }}
                      >
                        upload a new resume
                      </button>
                    </p>
                  )}
                </div>

                {/* Cover Letter */}
                <div>
                  <label style={{
                    display: 'block', fontSize: 14, fontWeight: 600, color: c.text,
                    marginBottom: 8,
                  }}>
                    Cover Letter{' '}
                    <span style={{ fontWeight: 400, color: c.text3 }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Write a brief cover letter to introduce yourself and highlight your interest in this role..."
                    style={{
                      width: '100%', padding: '14px 16px',
                      borderRadius: 12,
                      fontSize: 14, color: c.text,
                      background: c.white,
                      border: `1.5px solid ${coverFocused ? c.primary : c.border}`,
                      outline: 'none', resize: 'none',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit', lineHeight: 1.6,
                      boxShadow: coverFocused ? `0 0 0 3px ${c.primaryLighter}` : 'none',
                    }}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    onFocus={() => setCoverFocused(true)}
                    onBlur={() => setCoverFocused(false)}
                    maxLength={2000}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: c.text3 }}>
                    <span></span>
                    <span>{coverLetter.length}/2000</span>
                  </div>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div style={{
                    padding: 14, borderRadius: 10,
                    fontSize: 13, color: '#991B1B',
                    background: c.dangerLight,
                    border: '1px solid #FECACA',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Icon name="alert" size={16} color={c.danger} />
                    {errorMsg}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleApply}
                  disabled={applying || !selectedResume || resumes.length === 0}
                  style={{
                    width: '100%', padding: '15px 20px',
                    borderRadius: 12,
                    fontSize: 15, fontWeight: 600,
                    background: applying || !selectedResume || resumes.length === 0 ? c.text3 : c.primary,
                    color: c.white,
                    border: 'none',
                    cursor: applying || !selectedResume || resumes.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.2s',
                    boxShadow: applying || !selectedResume || resumes.length === 0 ? 'none' : `0 4px 14px rgba(37, 99, 235, 0.35)`,
                  }}
                >
                  {applying ? (
                    <>
                      <div style={{
                        width: 18, height: 18,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: c.white,
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Icon name="send" size={16} color={c.white} />
                      Submit Application
                    </>
                  )}
                </button>

              </div>
            )}
          </div>

          {/* Company Card */}
          <div style={{
            background: c.white,
            borderRadius: 24,
            border: `1px solid ${c.border}`,
            padding: 28,
          }}>
            <h3 style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 18, fontWeight: 700, color: c.text,
              marginBottom: 20,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: c.primaryLighter, color: c.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="building" size={16} color={c.primary} />
              </div>
              About the company
            </h3>

            {/* Company Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800,
                background: `linear-gradient(135deg, ${c.primaryLighter}, ${c.primaryLight})`,
                color: c.primary,
                boxShadow: `0 4px 16px ${c.primaryLighter}`,
                overflow: 'hidden',
              }}>
                {job.company?.logoUrl ? (
                  <img
                    src={job.company.logoUrl}
                    alt={job.company?.name || 'Company'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (job.company?.name || 'C').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 4 }}>
                  {job.company?.name || 'Company not specified'}
                </div>
                {job.company?.verified ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.success }}>
                    <Icon name="check-circle" size={14} color={c.success} />
                    Verified Employer
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: c.text3 }}>Unverified</div>
                )}
              </div>
            </div>

            {/* Company Description */}
            <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, marginBottom: 20 }}>
              {job.company?.description ||
                (job.company?.name
                  ? `${job.company.name} is a verified employer on RecruitPro, actively hiring talented professionals.`
                  : 'This company is a verified employer on RecruitPro.')}
            </p>

            {/* Company Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.borderLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="map" size={16} color={c.text3} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: c.text3 }}>Location</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                    {job.company?.location || job.location || 'Not specified'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.borderLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="users" size={16} color={c.text3} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: c.text3 }}>Team Size</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                    {job.company?.staffCount ? `${job.company.staffCount} members` : 'Not specified'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.borderLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="industry" size={16} color={c.text3} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: c.text3 }}>Industry</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
                    {job.company?.industry || job.industry?.name || 'Not specified'}
                  </div>
                </div>
              </div>

              {job.company?.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: c.borderLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="link" size={16} color={c.text3} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: c.text3 }}>Website</div>
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 14, fontWeight: 600, color: c.primary, textDecoration: 'none' }}
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Active Jobs */}
            {job.company?.activeJobsCount !== undefined && job.company.activeJobsCount > 0 && (
              <div style={{
                marginTop: 20, padding: 16, borderRadius: 12,
                background: c.primaryLight, border: `1px solid ${c.primaryLighter}`,
              }}>
                <div style={{ fontSize: 13, color: c.primary, fontWeight: 600 }}>
                  {job.company.activeJobsCount} open position{job.company.activeJobsCount !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: c.primary, opacity: 0.8, marginTop: 2 }}>
                  Currently hiring on RecruitPro
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Apply Button */}
      <div style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: 16, background: `${c.white}ee`,
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${c.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 100,
      }} className="mobile-apply-btn">
        <button
          onClick={() => {
            document.querySelector('[data-apply-card]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          style={{
            width: '100%', padding: '16px 20px',
            borderRadius: 14,
            fontSize: 15, fontWeight: 700,
            background: c.primary, color: c.white,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 4px 14px rgba(37, 99, 235, 0.35)`,
          }}
        >
          <Icon name="send" size={16} color={c.white} />
          Apply Now
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 1024px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .mobile-apply-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
