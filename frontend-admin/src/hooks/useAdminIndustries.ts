import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminIndustryService } from '../services/adminIndustryService';

export const useAdminIndustries = () =>
  useQuery({
    queryKey: ['admin', 'industries'],
    queryFn: adminIndustryService.list,
    staleTime: 60_000,
  });

export const useCreateIndustry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminIndustryService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'industries'] });
    },
  });
};

export const useUpdateIndustry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminIndustryService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'industries'] });
    },
  });
};

export const useDeleteIndustry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminIndustryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'industries'] });
    },
  });
};
