import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCompanyService } from '../services/adminCompanyService';

interface UseAdminCompaniesParams {
  page?: number;
  size?: number;
  verified?: boolean;
}

export const useAdminCompanies = (params: UseAdminCompaniesParams = {}) => {
  return useQuery({
    queryKey: ['admin', 'companies', params],
    queryFn: () => adminCompanyService.listCompanies(params),
    staleTime: 30_000,
  });
};

export const useAdminCompanyDetail = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'companies', id],
    queryFn: () => adminCompanyService.getCompanyDetail(id),
    staleTime: 30_000,
    enabled: !!id,
  });
};

export const useVerifyCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCompanyService.verifyCompany(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
};
