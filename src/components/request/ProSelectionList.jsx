import React, { useState } from 'react';
import { Star, ShieldCheck, ChevronRight, MapPin, Heart, Info } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RADIUS_PRIMARY_KM = 15;
const RADIUS_FALLBACK_KM = 40;

function buildProList(professionals, customerLat, customerLon, categoryName) {
  const filtered = professionals.filter(p =>
    p.available !== false &&
    p.photo_url &&
    (!categoryName || !p.category_name || p.category_name === categoryName)
  );

  const withDist = filtered.map(p => ({
    ...p,
    _dist: (p.latitude && p.longitude)
      ? getDistance(customerLat, customerLon, p.latitude, p.longitude)
      : 9999,
  }));

  // Vérifié en premier, puis par distance
  return withDist.sort((a, b) => {
    if (a.verification_status === 'verified' && b.verification_status !== 'verified') return -1;
    if (b.verification_status === 'verified' && a.verification_status !== 'verified') return 1;
    return a._dist - b._dist;
  });
}

export default function ProSelectionList({ professionals, customerLat, customerLon, categoryName, basePrice, onSelect }) {
  const [selected, setSelected] = useState(null);
  const [viewingPro, setViewingPro] = useState(null);
  const { favorites } = useFavorites();

  // Sort: favorites first, then verified, then distance
  const rawPros = buildProList(professionals, customerLat, customerLon, categoryName);
  const pros = [
    ...rawPros.filter(p => favorites.includes(p.id)),
    ...rawPros.filter(p => !favorites.includes(p.id)),
  ];

  if (pros.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-2xl">😔</p>
        <p className="font-semibold">Aucun professionnel disponible</p>
        <p className="text-sm text-muted-foreground">Aucun {categoryName} n'est disponible près de vous pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{pros.length} professionnel{pros.length > 1 ? 's' : ''} trouvé{pros.length > 1 ? 's' : ''} près de vous</p>

      <div className="space-y-3">
        {pros.map((pro, i) => {
          const isVerified = pro.verification_status === 'verified';
          const price = pro.base_price || basePrice || 80;
          const dist = pro._dist < 9999 ? pro._dist.toFixed(1) : null;
          const isSelected = selected?.id === pro.id;

          return (
            <motion.button
              key={pro.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(pro)}
              className={cn(
                'w-full text-left rounded-2xl border p-4 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center font-bold text-primary text-lg">
                    {pro.photo_url
                      ? <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                      : (pro.name?.[0] || '?')}
                  </div>
                  {isVerified && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
                      <ShieldCheck className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                  {favorites.includes(pro.id) && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow border-2 border-background">
                      <Heart className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm truncate">{pro.name}</p>
                    {isVerified && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 shrink-0">
                        ✓ Pro Vérifié
                      </span>
                    )}
                    {favorites.includes(pro.id) && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 shrink-0">
                        ♥ Favori
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {pro.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {pro.rating?.toFixed(1)} {pro.reviews_count > 0 && `(${pro.reviews_count})`}
                      </span>
                    )}
                    {dist && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {dist} km
                      </span>
                    )}
                  </div>
                </div>

                {/* Price + info button */}
                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  <p className="font-bold text-lg text-foreground">{price} €</p>
                  <p className="text-[10px] text-muted-foreground">base HT</p>
                  <button
                    onClick={e => { e.stopPropagation(); setViewingPro(pro); }}
                    className="flex items-center gap-0.5 text-[10px] text-primary underline underline-offset-2"
                  >
                    <Info className="w-3 h-3" /> Voir profil
                  </button>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    ✓ Professionnel sélectionné
                  </p>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={() => onSelect(selected)}
        disabled={!selected}
        className="w-full h-14 rounded-xl text-base"
      >
        Continuer avec {selected?.name || '...'}
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>

      {viewingPro && (
        <ProProfileSheet
          pro={viewingPro}
          onClose={() => setViewingPro(null)}
          onSelect={(pro) => { setSelected(pro); setViewingPro(null); }}
        />
      )}
    </div>
  );
}