import api from './api';
import type { AdminCompany, AdminCompanyDetail, PaginationMeta } from '../types/admin';

interface ListCompaniesParams {
  page?: number;
  size?: number;
  verified?: boolean;
}

interface CompaniesResponse {
  data: AdminCompany[];
  meta: PaginationMeta;
}

export const adminCompanyService = {
  listCompanies: async (params: ListCompaniesParams = {}): Promise<CompaniesResponse> => {
    const { page = 1, size = 20, verified } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (verified !== undefined) query.append('verified', String(verified));
    const res = await api.get<{ data: AdminCompany[]; meta: PaginationMeta }>(`/admin/companies?${query}`);
    return { data: res.data.data, meta: res.data.meta };
  },

  verifyCompany: async (id: string): Promise<AdminCompany> => {
    const res = await api.patch<{ data: AdminCompany }>(`/admin/companies/${id}/verify`, {});
    return res.data.data;
  },

  blockCompany: async (id: string): Promise<AdminCompany> => {
    const res = await api.patch<{ data: AdminCompany }>(`/admin/companies/${id}/block`, {});
    return res.data.data;
  },

  unblockCompany: async (id: string): Promise<AdminCompany> => {
    const res = await api.patch<{ data: AdminCompany }>(`/admin/companies/${id}/unblock`, {});
    return res.data.data;
  },

  getCompanyDetail: async (id: string): Promise<AdminCompanyDetail> => {
    const res = await api.get<{ data: AdminCompanyDetail }>(`/admin/companies/${id}`);
    return res.data.data;
  },
};
