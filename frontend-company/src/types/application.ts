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
  applicantName: string;
  applicantEmail: string;
  applicantInitials: string;
  applicantLocation: string;
  applicantExperience: string;
  bio: string;
  resumeContent: string;
  resumeSkills: string[];
  jobId: string;
  jobTitle: string;
  aiScore: number;
  aiScoreDescription: string;
  status: ApplicationStatus;
  appliedDate: string;
  timeline: ApplicationTimelineEntry[];
}

export interface ApplicationTimelineEntry {
  event: string;
  timestamp: string;
  color: string;
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
