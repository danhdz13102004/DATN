export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

export interface ApplicationListItem {
  id: string;
  jobTitle: string;
  jobId: string;
  companyName: string;
  companyInitial: string;
  aiScore: number | null;
  status: ApplicationStatus;
  appliedAt: string;
}

export interface ApplicationStats {
  totalApplied: number;
  inScreening: number;
  inInterview: number;
  offers: number;
}

export interface ApplicationDetail {
  id: string;
  status: ApplicationStatus;
  aiScore: number | null;
  coverLetter: string | null;
  appliedAt: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyInitial: string;
  location: string;
  jobType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevels: string[];
  skills: string[];
  resumeId: string | null;
  resumeLabel: string | null;
  interviewId: string | null;
  interviewScheduledTime: string | null;
  interviewMeetingType: string | null;
  interviewMeetingLink: string | null;
  interviewStatus: string | null;
  interviewNote: string | null;
  history: { date: string; event: string; details: string }[];
}

export interface ApplyRequest {
  jobId: string;
  resumeId: string;
  coverLetter?: string;
}
