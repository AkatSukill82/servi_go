import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFavorites() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: () => base44.entities.Favorite.filter({ customer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const isFavorite = (proId) => favorites.some(f => f.professional_id === proId);

  const toggleMutation = useMutation({
    mutationFn: async (pro) => {
      const proId = typeof pro === 'string' ? pro : pro.id;
      const existing = favorites.find(f => f.professional_id === proId);
      if (existing) {
        await base44.entities.Favorite.delete(existing.id);
        return { added: false };
      } else {
        await base44.entities.Favorite.create({
          customer_email: user.email,
          professional_id: proId,
          professional_name: typeof pro === 'object' ? (pro.full_name || pro.name || '') : '',
          professional_category: typeof pro === 'object' ? (pro.category_name || '') : '',
          professional_photo_url: typeof pro === 'object' ? (pro.photo_url || '') : '',
          professional_rating: typeof pro === 'object' ? (pro.rating || null) : null,
        });
        return { added: true };
      }
    },
    onSuccess: ({ added }) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.email] });
      toast.success(added ? 'Ajouté aux favoris ⭐' : 'Retiré des favoris');
    },
    onError: () => toast.error('Erreur lors de la mise à jour des favoris'),
  });

  const toggleFavorite = (pro) => toggleMutation.mutate(pro);

  return { favorites, isFavorite, toggleFavorite, isLoading: toggleMutation.isPending };
}