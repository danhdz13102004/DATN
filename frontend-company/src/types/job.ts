export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type JobType = 'FULLTIME' | 'PARTTIME' | 'REMOTE' | 'HYBRID';
export type ExperienceLevel = 'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEADER';

export interface Job {
  id: string;
  title: string;
  description: string;
  jobType: JobType;
  experienceLevels: ExperienceLevel[];
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobStatus;
  skills: Skill[];
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobFormData {
  title: string;
  description: string;
  jobType: JobType;
  levels: ExperienceLevel[];
  location: string;
  addressId?: string;
  salaryMin?: number;
  salaryMax?: number;
  skillIds: string[];
  status: JobStatus;
}

export interface JobSelectOption {
  id: string;
  title: string;
}

export interface Skill {
  id: string;
  name: string;
}
