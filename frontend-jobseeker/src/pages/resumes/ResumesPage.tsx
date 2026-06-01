import { useEffect, useState, useRef } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { resumeService } from '../../services/resumeService';
import type { Resume } from '../../types/resume';

interface PreviewModalProps {
  resume: Resume;
  onClose: () => void;
}

function PreviewModal({ resume, onClose }: PreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setIframeError(false);

    // publicUrl is already available — resolve loading immediately.
    // Fallback timeout ensures we don't get stuck if the iframe never fires onLoad.
    const timer = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(timer);
  }, [resume.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDownload = () => {
    if (resume.publicUrl) window.open(resume.publicUrl, '_blank');
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-file-pdf" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                {resume.label || 'Resume Preview'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>
                {resume.publicUrl ? 'PDF document' : 'Loading preview...'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDownload}
              disabled={!resume.publicUrl}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                border: '1.5px solid #E5E7EB',
                background: '#fff', color: '#374151',
                fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
                cursor: resume.publicUrl ? 'pointer' : 'not-allowed',
                opacity: resume.publicUrl ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (resume.publicUrl) {
                  (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                  (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
                (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
              }}
            >
              <i className="fas fa-download" /> Download
            </button>
            <button
              onClick={onClose}
              style={{
                width: '34px', height: '34px', borderRadius: '8px',
                border: 'none', background: '#F3F4F6', color: '#6B7280',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                (e.currentTarget as HTMLElement).style.color = '#EF4444';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                (e.currentTarget as HTMLElement).style.color = '#6B7280';
              }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Preview Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#F3F4F6' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
            }}>
              <div style={{
                width: '44px', height: '44px',
                border: '3px solid #E5E7EB',
                borderTopColor: '#2563EB',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Loading preview...</p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#FEE2E2', color: '#EF4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
              }}>
                <i className="fas fa-exclamation-circle" />
              </div>
              <p style={{ margin: 0, color: '#EF4444', fontSize: '0.9rem', fontWeight: 500 }}>{error}</p>
              <button
                onClick={handleDownload}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  border: 'none', background: '#EF4444', color: '#fff',
                  fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DC2626'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#EF4444'}
              >
                <i className="fas fa-download" style={{ marginRight: '6px' }} />Download Instead
              </button>
            </div>
          )}

          {resume.publicUrl && !error && (
            <>
              {iframeError ? (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: '#FEF3C7', color: '#D97706',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>
                    <i className="fas fa-file-pdf" />
                  </div>
                  <p style={{ margin: 0, color: '#92400E', fontSize: '0.9rem', fontWeight: 500 }}>
                    Preview is not available in this browser.
                  </p>
                  <button
                    onClick={handleDownload}
                    style={{
                      padding: '8px 20px', borderRadius: '8px',
                      border: 'none', background: '#D97706', color: '#fff',
                      fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#B45309'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#D97706'}
                  >
                    <i className="fas fa-download" style={{ marginRight: '6px' }} />Open / Download
                  </button>
                </div>
              ) : (
                <iframe
                  key={resume.publicUrl}
                  src={`${resume.publicUrl}#toolbar=0&navpanes=0`}
                  title="Resume Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setIframeError(true); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      await resumeService.upload(selectedFile, uploadName || selectedFile.name);
      setSelectedFile(null);
      setUploadName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchResumes();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setUploadName(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setUploadName(baseName);
    }
  };

  const handleDownload = (id: string, publicUrl: string) => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    } else {
      resumeService.download(id).then(url => window.open(url, '_blank')).catch(console.error);
    }
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

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = async (id: string) => {
    try {
      await resumeService.replace(id, undefined, editingName.trim() || undefined);
      setEditingId(null);
      setEditingName('');
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

  const filteredResumes = resumes.filter(r =>
    (r.label || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {previewResume && (
        <PreviewModal
          resume={previewResume}
          onClose={() => setPreviewResume(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="My Resumes"
        subtitle="Upload and manage your resumes for job applications."
      />

      {/* Quick Upload Card */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary flex-shrink-0">
            <i className="fas fa-cloud-upload-alt" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Quick Upload</h3>
            <p className="text-sm text-gray-400">Drag &amp; drop or browse to upload your resume</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dropzone */}
          <div
            style={{
              border: `2px dashed ${dragOver ? '#2563EB' : selectedFile ? '#22C55E' : '#93C5FD'}`,
              borderRadius: '12px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: dragOver ? '#EFF6FF' : selectedFile ? '#F0FDF4' : '#FAFBFF',
              opacity: uploading ? 0.6 : 1,
              pointerEvents: uploading ? 'none' : 'auto',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '50%',
              background: selectedFile ? 'rgba(34, 197, 94, 0.1)' : '#DBEAFE',
              color: selectedFile ? '#22C55E' : '#2563EB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              marginBottom: '14px',
              transition: 'all 0.2s',
            }}>
              {selectedFile ? <i className="fas fa-check" /> : <i className="fas fa-arrow-up" />}
            </div>

            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: '3px solid #E5E7EB',
                  borderTopColor: '#2563EB',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>Uploading your resume...</p>
              </div>
            ) : selectedFile ? (
              <div style={{ color: '#111827' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '1rem' }}>{selectedFile.name}</p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#22C55E', fontWeight: 500 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '4px' }} />
                  File selected — {formatSize(selectedFile.size)}
                </p>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#374151' }}>
                  Drag & drop your resume here, or <span style={{ color: '#2563EB', fontWeight: 600 }}>browse files</span>
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#9CA3AF' }}>Supports PDF, DOC, DOCX — Max 5MB</p>
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

          {/* Resume Name Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Resume Name <span style={{ color: '#D1D5DB', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="e.g., Software Engineer Resume 2026"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1.5px solid #E5E7EB',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                color: '#111827',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box',
                opacity: uploading ? 0.6 : 1,
                pointerEvents: uploading ? 'none' : 'auto',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                (e.target as HTMLElement).style.borderColor = '#2563EB';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={e => {
                (e.target as HTMLElement).style.borderColor = '#E5E7EB';
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => { setSelectedFile(null); setUploadName(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '10px',
                cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
                border: '1.5px solid #E5E7EB',
                background: '#FFFFFF', color: !selectedFile ? '#D1D5DB' : '#6B7280',
                transition: 'all 0.15s',
                opacity: !selectedFile || uploading ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (selectedFile && !uploading) {
                  (e.currentTarget as HTMLElement).style.background = '#F9FAFB';
                  (e.currentTarget as HTMLElement).style.color = '#111827';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#FFFFFF';
                (e.currentTarget as HTMLElement).style.color = '#6B7280';
              }}
            >
              <i className="fas fa-undo-alt" /> Reset
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 22px', borderRadius: '10px',
                cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
                border: 'none',
                background: !selectedFile || uploading ? '#9CA3AF' : '#2563EB',
                color: '#FFFFFF',
                boxShadow: !selectedFile || uploading ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (selectedFile && !uploading) {
                  (e.currentTarget as HTMLElement).style.background = '#1D4ED8';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#2563EB';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.25)';
              }}
            >
              <i className="fas fa-upload" /> Upload Resume
            </button>
          </div>
        </div>
      </section>

      {/* All Resumes Table */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">All Resumes</h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
              {filteredResumes.length} {filteredResumes.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-gray-100 bg-gray-50/80 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all w-48"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon="fa-file-pdf"
            title="No resumes uploaded yet"
            description="Upload your first resume to start applying to jobs with confidence."
            className="py-12"
          />
        ) : filteredResumes.length === 0 ? (
          <div className="py-12 text-center">
            <i className="fas fa-search text-3xl text-gray-200 mb-3 block" />
            <p className="text-sm font-medium text-gray-500">
              No resumes match "<span className="text-gray-700">{searchQuery}</span>"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {[
                    { label: 'Resume Name', align: 'text-left' },
                    { label: 'Upload Date', align: 'text-left' },
                    { label: 'Last Updated', align: 'text-left' },
                    { label: 'Size', align: 'text-left' },
                    { label: '', align: 'text-right' },
                  ].map((h) => (
                    <th key={h.label || 'actions'} className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 ${h.align}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResumes.map((r) => {
                  const isPdf = !r.label || r.label.toLowerCase().endsWith('.pdf') || !r.label.includes('.');
                  return (
                    <tr
                      key={r.id}
                      className="group border-b border-gray-50 last:border-0 transition-colors duration-150 hover:bg-blue-50/30"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                            isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                          }`}>
                            <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file-word'}`} />
                          </div>
                          {editingId === r.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEditing(r.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border-2 border-primary text-sm text-gray-900 outline-none shadow-sm"
                              style={{ fontFamily: 'inherit' }}
                            />
                          ) : (
                            <div>
                              <span className="font-semibold text-gray-900 text-sm block mb-0.5">
                                {r.label || 'Untitled_Resume.pdf'}
                              </span>
                              {r.isPrimary && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                                  <i className="fas fa-star text-[9px]" /> Primary
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <span className="text-sm text-gray-500">{formatDate(r.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <span className="text-sm text-gray-400">{r.updatedAt ? formatDate(r.updatedAt) : '—'}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-sm text-gray-400">{formatSize(r.fileSize)}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {editingId === r.id ? (
                            <>
                              <button
                                onClick={() => saveEditing(r.id)}
                                title="Save"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: '#DBEAFE', color: '#2563EB', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#BFDBFE'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#DBEAFE'}
                              ><i className="fas fa-check" /></button>
                              <button
                                onClick={cancelEditing}
                                title="Cancel"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: '#F3F4F6', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E5E7EB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F6'}
                              ><i className="fas fa-times" /></button>
                            </>
                          ) : (
                            <>
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewResume(r)}
                                title="Preview resume"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: 'transparent', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLElement).style.background = '#F0F4FF';
                                  (e.currentTarget as HTMLElement).style.color = '#7C3AED';
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = '#6B7280';
                                }}
                              ><i className="fas fa-eye" /></button>

                              {/* Download */}
                              <button
                                onClick={() => handleDownload(r.id, r.publicUrl)}
                                title="Download"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: 'transparent', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                                  (e.currentTarget as HTMLElement).style.color = '#2563EB';
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = '#6B7280';
                                }}
                              ><i className="fas fa-download" /></button>

                              {/* Set Primary */}
                              {!r.isPrimary && (
                                <button
                                  onClick={() => handleSetPrimary(r.id)}
                                  title="Set as primary"
                                  style={{
                                    width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                    background: 'transparent', color: '#6B7280', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = '#FFFBEB';
                                    (e.currentTarget as HTMLElement).style.color = '#D97706';
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#6B7280';
                                  }}
                                ><i className="fas fa-star" /></button>
                              )}

                              {/* Edit name */}
                              <button
                                onClick={() => startEditing(r.id, r.label || '')}
                                title="Edit name"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: 'transparent', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                                  (e.currentTarget as HTMLElement).style.color = '#111827';
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = '#6B7280';
                                }}
                              ><i className="fas fa-pen" /></button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(r.id)}
                                title="Delete"
                                style={{
                                  width: '32px', height: '32px', border: 'none', borderRadius: '8px',
                                  background: 'transparent', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                                  (e.currentTarget as HTMLElement).style.color = '#EF4444';
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = '#6B7280';
                                }}
                              ><i className="fas fa-trash" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
