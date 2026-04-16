import api from './api';
import type { AdminUser, UserRole, UserStatus, PaginationMeta } from '../types/admin';

interface ListUsersParams {
  page?: number;
  size?: number;
  role?: UserRole;
  status?: UserStatus;
}

interface UsersResponse {
  data: AdminUser[];
  meta: PaginationMeta;
}

export const adminUserService = {
  listUsers: async (params: ListUsersParams = {}): Promise<UsersResponse> => {
    const { page = 1, size = 20, role, status } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (role) query.append('role', role);
    if (status) query.append('status', status);
    const res = await api.get<{ data: AdminUser[]; meta: PaginationMeta }>(`/admin/users?${query}`);
    return { data: res.data.data, meta: res.data.meta };
  },

  getUserById: async (id: string): Promise<AdminUser> => {
    const res = await api.get<{ data: AdminUser }>(`/admin/users/${id}`);
    return res.data.data;
  },

  updateStatus: async (id: string, status: UserStatus): Promise<AdminUser> => {
    const res = await api.patch<{ data: AdminUser }>(`/admin/users/${id}/status`, { status });
    return res.data.data;
  },
};
