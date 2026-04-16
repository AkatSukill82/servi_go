import React, { useState } from 'react';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import { motion } from 'framer-motion';

function FavoriteCard({ pro, onRemove }) {
  const navigate = useNavigate();
  const isAvailable = pro.available;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 space-y-3"
    >
      {/* Header with photo and basic info */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
          {pro.photo_url ? (
            <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-foreground">
              {pro.full_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{pro.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{pro.category_name}</p>
          {pro.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`w-2.5 h-2.5 ${i <= Math.round(pro.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border fill-border'}`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-0.5">({pro.reviews_count || 0})</span>
            </div>
          )}
        </div>
        <FavoriteButton proId={pro.id} onRemove={onRemove} />
      </div>

      {/* Details */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {pro.base_price && (
            <p className="text-sm font-semibold text-primary">{pro.base_price}€</p>
          )}
          {pro.verification_status === 'verified' && (
            <p className="text-[10px] font-semibold text-green-600">✓ Vérifié</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">{isAvailable ? 'Disponible' : 'Indisponible'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl h-9 text-xs"
          onClick={() => navigate(`/ProPublicProfile?proId=${pro.id}`)}
        >
          Voir profil
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl h-9 text-xs bg-primary hover:bg-primary/90"
          onClick={() => navigate(`/ServiceRequest?categoryId=${pro.category_name}`)}
        >
          Demander
        </Button>
      </div>
    </motion.div>
  );
}

export default function Favorites() {
  const navigate = useNavigate();
  const [removedIds, setRemovedIds] = useState(new Set());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favoritesPros', user?.favorite_professionals],
    queryFn: async () => {
      if (!user?.favorite_professionals?.length) return [];
      const ids = Array.isArray(user.favorite_professionals) ? user.favorite_professionals : [];
      if (ids.length === 0) return [];
      const pros = await Promise.all(
        ids.map(id => base44.entities.User.list().then(all => all.find(u => u.id === id)))
      );
      return pros.filter(Boolean);
    },
    enabled: !!user?.email,
  });

  const displayed = favorites.filter(pro => !removedIds.has(pro.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <Heart className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
        <p className="text-lg font-semibold text-foreground mb-2">Aucun favori pour le moment</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Explorez la carte pour trouver des pros et les ajouter à vos favoris
        </p>
        <Button
          onClick={() => navigate('/Map')}
          className="rounded-xl h-11 px-6 bg-primary hover:bg-primary/90"
        >
          Explorez la carte
        </Button>
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
        {displayed.map(pro => (
          <FavoriteCard
            key={pro.id}
            pro={pro}
            onRemove={() => setRemovedIds(ids => new Set([...ids, pro.id]))}
          />
        ))}
      </div>
    </div>
  );
}