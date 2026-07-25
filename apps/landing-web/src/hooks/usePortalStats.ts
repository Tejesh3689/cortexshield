import { useQuery } from '@tanstack/react-query';

const candidateEndpoints = ['/api/analytics/overview', '/api/metrics', '/api/portal/metrics'];

const fetchPortalStats = async () => {
  let lastError: Error | null = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unable to load portal metrics');
    }
  }

  throw lastError ?? new Error('Unable to load portal metrics');
};

export const usePortalStats = () =>
  useQuery({
    queryKey: ['portal-stats'],
    queryFn: fetchPortalStats,
    refetchInterval: 30000,
    retry: 1,
    staleTime: 30000
  });
