import { useEffect, useState, useRef } from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { jobSeekerService } from '../../services/jobSeekerService';
import { resumeService } from '../../services/resumeService';
import { useNavigate } from 'react-router-dom';
import type { JobSeekerProfile } from '../../types/jobseeker';
import type { Skill } from '../../types/job';
import type { Resume } from '../../types/resume';

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  } as React.CSSProperties,

  heroBg: {
    background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 40%, #7C3AED 100%)',
    borderRadius: '0 0 32px 32px',
    padding: '0 32px 48px',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  heroShape: (i: number) => ({
    position: 'absolute' as const,
    borderRadius: '50%' as const,
    background: 'rgba(255,255,255,0.06)',
    pointerEvents: 'none' as const,
    ...(i === 0 ? { width: 320, height: 320, top: -80, right: -60, animation: 'floatLarge 20s ease-in-out infinite' } : {}),
    ...(i === 1 ? { width: 180, height: 180, bottom: -40, left: 80, animation: 'floatSmall 15s ease-in-out infinite' } : {}),
    ...(i === 2 ? { width: 100, height: 100, top: 20, left: '40%', animation: 'floatLarge 25s ease-in-out infinite reverse' } : {}),
  }),

  headerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    position: 'relative' as const,
    zIndex: 1,
    paddingTop: 32,
    display: 'flex',
    alignItems: 'flex-end' as const,
    gap: 28,
    flexWrap: 'wrap' as const,
  },

  avatarWrap: {
    position: 'relative' as const,
    flexShrink: 0,
  },

  avatarImg: {
    width: 112,
    height: 112,
    borderRadius: 20,
    objectFit: 'cover' as const,
    border: '4px solid rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  } as React.CSSProperties,

  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))',
    border: '4px solid rgba(255,255,255,0.25)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.4rem',
    fontWeight: 700,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  cameraBtn: {
    position: 'absolute' as const,
    bottom: -4,
    right: -4,
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: '3px solid #fff',
    background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.75rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  } as React.CSSProperties,

  headerInfo: {
    flex: 1,
    minWidth: 200,
  } as React.CSSProperties,

  nameRow: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 12,
    flexWrap: 'wrap' as const,
    marginBottom: 6,
  },

  name: {
    fontSize: '1.7rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
    margin: 0,
  } as React.CSSProperties,

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 12px',
    borderRadius: 50,
    fontSize: '0.72rem',
    fontWeight: 600,
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } as React.CSSProperties,

  headerMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 20,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.875rem',
  } as React.CSSProperties,

  headerMetaItem: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 6,
  } as React.CSSProperties,

  // Stats bar
  statsBar: {
    maxWidth: 1100,
    margin: '-24px auto 32px',
    padding: '0 32px',
    position: 'relative' as const,
    zIndex: 2,
  } as React.CSSProperties,

  statsCard: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.04)',
    padding: '20px 28px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 100,
    position: 'relative' as const,
  } as React.CSSProperties,

  statDivider: {
    width: 1,
    height: 40,
    background: '#E5E7EB',
    flexShrink: 0,
  },

  statValue: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  statLabel: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  // Content area
  content: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 32px 48px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: 24,
  } as React.CSSProperties,

  // Card
  card: {
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
    padding: 28,
    transition: 'box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
  } as React.CSSProperties,

  cardHover: {
    boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)',
    transform: 'translateY(-4px)',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  iconWrap: (color: string) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    background: color + '18',
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    flexShrink: 0,
  }),

  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, #E5E7EB, transparent)',
    margin: '20px 0',
  },

  // Form elements
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    letterSpacing: '0.01em',
  } as React.CSSProperties,

  inputWrap: {
    position: 'relative' as const,
    marginBottom: 16,
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    background: '#F9FAFB',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
    color: '#111827',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  inputFocus: {
    borderColor: '#2563EB',
    background: '#fff',
    boxShadow: '0 0 0 4px rgba(37,99,235,0.1)',
  } as React.CSSProperties,

  inputReadonly: {
    background: '#F3F4F6',
    color: '#9CA3AF',
    cursor: 'not-allowed',
    borderColor: '#E5E7EB',
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    background: '#F9FAFB',
    fontSize: '0.9rem',
    fontFamily: "'Inter', sans-serif",
    color: '#111827',
    outline: 'none',
    transition: 'all 0.2s ease',
    resize: 'vertical',
    minHeight: 130,
    lineHeight: 1.65,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  successMsg: {
    fontSize: '0.875rem',
    color: '#15803D',
    fontWeight: 500,
    marginBottom: 16,
    padding: '12px 16px',
    background: '#DCFCE7',
    borderRadius: 12,
    border: '1px solid #86EFAC',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,

  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },

  btnCancel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    border: '1.5px solid #E5E7EB',
    background: '#fff',
    color: '#6B7280',
    transition: 'all 0.2s ease',
  },

  btnSave: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 24px',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    border: 'none',
    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  // Skills
  skillsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
    minHeight: 40,
  },

  skillTag: (hue: number) => {
    const colors = [
      { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
      { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
      { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
      { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' },
      { bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
      { bg: '#FEFCE8', text: '#92400E', border: '#FDE68A' },
      { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
      { bg: '#FFF1F2', text: '#9F1239', border: '#FFE4E6' },
    ];
    const c = colors[hue % colors.length];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px 6px 12px',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      borderRadius: 50,
      fontSize: '0.8rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
    } as React.CSSProperties;
  },

  removeBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    opacity: 0.5,
    marginLeft: 2,
    transition: 'opacity 0.15s, transform 0.15s',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  // Resume card
  resumeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    background: '#F9FAFB',
    borderRadius: 14,
    border: '1px solid #F3F4F6',
    transition: 'all 0.2s ease',
    cursor: 'default',
  } as React.CSSProperties,

  resumeIcon: (color: string) => ({
    width: 44,
    height: 44,
    borderRadius: 12,
    background: color + '15',
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    flexShrink: 0,
  }),

  resumeName: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 220,
  } as React.CSSProperties,

  resumeDate: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    marginTop: 2,
  },

  manageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1.5px solid #E5E7EB',
    background: '#fff',
    color: '#6B7280',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
  },

  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#9CA3AF',
    fontSize: '0.875rem',
  },

  animFadeSlideUp: {
    animation: 'fadeSlideUp 0.45s ease both',
  },
  delay: (n: number) => ({ animationDelay: `${n * 0.08}s` }),
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function CameraButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title="Change avatar"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...s.cameraBtn,
        transform: hover ? 'scale(1.15) rotate(5deg)' : 'scale(1)',
      }}
    >
      <i className="fas fa-camera" />
    </button>
  );
}

