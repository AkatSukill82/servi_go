import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook for paginated professional search (10k+ users optimized)
 * Handles caching, pagination, and auto-fetch
 */
export function usePaginatedProfessionals(categoryName = null, page = 1, limit = 20) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['paginatedProfessionals', categoryName, page, limit],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProfessionalsOptimized', {
        category_name: categoryName,
        page,
        limit,
      });
      return res.data || { data: [], pagination: {} };
    },
    staleTime: 3 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const goToPage = (pageNum) => {
    queryClient.invalidateQueries({
      queryKey: ['paginatedProfessionals', categoryName],
    });
  };

  return {
    professionals: data?.data || [],
    pagination: data?.pagination || {},
    isLoading,
    error,
    goToPage,
  };
}