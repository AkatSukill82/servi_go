import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Reusable hook for paginated pro missions
 * Handles pagination, caching, and state management
 * Usage: const { missions, pagination, isLoading } = useProMissions(1, 'all')
 */
export function useProMissions(page = 1, statusFilter = 'all', pageSize = 20) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['proMissions', page, statusFilter, pageSize],
    queryFn: () =>
      base44.functions.invoke('getProMissionsOptimized', {
        page,
        pageSize,
        status: statusFilter,
      }),
    staleTime: 1000 * 60 * 2, // 2 min cache
    gcTime: 1000 * 60 * 5,     // 5 min garbage collection
  });

  const missions = data?.data?.data || [];
  const pagination = data?.data?.pagination || {
    page,
    pageSize,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };

  return { missions, pagination, isLoading, error };
}