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
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all active:scale-90',
        active
          ? 'bg-red-50 text-red-500'
          : 'bg-muted/80 text-muted-foreground hover:text-red-400',
        className
      )}
    >
      <Heart className={cn('w-5 h-5 transition-all', active && 'fill-red-500')} />
    </button>
  );
}