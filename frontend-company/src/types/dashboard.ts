export interface DashboardStats {
  totalJobs: number;
  activeApplications: number;
  interviewsThisWeek: number;
  newMessages: number;
  jobsTrend: number;
  applicationsTrend: number;
  interviewsPending: number;
  newMessagesUnread: number;
}

export interface RecentApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  aiScore: number | null;
  status: string;
  appliedAt: string;
}
