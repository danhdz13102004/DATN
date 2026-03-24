import api from './api';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  VerifyOtpRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<ApiResponse<null>>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  verifyOtp: (data: VerifyOtpRequest) =>
    api.post<ApiResponse<null>>('/auth/verify-otp', data),

  resendOtp: (email: string) =>
    api.post<ApiResponse<null>>('/auth/resend-otp', { email }),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post<ApiResponse<null>>('/auth/reset-password', data),

  changePassword: (data: ChangePasswordRequest) =>
    api.put<ApiResponse<null>>('/auth/change-password', data),
};
