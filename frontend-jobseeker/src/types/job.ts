export interface Skill {
  id: string;
  name: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName?: string;
  title: string;
  description: string;
  experienceLevels: string[];
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string;
  status: string;
  skills: Skill[];
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
}

export interface SavedJobDto {
  savedJobId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  savedAt: string;
  isSaved: boolean;
}

export type InteractionEventType = 'click' | 'save' | 'apply';

export interface JobFilter {
  keyword?: string;
  jobType?: string;
  experienceLevels?: string[];
  location?: string;
  page?: number;
  size?: number;
}
