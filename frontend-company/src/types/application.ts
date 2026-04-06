export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string | null;
  jobId: string;
  jobTitle: string;
  aiScore: number | null;
  status: ApplicationStatus;
  hasScheduledInterview: boolean;
  appliedAt: string;
}

export interface ApplicationDetail {
  id: string;
  // Candidate info — matches backend candidateName / candidateEmail etc.
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string | null;
  candidateLocation: string | null;
  candidateExperienceYears: number | null;
  candidateBio: string | null;
  // Job info
  jobId: string;
  jobTitle: string;
  // Scoring & status
  aiScore: number | null;
  status: ApplicationStatus;
  hasScheduledInterview: boolean;
  // Resume
  resumeUrl: string | null;
  // Dates
  appliedAt: string;
  timeline: ApplicationTimelineEntry[];
}

export interface ApplicationTimelineEntry {
  type: string;
  description: string;
  timestamp: string;
}

export interface ApplicationStats {
  total: number;
  screening: number;
  interview: number;
  hired: number;
}

export interface ApplicationSelectOption {
  id: string;
  applicantName: string;
  jobTitle: string;
}
