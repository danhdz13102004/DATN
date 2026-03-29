export interface StaffMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'OWNER' | 'HR' | 'RECRUITER';
  joinedAt: string;
}

export interface CreateStaffRequest {
  email: string;
  fullName: string;
  role: 'HR' | 'RECRUITER';
  password?: string; // used on creation
}

export interface UpdateStaffRequest {
  fullName: string;
}
