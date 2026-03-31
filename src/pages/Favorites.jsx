import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ProFavoriteCard from '@/components/favorites/ProFavoriteCard';

export default function Favorites() {
  const navigate = useNavigate();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const favoriteIds = user?.favorite_professionals || [];

  const { data: allPros = [], isLoading: loadingPros } = useQuery({
    queryKey: ['allProfessionals'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel' }),
    enabled: favoriteIds.length > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    enabled: favoriteIds.length > 0,
  });

  const favoritePros = allPros.filter(p => favoriteIds.includes(p.id) && p.photo_url);
  const isLoading = loadingUser || loadingPros;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          Mes favoris
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retrouvez vos professionnels de confiance
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && favoriteIds.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-red-300" />
          </div>
          <h2 className="font-semibold text-lg mb-1">Aucun favori</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ajoutez des professionnels en favoris pour les retrouver facilement ici.
          </p>
          <Button onClick={() => navigate('/Map')} variant="outline" className="rounded-xl">
            Découvrir des professionnels
          </Button>
        </div>
      )}

      {!isLoading && favoriteIds.length > 0 && favoritePros.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">Chargement des profils...</p>
        </div>
      )}

      {!isLoading && favoritePros.length > 0 && (
        <div className="space-y-3">
          {favoritePros.map((pro, index) => (
            <ProFavoriteCard
              key={pro.id}
              pro={pro}
              categories={categories}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}