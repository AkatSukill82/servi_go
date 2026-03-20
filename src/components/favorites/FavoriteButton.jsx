import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

export default function FavoriteButton({ proId, className = '' }) {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  const active = isFavorite(proId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(proId);
      }}
      disabled={isLoading}
      className={cn(
        'p-2 rounded-full transition-all active:scale-90',
        active
          ? 'bg-red-50 text-red-500'
          : 'bg-muted/80 text-muted-foreground hover:text-red-400',
        className
      )}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart className={cn('w-4 h-4 transition-all', active && 'fill-red-500')} />
    </button>
  );
}