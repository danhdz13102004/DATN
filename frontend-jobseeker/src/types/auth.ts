export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'JOBSEEKER' | 'COMPANY';
  companyName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role: string;
  companyId?: string;
  companyRole?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: { page: number; pageSize: number; total: number };
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
  type: 'VERIFY_ACCOUNT' | 'RESET_PASSWORD';
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  companyRole?: string;
}

export interface GoogleOAuthRequest {
  idToken: string;
  role: 'JOBSEEKER' | 'COMPANY';
}
