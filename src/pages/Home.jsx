import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, Zap, X, MapPin, Star, ChevronRight, Shield,
  FileText, CreditCard, Mic, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/hooks/useI18n';
import ServiceCard from '@/components/home/ServiceCard';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import TopBar from '@/components/layout/TopBar';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import NearbyProCard from '@/components/home/NearbyProCard';
import { formatPrice } from '@/utils/formatters';

const ICON_MAP_NAMES = {
  Wrench: '🔧', Droplets: '💧', Paintbrush: '🖌️', Truck: '🚚',
  Scissors: '✂️', Leaf: '🌿', Hammer: '🔨', Plug: '⚡', Home: '🏠', Zap: '⚡',
};

export default function Home() {
  const [viewingPro, setViewingPro] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nearbyPros = [] } = useQuery({
    queryKey: ['nearbyPros'],
    queryFn: () => base44.entities.User.filter(
      { user_type: 'professionnel', available: true, verification_status: 'verified' },
      '-rating', 10
    ),
    staleTime: 3 * 60 * 1000,
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ['recentReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 3),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['activeRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email, status: 'accepted' }, '-created_date', 1
    ).then(r => r[0] || null),
    enabled: !!user?.email,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const { data: unfinishedRequest } = useQuery({
    queryKey: ['unfinishedRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email }, '-created_date', 10
    ).then(r => r.find(req => ['searching', 'pending_pro'].includes(req.status)) || null),
    enabled: !!user?.email,
    staleTime: 90000,
    refetchInterval: 90000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequestV2.update(id, { status: 'cancelled', cancelled_by: 'customer' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unfinishedRequest'] });
      setConfirmCancel(false);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    queryClient.invalidateQueries({ queryKey: ['nearbyPros'] });
  };

  const filteredCategories = searchQuery.trim()
    ? categories.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const firstName = (() => {
    if (user?.first_name) return user.first_name;
    const handle = (user?.full_name || '');
    const letters = handle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    if (letters.length >= 2) return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
    return '';
  })();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-background pb-4">
        <OnboardingModal />

        {/* Top bar */}
        <TopBar title={firstName ? `Bonjour ${firstName} 👋` : 'Accueil'} subtitle={user?.address?.split(',')[0] || 'Belgique'} />

        <div className="px-4 sm:px-6 pt-4 space-y-5">

          {/* ── Search bar ── */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Que cherchez-vous ? Plombier, déménageur…"
              className="w-full h-14 pl-11 pr-12 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition shadow-card"
              style={{ fontSize: 16 }}
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground tap-scale">
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* ── SOS Banner ── */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/Emergency')}
            className="w-full rounded-xl overflow-hidden shadow-card"
          >
            <div className="bg-[#EF4444] px-4 py-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-white leading-tight">Besoin urgent ?</p>
                <p className="text-sm text-white/80">Intervention prioritaire sous 1h</p>
              </div>
              <span className="shrink-0 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-pill border border-white/30">+50% tarif</span>
            </div>
          </motion.button>

          {/* ── Active mission banner ── */}
          <AnimatePresence>
            {activeRequest && (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
                className="w-full rounded-xl overflow-hidden border border-[#10B981]/30 shadow-card"
              >
                <div className="bg-[#10B981]/10 px-4 py-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#10B981]">Mission en cours — {activeRequest.professional_name}</p>
                    <p className="text-xs text-muted-foreground">Suivre en temps réel →</p>
                  </div>
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Unfinished request ── */}
          <AnimatePresence>
            {unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Demande en attente — {unfinishedRequest.category_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Recherche d'un professionnel en cours…</p>
                  </div>
                  <button onClick={() => setDismissedId(unfinishedRequest.id)} className="tap-scale p-1">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="mt-3 text-xs font-medium text-[#F59E0B] underline underline-offset-2"
                  >
                    Annuler cette demande
                  </button>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setConfirmCancel(false)} className="flex-1 text-xs font-medium border border-border rounded-lg py-2 bg-card">Non, garder</button>
                    <button
                      onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                      disabled={cancelMutation.isPending}
                      className="flex-1 text-xs font-semibold rounded-lg py-2 bg-[#EF4444] text-white disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? 'Annulation…' : 'Oui, annuler'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Services ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold tracking-[-0.01em]">Nos services</h2>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#4F46E5] font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>

            {isLoading ? (
              <HomeSkeleton />
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-10 h-10 text-muted-foreground/50 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">Aucun service trouvé</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez un autre terme</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {filteredCategories.map((category, index) => (
                  <ServiceCard
                    key={category.id}
                    category={category}
                    index={index}
                    onSearch={() => navigate(`/ServiceRequest?categoryId=${category.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Nearby Pros carousel ── */}
          {nearbyPros.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold tracking-[-0.01em]">Pros près de chez vous</h2>
                <button className="text-xs text-[#4F46E5] font-medium flex items-center gap-1">
                  Voir tout <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                {nearbyPros.map((pro, i) => (
                  <NearbyProCard key={pro.id} pro={pro} index={i} onPress={() => setViewingPro(pro)} />
                ))}
              </div>
            </section>
          )}

          {/* ── Recent reviews ── */}
          {recentReviews.length > 0 && (
            <section>
              <h2 className="text-base font-semibold tracking-[-0.01em] mb-3">Avis récents</h2>
              <div className="space-y-3">
                {recentReviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-card rounded-xl p-4 shadow-card border border-border/50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-sm font-bold text-[#4F46E5] shrink-0">
                        {(review.customer_name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{review.customer_name || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{review.category_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="text-xs font-semibold">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">"{review.comment}"</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ── Trust footer ── */}
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
            <div className="flex items-center justify-around gap-2">
              {[
                { icon: Shield,    label: 'Pros vérifiés' },
                { icon: FileText,  label: 'Contrat inclus' },
                { icon: CreditCard, label: 'Paiement sécurisé' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-9 h-9 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-[#4F46E5]" strokeWidth={2} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Identity pending */}
          {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3 flex items-center gap-3">
              <span className="text-lg shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Identité non vérifiée</p>
                <p className="text-xs text-muted-foreground">Certaines fonctionnalités sont limitées</p>
              </div>
              <button onClick={() => navigate('/EidVerification')} className="text-xs font-bold text-[#4F46E5] shrink-0">Vérifier</button>
            </div>
          )}

        </div>
      </div>

      {viewingPro && (
        <ProProfileSheet
          pro={viewingPro}
          onClose={() => setViewingPro(null)}
          onSelect={(pro) => {
            const cat = categories.find(c => c.name === pro.category_name);
            if (cat) navigate(`/ServiceRequest?categoryId=${cat.id}&priorityProId=${pro.id}`);
            setViewingPro(null);
          }}
        />
      )}
    </PullToRefresh>
  );
}