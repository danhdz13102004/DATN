import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { ChangePasswordRequest } from '../types/auth';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
  });
}
