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
      <div className="min-h-full bg-white pb-4">
        <OnboardingModal />

        {/* Top bar */}
        <TopBar
          title={firstName ? `${greeting}, ${firstName} 👋` : greeting}
          subtitle={user?.address?.split(',')[0] || 'Belgique'}
        />

        <div className="px-4 sm:px-5 pt-6 space-y-7">

          {/* ── Hero greeting + search (Uber style) ── */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                {firstName ? `${greeting},\n${firstName} 👋` : `${greeting} 👋`}
              </h1>
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND }} />
                {user?.address?.split(',')[0] || 'Belgique'}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Que cherchez-vous ?"
                className="w-full h-14 pl-12 pr-12 rounded-2xl text-gray-900 text-base focus:outline-none focus:ring-2 transition"
                style={{
                  background: '#F5F5F5',
                  fontSize: 15,
                  outline: 'none',
                  boxShadow: searchQuery ? `0 0 0 2px ${BRAND}` : 'none',
                }}
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center tap-scale">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              ) : (
                <button className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center tap-scale" style={{ background: `${BRAND}15` }}>
                  <Mic className="w-4 h-4" style={{ color: BRAND }} />
                </button>
              )}
            </div>
          </div>

          {/* ── SOS Banner ── */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/Emergency')}
            className="w-full rounded-3xl overflow-hidden tap-scale"
            style={{ background: 'linear-gradient(135deg, #E17055, #d63031)', boxShadow: '0 8px 24px rgba(225,112,85,0.25)' }}
          >
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 text-white fill-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-lg font-black text-white leading-tight">Urgence à domicile ?</p>
                <p className="text-sm text-white/80 mt-0.5">Intervention prioritaire sous 1h</p>
              </div>
              <div className="shrink-0 bg-white/25 rounded-2xl px-3 py-1.5">
                <span className="text-white text-xs font-black">+50%</span>
              </div>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Nos services</h2>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-sm font-bold flex items-center gap-1"
                  style={{ color: BRAND }}>
                  <X className="w-3.5 h-3.5" /> Effacer
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Top professionnels</h2>
                <button className="text-sm font-bold flex items-center gap-1" style={{ color: BRAND }}>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Avis récents</h2>
                <button onClick={() => navigate('/ProReviews')} className="text-sm font-bold flex items-center gap-1" style={{ color: BRAND }}>
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {recentReviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
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
          <div className="rounded-3xl p-5 bg-white" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
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