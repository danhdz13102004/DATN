import { useEffect, useState, useRef } from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { jobSeekerService } from '../../services/jobSeekerService';
import { resumeService } from '../../services/resumeService';
import { useNavigate } from 'react-router-dom';
import type { JobSeekerProfile } from '../../types/jobseeker';
import type { Skill } from '../../types/job';
import type { Resume } from '../../types/resume';

// Shared tokens
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f4',
  borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  padding: '24px', marginBottom: '24px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e6ed',
  borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.9rem',
  color: '#1a1d26', outline: 'none', transition: 'all 0.2s',
  background: '#fff'
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
  fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
  border: 'none', background: '#4287f5', color: '#fff',
  boxShadow: '0 2px 8px rgba(66,135,245,0.25)', transition: 'all 0.2s',
};

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
  fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
  border: '1.5px solid #e2e6ed', background: '#fff', color: '#5f6780',
  transition: 'all 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.85rem', fontWeight: 600,
  marginBottom: '6px', color: '#1a1d26'
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [message, setMessage] = useState('');

  // Form states
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');

  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      jobSeekerService.getProfile(),
      jobSeekerService.getSkills(),
      resumeService.listResumes().catch(() => []), // gracefully handle errors
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
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { console.error(err); }
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
    
    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    try {
      await jobSeekerService.uploadAvatar(file);
      // Refresh profile
      const p = await jobSeekerService.getProfile();
      setProfile(p);
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner />;

  const fullName = profile?.fullName || profile?.email?.split('@')[0] || 'User';
  const email = profile?.email || '';
  const initials = fullName.slice(0, 2).toUpperCase();

  const formatDateShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatJoinedDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  return (
    <div>
      {/* Profile Header Block */}
      <section style={{
        ...cardStyle, display: 'flex', alignItems: 'center', gap: '32px', padding: '32px'
      }}>
        <div style={{ position: 'relative' }}>
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" style={{
              width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }} />
          ) : (
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: '#4287f5', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: 700,
              boxShadow: '0 4px 16px rgba(66, 135, 245, 0.25)'
            }}>
              {initials}
            </div>
          )}
          <button
            title="Change avatar"
            onClick={() => avatarRef.current?.click()}
            style={{
              position: 'absolute', bottom: '0px', right: '0px',
              width: '34px', height: '34px', borderRadius: '50%',
              border: '2px solid #fff', background: '#4287f5', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <i className="fas fa-camera" />
          </button>
          <input type="file" ref={avatarRef} accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px 0', color: '#1a1d26' }}>
            {fullName}
          </h2>
          <div style={{ color: '#5f6780', fontSize: '0.95rem', marginBottom: '12px' }}>
            Job Seeker {experienceYears ? `— ${experienceYears} years experience` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#8b92a8', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-envelope" /> {email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-map-marker-alt" /> {location || 'No location set'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-briefcase" /> {experienceYears || 0} years</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-calendar" /> Joined {formatJoinedDate(profile?.createdAt)}</span>
          </div>
        </div>
      </section>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '24px' }}>
        
        {/* Left Column */}
        <div>
          <section style={{ ...cardStyle }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1d26', margin: '0 0 20px 0' }}>
              <i className="fas fa-user-edit" style={{ color: '#4287f5', marginRight: '8px' }} />
              Edit Profile
            </h3>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" readOnly value={email}
                  style={{ ...inputStyle, background: '#f4f6fa', color: '#8b92a8', borderColor: '#e2e6ed', cursor: 'not-allowed' }}
                />
                <div style={{ fontSize: '0.78rem', color: '#8b92a8', marginTop: '4px' }}>Email cannot be changed. Contact support if needed.</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Location <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" placeholder="Your city or region"
                    value={location} onChange={e => setLocation(e.target.value)}
                    style={inputStyle} required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Experience (Years) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number" min="0" max="50" placeholder="e.g. 3"
                    value={experienceYears} onChange={e => setExperienceYears(e.target.value ? Number(e.target.value) : '')}
                    style={inputStyle} required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Bio</label>
                <textarea
                  rows={5}
                  placeholder="Tell companies about yourself, your passion, and career goals..."
                  value={bio} onChange={e => setBio(e.target.value)}
                  style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              {message && <p style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: 500, marginBottom: '16px' }}>{message}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" style={ghostBtn} onClick={() => {
                  setBio(profile?.bio ?? ''); setLocation(profile?.location ?? ''); setExperienceYears(profile?.experienceYears ?? '');
                }}>Cancel</button>
                <button type="submit" style={primaryBtn} disabled={saving}>
                  <i className="fas fa-save" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column */}
        <div>
          {/* Skills Section */}
          <section style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1d26', margin: 0 }}>
                <i className="fas fa-code" style={{ color: '#4287f5', marginRight: '8px' }} />
                My Skills
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {skills.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#8b92a8', width: '100%', marginBottom: '8px' }}>No skills added yet.</div>
              ) : (
                skills.map(skill => (
                  <span key={skill.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', background: 'rgba(66,135,245,0.08)',
                    color: '#1a56c4', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 500
                  }}>
                    {skill.name}
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.6 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <i className="fas fa-times" style={{ fontSize: '0.7rem' }} />
                    </button>
                  </span>
                ))
              )}
            </div>
            
            <input
              type="text" placeholder="Type a skill and press Enter..."
              value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}}
              style={inputStyle}
            />
          </section>

          {/* Resumes Quick View */}
          <section style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1d26', margin: 0 }}>
                <i className="fas fa-file-pdf" style={{ color: '#ef4444', marginRight: '8px' }} />
                My Resumes
              </h3>
              <button onClick={() => navigate('/resumes')} style={{ ...ghostBtn, padding: '6px 14px', fontSize: '0.82rem' }}>
                Manage <i className="fas fa-arrow-right" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resumes.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#8b92a8', fontSize: '0.85rem' }}>No resumes uploaded.</div>
              ) : (
                resumes.slice(0, 3).map(r => {
                  const isPdf = r.label?.toLowerCase().includes('.pdf') || true; // simple guess
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', background: '#f4f6fa', borderRadius: '6px'
                    }}>
                      <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: isPdf ? '#ef4444' : '#3b82f6', fontSize: '1.1rem' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1d26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.label || 'Resume Document'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#8b92a8' }}>
                          {formatDateShort(r.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
