import type { Skill } from './job';

export interface JobSeekerProfile {
  id: string;
  // Flattened user fields from backend DTO
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  experienceYears: number | null;
  skills: Skill[];
  createdAt: string;
  updatedAt: string | null;
}

export interface DashboardStats {
  jobsApplied: number;
  interviewsCount: number;
  upcomingInterviews: number;
}
