import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, Zap, X, Star, ChevronRight, Shield,
  FileText, CreditCard, Mic, AlertCircle, MapPin, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCard from '@/components/home/ServiceCard';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import TopBar from '@/components/layout/TopBar.jsx';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import NearbyProCard from '@/components/home/NearbyProCard';

const BRAND = '#6C5CE7';

export default function Home() {
  const [viewingPro, setViewingPro] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-background pb-4">
        <OnboardingModal />

        {/* Top bar */}
        <TopBar
          title={firstName ? `${greeting}, ${firstName} 👋` : greeting}
          subtitle={user?.address?.split(',')[0] || 'Belgique'}
        />

        <div className="px-4 sm:px-5 pt-5 space-y-6">

          {/* ── Hero Search ── */}
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: BRAND }}
              />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="De quel service avez-vous besoin ?"
                className="w-full h-14 pl-12 pr-14 rounded-2xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none transition"
                style={{ fontSize: 15, boxShadow: searchQuery ? `0 0 0 2px ${BRAND}40` : '0 2px 12px rgba(108,92,231,0.08)' }}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-muted flex items-center justify-center tap-scale"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              ) : (
                <button className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center tap-scale"
                  style={{ background: `${BRAND}12` }}>
                  <Mic className="w-4 h-4" style={{ color: BRAND }} />
                </button>
              )}
            </div>
          </div>

          {/* ── SOS Banner ── */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/Emergency')}
            className="w-full rounded-2xl overflow-hidden tap-scale"
            style={{ boxShadow: '0 4px 20px rgba(225,112,85,0.2)' }}
          >
            <div className="px-5 py-4 flex items-center gap-4"
              style={{ background: 'linear-gradient(135deg, #E17055, #d63031)' }}>
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-white leading-tight">Urgence à domicile ?</p>
                <p className="text-sm text-white/75">Intervention prioritaire sous 1h</p>
              </div>
              <span className="shrink-0 bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full border border-white/30 whitespace-nowrap">
                +50%
              </span>
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
                className="w-full rounded-2xl overflow-hidden border tap-scale"
                style={{ borderColor: '#00B89440', boxShadow: '0 4px 16px rgba(0,184,148,0.1)' }}
              >
                <div className="bg-card px-4 py-3.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00B894] animate-pulse shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-[#00B894]">Mission en cours</p>
                    <p className="text-xs text-muted-foreground">{activeRequest.professional_name} · Suivre →</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                className="rounded-2xl border border-yellow-400/30 bg-yellow-50/50 dark:bg-yellow-900/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center shrink-0">
                    <Clock className="w-4.5 h-4.5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{unfinishedRequest.category_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Recherche d'un professionnel en cours…</p>
                  </div>
                  <button onClick={() => setDismissedId(unfinishedRequest.id)} className="tap-scale p-1">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="mt-3 ml-12 text-xs font-bold text-yellow-600 underline underline-offset-2"
                  >
                    Annuler cette demande
                  </button>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setConfirmCancel(false)} className="flex-1 text-xs font-semibold border border-border rounded-xl py-2 bg-card tap-scale">
                      Conserver
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                      disabled={cancelMutation.isPending}
                      className="flex-1 text-xs font-bold rounded-xl py-2 text-white disabled:opacity-60 tap-scale"
                      style={{ background: '#E17055' }}
                    >
                      {cancelMutation.isPending ? 'Annulation…' : 'Confirmer'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Services ── */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-black tracking-tight">Nos services</h2>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs font-bold flex items-center gap-1"
                  style={{ color: BRAND }}>
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>

            {isLoading ? (
              <HomeSkeleton />
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center" style={{ background: `${BRAND}10` }}>
                  <Search className="w-8 h-8" style={{ color: BRAND }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-foreground">Aucun service trouvé</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez un autre terme</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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

          {/* ── Nearby Pros ── */}
          {nearbyPros.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-base font-black tracking-tight">Top professionnels</h2>
                <button className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND }}>
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                {nearbyPros.map((pro, i) => (
                  <NearbyProCard key={pro.id} pro={pro} index={i} onPress={() => setViewingPro(pro)} />
                ))}
              </div>
            </section>
          )}

          {/* ── Recent reviews ── */}
          {recentReviews.length > 0 && (
            <section>
              <h2 className="text-base font-black tracking-tight mb-3.5">Avis récents</h2>
              <div className="space-y-3">
                {recentReviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-card rounded-2xl p-4 border border-border/50"
                    style={{ boxShadow: '0 2px 10px rgba(108,92,231,0.05)' }}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
                        {(review.customer_name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{review.customer_name || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{review.category_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-yellow-400/10 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-600">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ── Trust strip ── */}
          <div className="rounded-2xl p-4 border border-border/40 bg-card"
            style={{ boxShadow: '0 2px 12px rgba(108,92,231,0.05)' }}>
            <div className="flex items-center justify-around gap-2">
              {[
                { icon: Shield,     label: 'Pros vérifiés' },
                { icon: FileText,   label: 'Contrat inclus' },
                { icon: CreditCard, label: 'Paiement sécurisé' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: `${BRAND}10` }}>
                    <Icon className="w-5 h-5" style={{ color: BRAND }} strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-semibold leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Identity pending */}
          {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-50/50 dark:bg-yellow-900/10 px-4 py-3.5 flex items-center gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Identité non vérifiée</p>
                <p className="text-xs text-muted-foreground">Certaines fonctionnalités sont limitées</p>
              </div>
              <button onClick={() => navigate('/EidVerification')}
                className="text-xs font-black whitespace-nowrap px-3 py-1.5 rounded-xl"
                style={{ background: `${BRAND}12`, color: BRAND }}>
                Vérifier
              </button>
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