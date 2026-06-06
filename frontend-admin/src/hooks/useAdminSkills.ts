import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSkillService } from '../services/adminSkillService';

export const useAdminSkills = () =>
  useQuery({
    queryKey: ['admin', 'skills'],
    queryFn: adminSkillService.list,
    staleTime: 60_000,
  });

export const useCreateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminSkillService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
    },
  });
};

export const useUpdateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminSkillService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSkillService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
    },
  });
};
