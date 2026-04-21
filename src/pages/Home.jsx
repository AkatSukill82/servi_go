import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Zap, X, MapPin, Star, ChevronRight, Bell, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCard from '@/components/home/ServiceCard';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import HomeSkeleton from '@/components/home/HomeSkeleton';

const VIOLET = '#6C5CE7';

export default function Home() {
  const [viewingPro, setViewingPro] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nearbyPros = [] } = useQuery({
    queryKey: ['nearbyPros'],
    queryFn: () => base44.entities.User.filter(
      { user_type: 'professionnel', available: true, verification_status: 'verified' }, '-rating', 8
    ),
    staleTime: 3 * 60 * 1000,
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ['recentReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 4),
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['unfinishedRequest'] }); setConfirmCancel(false); },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    queryClient.invalidateQueries({ queryKey: ['nearbyPros'] });
  };

  const filteredCategories = searchQuery.trim()
    ? categories.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  const firstName = (() => {
    if (user?.first_name) return user.first_name;
    const handle = user?.full_name || '';
    const letters = handle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    return letters.length >= 2 ? letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() : '';
  })();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir';

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-background">
        <OnboardingModal />

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[13px] text-muted-foreground font-medium">
                <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                {user?.address?.split(',')[0] || 'Belgique'}
              </p>
              <h1 className="text-[26px] font-bold text-foreground mt-0.5 tracking-tight leading-tight">
                {firstName ? `${greeting}, ${firstName}` : 'Trouvez un expert'}
              </h1>
            </div>
            {/* Notification bell */}
            <button
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mt-1 shrink-0"
              onClick={() => navigate('/Profile')}
            >
              {user?.photo_url
                ? <img src={user.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                : <span className="text-[15px] font-bold text-gray-600">{(user?.full_name || 'U')[0].toUpperCase()}</span>
              }
            </button>
          </div>

          {/* ── SEARCH ── */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Quel service cherchez-vous ?"
              className="w-full h-[52px] pl-11 pr-4 rounded-2xl bg-muted text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
              style={{ fontSize: 15 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* ── ACTIVE MISSION BANNER ── */}
        <AnimatePresence>
          {activeRequest && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
              className="mx-5 mb-4 w-[calc(100%-40px)] rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}
            >
              <div className="px-4 py-3.5 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-semibold text-white">Mission en cours — {activeRequest.professional_name}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Suivre en temps réel →</p>
                </div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── PENDING REQUEST ── */}
        <AnimatePresence>
          {unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-5 mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-foreground">En attente — {unfinishedRequest.category_name}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Recherche d'un professionnel…</p>
                </div>
                <button onClick={() => setDismissedId(unfinishedRequest.id)} className="p-1">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)} className="mt-2 text-[12px] font-medium text-amber-600 underline underline-offset-2">
                  Annuler cette demande
                </button>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setConfirmCancel(false)} className="flex-1 text-[12px] font-medium border border-border rounded-xl py-2 bg-card text-foreground">Non</button>
                  <button
                    onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                    disabled={cancelMutation.isPending}
                    className="flex-1 text-[12px] font-semibold rounded-xl py-2 bg-red-500 text-white disabled:opacity-60"
                  >
                    {cancelMutation.isPending ? '…' : 'Annuler'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SOS URGENT ── */}
        <div className="px-5 mb-5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/Emergency')}
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}
          >
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-bold text-white leading-tight">Intervention urgente</p>
                <p className="text-[12px] text-white/75 mt-0.5">Professionnel disponible sous 1h</p>
              </div>
              <span className="shrink-0 bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">+50%</span>
            </div>
          </motion.button>
        </div>

        <div className="px-5 space-y-7 pb-6">

          {/* ── SERVICES ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-foreground">Nos services</h2>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[12px] font-medium" style={{ color: VIOLET }}>
                  Tout voir
                </button>
              )}
            </div>

            {isLoading ? (
              <HomeSkeleton />
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Search className="w-8 h-8 text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                <p className="text-[14px] font-medium text-muted-foreground">Aucun service trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
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

          {/* ── TOP RATED PROS ── */}
          {nearbyPros.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-bold text-foreground">Pros les mieux notés</h2>
                <button className="text-[12px] font-medium flex items-center gap-1" style={{ color: VIOLET }}>
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                {nearbyPros.map((pro, i) => (
                  <ProCard key={pro.id} pro={pro} index={i} onPress={() => setViewingPro(pro)} />
                ))}
              </div>
            </section>
          )}

          {/* ── RECENT REVIEWS ── */}
          {recentReviews.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold text-foreground mb-4">Ce que disent nos clients</h2>
              <div className="space-y-3">
                {recentReviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-muted/60 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: VIOLET }}>
                        {(review.customer_name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{review.customer_name || 'Client'}</p>
                        <p className="text-[11px] text-muted-foreground">{review.category_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">"{review.comment}"</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ── TRUST BADGES ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '✅', label: 'Pros vérifiés' },
              { emoji: '📋', label: 'Contrat inclus' },
              { emoji: '🔒', label: 'Paiement sécurisé' },
            ].map(({ emoji, label }) => (
              <div key={label} className="bg-muted/60 rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center">
                <span className="text-xl">{emoji}</span>
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>

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

// ── Inline ProCard ─────────────────────────────────────────────────────────────
function ProCard({ pro, index, onPress }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onPress}
      className="flex-none w-[148px] snap-start bg-card rounded-2xl overflow-hidden border border-border shadow-sm active:scale-[0.97] transition-transform text-left"
    >
      {/* Avatar */}
      <div className="w-full h-[110px] bg-muted flex items-center justify-center overflow-hidden">
        {pro.photo_url
          ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-3xl font-bold text-muted-foreground/40">{(pro.full_name || '?')[0].toUpperCase()}</span>
        }
      </div>
      <div className="p-3">
        <p className="text-[13px] font-bold text-foreground truncate">{pro.full_name || pro.name || 'Pro'}</p>
        <p className="text-[11px] text-muted-foreground truncate">{pro.category_name}</p>
        {pro.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[12px] font-semibold text-foreground">{pro.rating}</span>
            {pro.reviews_count && <span className="text-[11px] text-muted-foreground">({pro.reviews_count})</span>}
          </div>
        )}
      </div>
    </motion.button>
  );
}