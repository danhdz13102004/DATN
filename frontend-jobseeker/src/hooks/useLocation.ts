import { useQuery } from '@tanstack/react-query';
import { locationService } from '../services/locationService';

export function useCountries() {
  return useQuery({
    queryKey: ['location', 'countries'],
    queryFn: async () => {
      const { data } = await locationService.getCountries();
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useCities(countryId: number | null | undefined) {
  return useQuery({
    queryKey: ['location', 'cities', countryId],
    queryFn: async () => {
      const { data } = await locationService.getCities(countryId!);
      return data.data;
    },
    enabled: !!countryId,
    staleTime: 30 * 60 * 1000,
  });
}
