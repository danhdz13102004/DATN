import { useEffect, useState, useRef } from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { resumeService } from '../../services/resumeService';
import type { Resume } from '../../types/resume';

// Shared design tokens
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f4',
  borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  marginBottom: '24px'
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid #eef0f4',
};

const theadTh: React.CSSProperties = {
  padding: '16px 24px', textAlign: 'left',
  fontSize: '0.72rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: '#8b92a8', borderBottom: '1px solid #e2e6ed',
  background: '#f4f6fa', whiteSpace: 'nowrap',
};

const tbodyTd: React.CSSProperties = {
  padding: '16px 24px', fontSize: '0.88rem',
  borderBottom: '1px solid #eef0f4', color: '#1a1d26', verticalAlign: 'middle'
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

const iconBtn: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', background: 'transparent', cursor: 'pointer',
  color: '#8b92a8', transition: 'all 0.2s', fontSize: '0.9rem',
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = () => {
    setLoading(true);
    resumeService.listResumes()
      .then(setResumes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload first.');
      return;
    }
    setUploading(true);
    try {
      // Use filename as label label for now since design removed the input
      await resumeService.upload(selectedFile, selectedFile.name);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchResumes();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDownload = async (id: string) => {
    try {
      const url = await resumeService.download(id);
      window.open(url, '_blank');
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume?')) return;
    try {
      await resumeService.delete(id);
      fetchResumes();
    } catch (err) { console.error(err); }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await resumeService.setPrimary(id);
      fetchResumes();
    } catch (err) { console.error(err); }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#1a1d26' }}>My Resumes</h2>
          <p style={{ color: '#5f6780', fontSize: '0.9rem', marginTop: '2px', margin: 0 }}>Upload and manage your resumes for job applications</p>
        </div>
        {/* <button
          style={primaryBtn}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#2b6de0';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = '#4287f5';
            (e.currentTarget as HTMLElement).style.transform = 'none';
          }}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          <i className="fas fa-upload" /> Upload New Resume
        </button> */}
      </div>

      {/* Quick Upload Card */}
      <section style={{ ...cardStyle, padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a1d26', margin: '0 0 20px 0' }}>Quick Upload</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dropzone */}
          <div
            style={{
              border: `2px dashed ${dragOver ? '#4287f5' : '#4287f5'}`,
              borderRadius: '10px', padding: '40px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              background: dragOver ? 'rgba(66,135,245,0.08)' : '#fff',
              opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto'
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onMouseEnter={e => {
              if (!dragOver) (e.currentTarget as HTMLElement).style.background = 'rgba(66,135,245,0.04)';
            }}
            onMouseLeave={e => {
              if (!dragOver) (e.currentTarget as HTMLElement).style.background = '#fff';
            }}
          >
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', background: '#8b92a8', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '12px' 
            }}>
              <i className="fas fa-arrow-up" />
            </div>
            
            {uploading ? (
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1a1d26', fontWeight: 500 }}>
                <span className="w-4 h-4 border-2 border-[#e2e6ed] border-t-primary rounded-full animate-spin inline-block mr-2" style={{ verticalAlign: 'middle' }} />
                Uploading...
              </p>
            ) : selectedFile ? (
              <div style={{ color: '#1a1d26' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{selectedFile.name}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#8b92a8' }}>{formatSize(selectedFile.size)}</p>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#5f6780' }}>
                  Drag & drop your resume here, or <span style={{ color: '#4287f5', fontWeight: 600 }}>browse files</span>
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#8b92a8' }}>Supports PDF, DOC, DOCX — Max 5MB</p>
              </>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              style={ghostBtn}
              onClick={() => setSelectedFile(null)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#f4f6fa';
                (e.currentTarget as HTMLElement).style.color = '#1a1d26';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.color = '#5f6780';
              }}
              disabled={!selectedFile || uploading}
            >
              Cancel
            </button>
            <button
              style={{ ...primaryBtn, opacity: (!selectedFile || uploading) ? 0.6 : 1, cursor: (!selectedFile || uploading) ? 'not-allowed' : 'pointer', boxShadow: 'none' }}
              onClick={handleUploadSubmit}
              disabled={!selectedFile || uploading}
            >
              <i className="fas fa-upload" /> Upload Resume
            </button>
          </div>
        </div>
      </section>

      {/* All Resumes Table */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a1d26', margin: 0 }}>All Resumes</h3>
          <span style={{ 
            background: '#f4f6fa', color: '#5f6780', padding: '4px 10px', 
            borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600 
          }}>
            {resumes.length} resumes
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px' }}><LoadingSpinner /></div>
        ) : resumes.length === 0 ? (
          <div style={{ padding: '60px 24px' }}>
            <EmptyState icon="fa-file-pdf" title="No resumes uploaded" description="Upload your resume to start applying to jobs." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '0 0 14px 14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['File Name', 'Upload Date', 'Size', 'Actions'].map((h, i) => (
                    <th key={h} style={{ ...theadTh, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resumes.map(r => {
                  const isPdf = r.label?.toLowerCase().includes('.pdf') || true;
                  return (
                    <tr 
                      key={r.id} 
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fb'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={tbodyTd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '6px',
                            background: isPdf ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                            color: isPdf ? '#ef4444' : '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file-word'}`} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1a1d26', display: 'block', marginBottom: '2px' }}>
                              {r.label || 'Untitled_Resume.pdf'}
                            </span>
                            {r.isPrimary && (
                              <span style={{ fontSize: '0.75rem', color: '#2b6de0', fontWeight: 500 }}>
                                <i className="fas fa-star" style={{ fontSize: '0.65rem', marginRight: '4px' }}/> Primary
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tbodyTd, color: '#5f6780' }}>{formatDate(r.createdAt)}</td>
                      <td style={{ ...tbodyTd, color: '#5f6780' }}>{formatSize(r.fileSize)}</td>
                      <td style={{ ...tbodyTd, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            style={iconBtn} title="Download"
                            onClick={() => handleDownload(r.id)}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f6fa'; (e.currentTarget as HTMLElement).style.color = '#4287f5'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b92a8'; }}
                          ><i className="fas fa-download" /></button>
                          
                          <button
                            style={iconBtn} title="Set as primary"
                            onClick={() => handleSetPrimary(r.id)}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f6fa'; (e.currentTarget as HTMLElement).style.color = '#1a1d26'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b92a8'; }}
                          ><i className="fas fa-pen" /></button>
                          
                          <button
                            style={iconBtn} title="Delete"
                            onClick={() => handleDelete(r.id)}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.08)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b92a8'; }}
                          ><i className="fas fa-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
