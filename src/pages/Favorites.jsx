import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { motion } from 'framer-motion';

function FavoriteCard({ fav, onRemove }) {
  const navigate = useNavigate();
  const { toggleFavorite } = useFavorites();

  const handleRemove = async () => {
    await toggleFavorite({ id: fav.professional_id });
    onRemove(fav.professional_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
          {fav.professional_photo_url ? (
            <img src={fav.professional_photo_url} alt={fav.professional_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-foreground text-xl">
              {(fav.professional_name || 'P')[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{fav.professional_name || 'Professionnel'}</p>
          <p className="text-xs text-muted-foreground truncate">{fav.professional_category}</p>
          {fav.professional_rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold">{fav.professional_rating?.toFixed(1)}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
        >
          <Heart className="w-4 h-4 fill-red-500" />
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          className="flex-1 h-9 rounded-xl text-xs font-medium border border-border bg-transparent text-foreground tap-scale transition-colors hover:bg-muted/50"
          onClick={() => navigate(`/ProPublicProfile?proId=${fav.professional_id}`)}
        >
          Voir profil
        </button>
        <button
          className="flex-1 h-9 rounded-xl text-xs font-semibold text-white tap-scale"
          style={{ background: '#4F46E5' }}
          onClick={() => navigate(`/ServiceRequest?category=${encodeURIComponent(fav.professional_category || '')}&priorityProId=${fav.professional_id}`)}
        >
          Demander
        </button>
      </div>
    </motion.div>
  );
}

export default function Favorites() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [removedIds, setRemovedIds] = React.useState(new Set());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: () => base44.entities.Favorite.filter({ customer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const displayed = favorites.filter(f => !removedIds.has(f.professional_id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        <Heart className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
        <p className="text-lg font-semibold text-foreground mb-2">Aucun favori pour le moment</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Explorez la carte ou les profils pros et ajoutez-les à vos favoris
        </p>
        <button
          onClick={() => navigate('/Map')}
          className="rounded-xl h-11 px-6 text-sm font-semibold text-white tap-scale"
          style={{ background: '#4F46E5' }}
        >
          Explorer la carte
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold">Mes favoris</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {displayed.length} professionnel{displayed.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {displayed.map(fav => (
          <FavoriteCard
            key={fav.id}
            fav={fav}
            onRemove={(proId) => setRemovedIds(ids => new Set([...ids, proId]))}
          />
        ))}
      </div>
    </div>
  );
}