function StatCard({ value, label, icon, color }: {
  value: string | number;
  label: string;
  icon: string;
  color: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        ...s.statItem,
        cursor: 'default',
        transition: 'transform 0.2s',
        transform: hover ? 'translateY(-3px)' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: color + '18',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        marginBottom: 4,
        transition: 'all 0.2s',
        boxShadow: hover ? `0 4px 16px ${color}30` : 'none',
      }}>
        <i className={icon} />
      </div>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [message, setMessage] = useState('');

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');

  const [bioFocused, setBioFocused] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const [expFocused, setExpFocused] = useState(false);
  const [skillFocused, setSkillFocused] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      jobSeekerService.getProfile(),
      jobSeekerService.getSkills(),
      resumeService.listResumes().catch(() => []),
    ]).then(([p, s, r]) => {
      setProfile(p);
      setBio(p.bio ?? '');
      setLocation(p.location ?? '');
      setExperienceYears(p.experienceYears ?? '');
      setSkills(Array.isArray(s) ? s : []);
      setResumes(Array.isArray(r) ? r : []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await jobSeekerService.updateProfile({
        bio,
        location,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setMessage('');
      console.error(err);
    }
    finally { setSaving(false); }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      const updated = await jobSeekerService.addSkill(newSkill.trim());
      setSkills(Array.isArray(updated) ? updated : []);
      setNewSkill('');
    } catch (err) { console.error(err); }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await jobSeekerService.removeSkill(skillId);
      setSkills(prev => prev.filter(s => s.id !== skillId));
    } catch (err) { console.error(err); }
  };

  const handleAvatarUpload = async () => {
    const file = avatarRef.current?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    try {
      await jobSeekerService.uploadAvatar(file);
      const p = await jobSeekerService.getProfile();
      setProfile(p);
    } catch (err) { console.error(err); }
  };

  const handleReset = () => {
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setExperienceYears(profile?.experienceYears ?? '');
    setMessage('');
  };

  if (loading) return <LoadingSpinner />;

  const fullName = profile?.fullName || profile?.email?.split('@')[0] || 'User';
  const email = profile?.email || '';
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || fullName.slice(0, 2).toUpperCase();

  const formatDateShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatJoinedDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  const completeness = (() => {
    let score = 0;
    if (profile?.fullName) score += 20;
    if (profile?.avatarUrl) score += 20;
    if (bio) score += 20;
    if (location) score += 20;
    if (experienceYears) score += 20;
    return score;
  })();

  const completenessLabel = completeness < 60 ? 'Incomplete' : completeness < 100 ? 'Almost there' : 'Complete';
  const completenessColor = completeness < 60 ? '#F59E0B' : completeness < 100 ? '#2563EB' : '#16A34A';

  return (
    <div style={s.page}>
      <style>{`
        @keyframes floatLarge {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes floatSmall {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-25px, 25px) rotate(120deg); }
          66% { transform: translate(20px, -15px) rotate(240deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        .hero-input:focus {
          border-color: #2563EB !important;
          background: #fff !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1) !important;
        }
        .btn-cancel-hover:hover {
          background: #F9FAFB !important;
          border-color: #D1D5DB !important;
          color: #374151 !important;
        }
        .btn-save-hover:hover:not(:disabled) {
          background: linear-gradient(135deg, #1D4ED8, #1E40AF) !important;
          box-shadow: 0 6px 20px rgba(37,99,235,0.45) !important;
          transform: translateY(-1px);
        }
        .btn-save-hover:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .btn-save-hover:disabled {
          opacity: 0.65 !important;
          cursor: not-allowed !important;
        }
        .manage-btn-hover:hover {
          background: #F3F4F6 !important;
          border-color: #D1D5DB !important;
          color: #374151 !important;
          transform: translateX(2px);
        }
        .resume-card-hover:hover {
          background: #F3F4F6 !important;
          border-color: #E5E7EB !important;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .remove-btn-hover:hover {
          opacity: 1 !important;
          transform: scale(1.2) !important;
          color: #EF4444 !important;
        }
        .skill-input-focus:focus {
          border-color: #2563EB !important;
          background: #fff !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1) !important;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>

      {/* Hero Header */}
      <section style={s.heroBg}>
        {[0, 1, 2].map(i => (
          <div key={i} style={s.heroShape(i)} />
        ))}

        <div style={s.headerInner}>
          <div style={s.avatarWrap}>
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                style={s.avatarImg}
                onError={e => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.style.cssText = Object.entries(s.avatarFallback).map(([k, v]) => `${k}:${v}`).join(';');
                    fallback.textContent = initials;
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div style={s.avatarFallback}>{initials}</div>
            )}
            <CameraButton onClick={() => avatarRef.current?.click()} />
            <input
              type="file"
              ref={avatarRef}
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>

          <div style={s.headerInfo}>
            <div style={s.nameRow}>
              <h2 style={s.name}>{fullName}</h2>
              <span style={s.statusBadge}>
                <span className="status-dot" style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: completenessColor,
                  display: 'inline-block',
                  animation: 'statusPulse 2s ease-in-out infinite',
                }} />
                {completenessLabel} {completeness}%
              </span>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', marginBottom: 14 }}>
              Job Seeker{experienceYears ? ` · ${experienceYears} ${experienceYears === 1 ? 'year' : 'years'} experience` : ''}
            </div>

            <div style={s.headerMeta}>
              <span style={s.headerMetaItem}>
                <i className="fas fa-envelope" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }} />
                {email}
              </span>
              <span style={s.headerMetaItem}>
                <i className="fas fa-map-marker-alt" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }} />
                {location || 'No location set'}
              </span>
              <span style={s.headerMetaItem}>
                <i className="fas fa-calendar-alt" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }} />
                Joined {formatJoinedDate(profile?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div style={s.statsBar}>
        <div style={s.statsCard}>
          <StatCard
            value={experienceYears || 0}
            label="Years Exp"
            icon="fas fa-briefcase"
            color="#2563EB"
          />
          <div style={s.statDivider} />
          <StatCard
            value={skills.length}
            label="Skills"
            icon="fas fa-code"
            color="#7C3AED"
          />
          <div style={s.statDivider} />
          <StatCard
            value={resumes.length}
            label="Resumes"
            icon="fas fa-file-pdf"
            color="#EF4444"
          />
          <div style={s.statDivider} />
          <StatCard
            value={`${completeness}%`}
            label="Profile"
            icon="fas fa-user-check"
            color={completenessColor}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div style={s.content}>
        {/* Left: Edit Profile */}
        <div style={{ animation: `fadeSlideUp 0.45s ease both`, animationDelay: '0.15s' }}>
          <section
            style={s.card}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              Object.assign(el.style, s.cardHover);
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = (s.card.boxShadow as string) ?? '';
              el.style.transform = 'none';
            }}
          >
            <h3 style={s.cardTitle}>
              <span style={s.iconWrap('#2563EB')}>
                <i className="fas fa-user-edit" />
              </span>
              Edit Profile
            </h3>
            <div style={s.divider} />

            <form ref={formRef} onSubmit={handleSaveProfile}>
              {/* Email — readonly */}
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    style={{ ...s.input, ...s.inputReadonly, paddingLeft: 40 }}
                  />
                  <i className="fas fa-lock" style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    fontSize: '0.8rem',
                  }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>
                  Email cannot be changed. Contact support if needed.
                </div>
              </div>

              {/* Location + Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={s.label}>
                    Location <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="e.g. Ho Chi Minh City"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      onFocus={() => setLocationFocused(true)}
                      onBlur={() => setLocationFocused(false)}
                      className={`hero-input${locationFocused ? ' hero-input-focused' : ''}`}
                      style={{
                        ...s.input,
                        paddingLeft: 38,
                        ...(locationFocused ? s.inputFocus : {}),
                      }}
                      required
                    />
                    <i className="fas fa-map-marker-alt" style={{
                      position: 'absolute',
                      left: 13,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: locationFocused ? '#2563EB' : '#9CA3AF',
                      fontSize: '0.8rem',
                      transition: 'color 0.2s',
                    }} />
                  </div>
                </div>

                <div>
                  <label style={s.label}>
                    Experience <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="Years"
                      value={experienceYears}
                      onChange={e => setExperienceYears(e.target.value ? Number(e.target.value) : '')}
                      onFocus={() => setExpFocused(true)}
                      onBlur={() => setExpFocused(false)}
                      className="hero-input"
                      style={{
                        ...s.input,
                        paddingLeft: 38,
                        ...(expFocused ? s.inputFocus : {}),
                      }}
                      required
                    />
                    <i className="fas fa-chart-line" style={{
                      position: 'absolute',
                      left: 13,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: expFocused ? '#2563EB' : '#9CA3AF',
                      fontSize: '0.8rem',
                      transition: 'color 0.2s',
                    }} />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Bio / About Me</label>
                <textarea
                  placeholder="Tell companies about yourself — your passion, expertise, and career goals..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  onFocus={() => setBioFocused(true)}
                  onBlur={() => setBioFocused(false)}
                  className="hero-input"
                  style={{
                    ...s.textarea,
                    ...(bioFocused ? s.inputFocus : {}),
                  }}
                  rows={5}
                />
                <div style={{
                  fontSize: '0.72rem',
                  color: '#9CA3AF',
                  marginTop: 4,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                  {bio.length} / 500
                </div>
              </div>

              {/* Success message */}
              {message && (
                <div style={s.successMsg}>
                  <i className="fas fa-check-circle" />
                  {message}
                </div>
              )}

              <div style={s.btnRow}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-cancel-hover"
                  style={s.btnCancel}
                >
                  <i className="fas fa-undo-alt" style={{ fontSize: '0.8rem' }} />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-save-hover"
                  style={{
                    ...s.btnSave,
                    opacity: saving ? 0.65 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '0.8rem' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" style={{ fontSize: '0.8rem' }} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right: Skills + Resumes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Skills */}
          <div style={{ animation: `fadeSlideUp 0.45s ease both`, animationDelay: '0.25s' }}>
            <section
              style={s.card}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                Object.assign(el.style, s.cardHover);
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = (s.card.boxShadow as string) ?? '';
                el.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                <h3 style={s.cardTitle}>
                  <span style={s.iconWrap('#7C3AED')}>
                    <i className="fas fa-code" />
                  </span>
                  My Skills
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  background: '#F3F4F6',
                  padding: '3px 10px',
                  borderRadius: 50,
                }}>
                  {skills.length} / 20
                </span>
              </div>
              <div style={s.divider} />

              <div style={s.skillsGrid}>
                {skills.length === 0 && (
                  <div style={{ width: '100%', textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    No skills yet. Start typing below!
                  </div>
                )}
                {skills.map((skill, i) => (
                  <span
                    key={skill.id}
                    style={s.skillTag(i)}
                  >
                    <i className="fas fa-tag" style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                    {skill.name}
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="remove-btn-hover"
                      style={s.removeBtn}
                      title={`Remove ${skill.name}`}
                    >
                      <i className="fas fa-times" style={{ fontSize: '0.65rem' }} />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  ref={skillInputRef}
                  type="text"
                  placeholder="Add a skill (e.g. React, Python, Design)..."
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }
                  }}
                  onFocus={() => setSkillFocused(true)}
                  onBlur={() => setSkillFocused(false)}
                  className="skill-input-focus"
                  style={{
                    ...s.input,
                    paddingLeft: 38,
                    borderRadius: 12,
                    ...(skillFocused ? s.inputFocus : {}),
                  }}
                  maxLength={50}
                />
                <i className="fas fa-plus" style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: skillFocused ? '#7C3AED' : '#9CA3AF',
                  fontSize: '0.8rem',
                  transition: 'color 0.2s',
                }} />
              </div>
              {newSkill.trim() && (
                <div style={{ fontSize: '0.72rem', color: '#7C3AED', marginTop: 6, fontWeight: 500 }}>
                  <i className="fas fa-arrow-up" style={{ marginRight: 4, fontSize: '0.65rem' }} />
                  Press Enter to add "{newSkill.trim()}"
                </div>
              )}
            </section>
          </div>

          {/* Resumes */}
          <div style={{ animation: `fadeSlideUp 0.45s ease both`, animationDelay: '0.35s' }}>
            <section
              style={s.card}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                Object.assign(el.style, s.cardHover);
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = (s.card.boxShadow as string) ?? '';
                el.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                <h3 style={s.cardTitle}>
                  <span style={s.iconWrap('#EF4444')}>
                    <i className="fas fa-file-pdf" />
                  </span>
                  My Resumes
                </h3>
                <button
                  onClick={() => navigate('/resumes')}
                  className="manage-btn-hover"
                  style={s.manageBtn}
                >
                  Manage <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                </button>
              </div>
              <div style={s.divider} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {resumes.length === 0 ? (
                  <div style={s.emptyState}>
                    <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4, display: 'block' }} />
                    No resumes uploaded yet.
                    <br />
                    <span style={{ fontSize: '0.78rem' }}>Upload your first resume to stand out.</span>
                  </div>
                ) : (
                  resumes.slice(0, 3).map(r => {
                    const isPdf = r.label?.toLowerCase().includes('.pdf') || true;
                    const color = isPdf ? '#EF4444' : '#2563EB';
                    return (
                      <div
                        key={r.id}
                        className="resume-card-hover"
                        style={s.resumeCard}
                      >
                        <div style={s.resumeIcon(color)}>
                          <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file-word'}`} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.resumeName}>{r.label || 'Resume Document'}</div>
                          <div style={s.resumeDate}>
                            <i className="fas fa-clock" style={{ marginRight: 4, fontSize: '0.65rem' }} />
                            {formatDateShort(r.createdAt)}
                          </div>
                        </div>
                        {r.isPrimary && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#2563EB',
                            background: '#EFF6FF',
                            padding: '3px 10px',
                            borderRadius: 50,
                            border: '1px solid #BFDBFE',
                            whiteSpace: 'nowrap' as const,
                          }}>
                            Primary
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {resumes.length > 3 && (
                <button
                  onClick={() => navigate('/resumes')}
                  className="manage-btn-hover"
                  style={{
                    ...s.manageBtn,
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 12,
                  }}
                >
                  View all {resumes.length} resumes <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
