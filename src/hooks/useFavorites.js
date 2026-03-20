import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFavorites() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const favorites = user?.favorite_professionals || [];

  const isFavorite = (proId) => favorites.includes(proId);

  const toggleMutation = useMutation({
    mutationFn: async (proId) => {
      const current = user?.favorite_professionals || [];
      const updated = current.includes(proId)
        ? current.filter(id => id !== proId)
        : [...current, proId];
      await base44.auth.updateMe({ favorite_professionals: updated });
      return updated;
    },
    onMutate: async (proId) => {
      await queryClient.cancelQueries({ queryKey: ['currentUser'] });
      const previous = queryClient.getQueryData(['currentUser']);
      queryClient.setQueryData(['currentUser'], (old) => {
        if (!old) return old;
        const current = old.favorite_professionals || [];
        const updated = current.includes(proId)
          ? current.filter(id => id !== proId)
          : [...current, proId];
        return { ...old, favorite_professionals: updated };
      });
      return { previous };
    },
    onError: (_err, _proId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['currentUser'], context.previous);
      }
      toast.error('Erreur lors de la mise à jour des favoris');
    },
    onSuccess: (updated, proId) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      const added = updated.includes(proId);
      toast.success(added ? 'Ajouté aux favoris ⭐' : 'Retiré des favoris');
    },
  });

  const toggleFavorite = (proId) => toggleMutation.mutate(proId);

  return { favorites, isFavorite, toggleFavorite, isLoading: toggleMutation.isPending };
}