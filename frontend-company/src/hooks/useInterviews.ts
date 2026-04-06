import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewService } from '../services/interviewService';
import type { Interview, InterviewFormData } from '../types/interview';

// ── Helpers ──────────────────────────────────────────────

/** Split an ISO Instant string into separate date and time strings (local timezone). */
export function splitScheduledTime(isoString: string): { scheduledDate: string; scheduledTime: string } {
  const dt = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  const scheduledDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const scheduledTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return { scheduledDate, scheduledTime };
}

/**
 * Enrich a raw backend Interview with computed display fields.
 * InterviewsPage.tsx uses applicantName, applicantInitials, scheduledDate, scheduledTime.
 */
function enrichInterview(iv: Interview) {
  const { scheduledDate, scheduledTime } = splitScheduledTime(iv.scheduledTime);
  const name = iv.candidateName || iv.candidateEmail || '?';
  const initials = name
    .split(/[\s@]/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? '')
    .join('');
  return {
    ...iv,
    // Aliases expected by InterviewsPage list & detail modal
    applicantName: name,
    applicantEmail: iv.candidateEmail,
    applicantInitials: initials,
    notes: iv.note,      // InterviewsPage references both; provide both
    // Split date/time for table display (suffixed to avoid overwriting the ISO string)
    scheduledDate,
    scheduledTimeDisplay: scheduledTime,
    // NOTE: iv.scheduledTime (ISO string) is preserved via the spread above
  };
}

// ── Hooks ────────────────────────────────────────────────

export function useInterviews(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['company', 'interviews', filters],
    queryFn: async () => {
      const { data } = await interviewService.getInterviews(filters);
      // Backend returns { data: { items: Interview[], stats: {...} }, meta: {...} }
      const items: Interview[] = Array.isArray(data?.data?.items) ? data.data.items : [];
      return items.map(enrichInterview);
    },
  });
}

export function useInterviewDetail(id: string) {
  return useQuery({
    queryKey: ['company', 'interviews', id],
    queryFn: async () => {
      const { data } = await interviewService.getInterviewDetail(id);
      // enrichInterview now preserves the ISO scheduledTime field,
      // so the edit form can safely call splitScheduledTime() on it.
      return data.data ? enrichInterview(data.data) : undefined;
    },
    enabled: !!id,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InterviewFormData) => interviewService.createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['company', 'applications'] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InterviewFormData }) =>
      interviewService.updateInterview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews', variables.id] });
    },
  });
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      interviewService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
    },
  });
}
