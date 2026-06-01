import { useRef } from 'react';
import type { JobFilter } from '../../types/job';

const JOB_TYPES = ['FULLTIME', 'PARTTIME', 'REMOTE', 'HYBRID'];
const EXP_LEVELS = ['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEADER'];

interface JobFilterPanelProps {
  draftFilters: JobFilter;
  onDraftChange: (f: JobFilter) => void;
  onApply: () => void;
}

function SalaryRangeSlider({
  draftFilters,
  onDraftChange,
}: {
  draftFilters: JobFilter;
  onDraftChange: (f: JobFilter) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const minVal = draftFilters.salaryMin ?? 0;
  const maxVal = draftFilters.salaryMax ?? 10000;
  const rangeStart = (minVal / 10000) * 100;
  const rangeEnd = (maxVal / 10000) * 100;

  const fmt = (v: number) => `$${v.toLocaleString()}`;

  const handleMinDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;

    const onMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaVal = (deltaX / rect.width) * 10000;
      const currentMax = draftFilters.salaryMax ?? 10000;
      let newMin = Math.max(0, Math.min(minVal + deltaVal, currentMax - 1000));
      newMin = Math.round(newMin / 500) * 500;
      onDraftChange({ ...draftFilters, salaryMin: newMin });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleMaxDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;

    const onMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaVal = (deltaX / rect.width) * 10000;
      const currentMin = draftFilters.salaryMin ?? 0;
      let newMax = Math.min(10000, Math.max(maxVal + deltaVal, currentMin + 1000));
      newMax = Math.round(newMax / 500) * 500;
      onDraftChange({ ...draftFilters, salaryMax: newMax });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const hasSalary = draftFilters.salaryMin != null || draftFilters.salaryMax != null;

  return (
    <div style={{
      marginTop: 16,
      padding: '18px 22px',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
      borderRadius: 16,
      border: '1px solid #E2E7F0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {/* Left: Icon + Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
            flexShrink: 0,
          }}>
            <i className="fas fa-dollar-sign" style={{ color: '#FFFFFF', fontSize: '0.9rem' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Salary Range
            </p>
            <p style={{ margin: 0, fontSize: '0.88rem', color: hasSalary ? '#0F172A' : '#94A3B8', fontWeight: hasSalary ? 700 : 400 }}>
              {hasSalary ? `${fmt(minVal)} – ${fmt(maxVal)}` : 'Any salary range'}
            </p>
          </div>
        </div>

        {/* Right: Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 280px', justifyContent: 'flex-end' }}>
          <div
            ref={containerRef}
            style={{ position: 'relative', height: 32, minWidth: 200, flex: 1, maxWidth: 340 }}
          >
            {/* Background Track */}
            <div style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '100%',
              height: 6,
              background: '#E2E7F0',
              borderRadius: 3,
            }} />
            {/* Active Range */}
            <div style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: `${rangeStart}%`,
              width: `${rangeEnd - rangeStart}%`,
              height: 6,
              background: 'linear-gradient(90deg, #10B981, #34D399)',
              borderRadius: 3,
            }} />
            {/* Min Thumb */}
            <div
              onMouseDown={handleMinDrag}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${rangeStart}%`,
                width: 20,
                height: 20,
                background: '#FFFFFF',
                border: '3px solid #10B981',
                borderRadius: '50%',
                cursor: 'grab',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.3)'; }}
            />
            {/* Max Thumb */}
            <div
              onMouseDown={handleMaxDrag}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${rangeEnd}%`,
                width: 20,
                height: 20,
                background: '#FFFFFF',
                border: '3px solid #10B981',
                borderRadius: '50%',
                cursor: 'grab',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.3)'; }}
            />
          </div>

          {/* Clear */}
          {hasSalary && (
            <button
              onClick={() => onDraftChange({ ...draftFilters, salaryMin: undefined, salaryMax: undefined })}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                cursor: 'pointer',
                color: '#64748B',
                fontSize: '0.78rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                (e.currentTarget as HTMLElement).style.borderColor = '#FECACA';
                (e.currentTarget as HTMLElement).style.color = '#DC2626';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
                (e.currentTarget as HTMLElement).style.color = '#64748B';
              }}
            >
              <i className="fas fa-times" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobFilterPanel({ draftFilters, onDraftChange, onApply }: JobFilterPanelProps) {
  const hasFilters = !!(
    draftFilters.keyword ||
    draftFilters.jobType ||
    draftFilters.experienceLevels?.[0] ||
    draftFilters.location ||
    draftFilters.salaryMin != null ||
    draftFilters.salaryMax != null
  );

  const handleReset = () => {
    onDraftChange({ page: 1, size: 12 });
    onApply();
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E7F0',
      borderRadius: 20,
      padding: '22px 26px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Top row: search + dropdowns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <i className="fas fa-search" style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#2563EB',
            fontSize: '1rem',
            zIndex: 1,
          }} />
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              border: '2px solid #E2E7F0',
              borderRadius: 14,
              fontSize: '0.95rem',
              color: '#0F172A',
              outline: 'none',
              background: '#F8FAFC',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              (e.target as HTMLElement).style.borderColor = '#2563EB';
              (e.target as HTMLElement).style.background = '#FFFFFF';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={e => {
              (e.target as HTMLElement).style.borderColor = '#E2E7F0';
              (e.target as HTMLElement).style.background = '#F8FAFC';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
            value={draftFilters.keyword ?? ''}
            onChange={e => onDraftChange({ ...draftFilters, keyword: e.target.value || undefined })}
            onKeyDown={e => { if (e.key === 'Enter') onApply(); }}
          />
        </div>

        {/* Job Type */}
        <div style={{ position: 'relative', flex: '0 0 auto', minWidth: 150 }}>
          <i className="fas fa-briefcase" style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <select
            style={{
              padding: '12px 38px 12px 38px',
              border: '1.5px solid #E2E7F0',
              borderRadius: 12,
              fontSize: '0.875rem',
              color: draftFilters.jobType ? '#0F172A' : '#94A3B8',
              outline: 'none',
              background: '#F8FAFC',
              cursor: 'pointer',
              fontFamily: 'inherit',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              minWidth: '100%',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => {
              (e.target as HTMLElement).style.borderColor = '#2563EB';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={e => {
              (e.target as HTMLElement).style.borderColor = '#E2E7F0';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E2E7F0'; }}
            value={draftFilters.jobType ?? ''}
            onChange={e => onDraftChange({ ...draftFilters, jobType: e.target.value || undefined })}
          >
            <option value="">Job Type</option>
            {JOB_TYPES.map(t => (
              <option key={t} value={t}>
                {t.replace('FULLTIME', 'Full-time').replace('PARTTIME', 'Part-time').replace('REMOTE', 'Remote').replace('HYBRID', 'Hybrid')}
              </option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div style={{ position: 'relative', flex: '0 0 auto', minWidth: 150 }}>
          <i className="fas fa-layer-group" style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <select
            style={{
              padding: '12px 38px 12px 38px',
              border: '1.5px solid #E2E7F0',
              borderRadius: 12,
              fontSize: '0.875rem',
              color: draftFilters.experienceLevels?.[0] ? '#0F172A' : '#94A3B8',
              outline: 'none',
              background: '#F8FAFC',
              cursor: 'pointer',
              fontFamily: 'inherit',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              minWidth: '100%',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => {
              (e.target as HTMLElement).style.borderColor = '#2563EB';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={e => {
              (e.target as HTMLElement).style.borderColor = '#E2E7F0';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E2E7F0'; }}
            value={draftFilters.experienceLevels?.[0] ?? ''}
            onChange={e => onDraftChange({ ...draftFilters, experienceLevels: e.target.value ? [e.target.value] : undefined })}
          >
            <option value="">Experience</option>
            {EXP_LEVELS.map(l => (
              <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div style={{ position: 'relative', flex: '0 0 auto', minWidth: 150 }}>
          <i className="fas fa-map-marker-alt" style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <input
            type="text"
            placeholder="City, Remote..."
            style={{
              padding: '12px 14px 12px 38px',
              border: '1.5px solid #E2E7F0',
              borderRadius: 12,
              fontSize: '0.875rem',
              color: '#0F172A',
              outline: 'none',
              background: '#F8FAFC',
              fontFamily: 'inherit',
              minWidth: '100%',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              (e.target as HTMLElement).style.borderColor = '#2563EB';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={e => {
              (e.target as HTMLElement).style.borderColor = '#E2E7F0';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E2E7F0'; }}
            value={draftFilters.location ?? ''}
            onChange={e => onDraftChange({ ...draftFilters, location: e.target.value || undefined })}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {hasFilters && (
            <button
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: '#FFF7ED',
                border: '1.5px solid #FED7AA',
                borderRadius: 12,
                cursor: 'pointer',
                color: '#C2410C',
                fontSize: '0.82rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#FFEDD5';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#FFF7ED';
              }}
            >
              <i className="fas fa-arrow-rotate-left" style={{ fontSize: '0.75rem' }} />
              Reset
            </button>
          )}

          <button
            onClick={onApply}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
            }}
          >
            <i className="fas fa-magnifying-glass" style={{ fontSize: '0.85rem' }} />
            Search
          </button>
        </div>
      </div>

      {/* Salary Range Row */}
      <SalaryRangeSlider draftFilters={draftFilters} onDraftChange={onDraftChange} />
    </div>
  );
}
