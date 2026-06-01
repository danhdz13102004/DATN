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
  role?: 'HR' | 'RECRUITER'; // defaults to HR
  password?: string; // optional; defaults to '12345678'
}

export interface UpdateStaffRequest {
  fullName: string;
}
