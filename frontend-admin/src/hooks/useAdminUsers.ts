import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService } from '../services/adminUserService';
import type { UserRole, UserStatus } from '../types/admin';

interface UseAdminUsersParams {
  page?: number;
  size?: number;
  role?: UserRole;
  status?: UserStatus;
}

export const useAdminUsers = (params: UseAdminUsersParams = {}) => {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminUserService.listUsers(params),
    staleTime: 30_000,
  });
};

export const useAdminUser = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminUserService.getUserById(id),
    enabled: !!id,
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      adminUserService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};
