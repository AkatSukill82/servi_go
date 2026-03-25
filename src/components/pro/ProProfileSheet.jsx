import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Star, Briefcase, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';

export default function ProProfileSheet({ pro, onClose, onSelect }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(pro?.id);

  const { data: reviews = [] } = useQuery({
    queryKey: ['proReviews', pro?.email],
    queryFn: () => base44.entities.Review.filter({ professional_email: pro.email }, '-created_date', 20),
    enabled: !!pro?.email,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ['proMissions', pro?.email],
    queryFn: () => base44.entities.ServiceRequest.filter(
      { professional_email: pro.email, status: 'completed' }, '-created_date', 100
    ),
    enabled: !!pro?.email,
  });

  if (!pro) return null;

  const isVerified = pro.verification_status === 'verified';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '88dvh',
            background: 'hsl(var(--background))',
            borderRadius: '24px 24px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Handle + fixed top */}
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'hsl(var(--muted))' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }} className="px-5 pt-2 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden flex items-center justify-center font-bold text-2xl text-primary">
                  {pro.photo_url
                    ? <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
                    : pro.full_name?.[0]}
                </div>
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-lg leading-tight truncate">{pro.full_name}</p>
                    <p className="text-sm text-muted-foreground">{pro.category_name}</p>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 mt-1">
                        <ShieldCheck className="w-3 h-3" /> Pro Vérifié
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => toggleFavorite(pro.id)}
                      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${fav ? 'bg-red-50 border-red-200' : 'bg-muted border-border'}`}
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </button>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-xl font-bold">{missions.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Missions</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <p className="text-xl font-bold">{pro.rating ? pro.rating.toFixed(1) : '—'}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Note</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-xl font-bold">{pro.reviews_count || reviews.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Avis</p>
              </div>
            </div>

            {/* Description */}
            {pro.pro_description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">À propos</p>
                <p className="text-sm text-foreground leading-relaxed">{pro.pro_description}</p>
              </div>
            )}

            {/* Price */}
            {pro.base_price && (
              <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Prix de base</p>
                <p className="font-bold text-lg">{pro.base_price} €</p>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Avis clients</p>
                <div className="space-y-3">
                  {reviews.slice(0, 5).map(review => (
                    <div key={review.id} className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium">{review.customer_name || 'Client'}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-border fill-border'}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missions history */}
            {missions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                  Missions réalisées ({missions.length})
                </p>
                <div className="space-y-2">
                  {missions.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {m.category_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.category_name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.customer_address?.split(',')[0]}</p>
                      </div>
                      <p className="text-xs font-semibold shrink-0">{m.base_price?.toFixed(0)} €</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {onSelect && (
              <Button
                onClick={() => { onSelect(pro); onClose(); }}
                className="w-full h-13 rounded-2xl text-base font-semibold"
              >
                Choisir ce professionnel
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}