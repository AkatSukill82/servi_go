import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Zap, X, Star, ChevronRight, Shield, FileText, CreditCard, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCard from '@/components/home/ServiceCard';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import TopBar from '@/components/layout/TopBar.jsx';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import NearbyProCard from '@/components/home/NearbyProCard';
import { getFirstName, getGreeting } from '@/lib/userUtils';
import { BRAND } from '@/lib/theme';

export default function Home() {
  const [viewingPro, setViewingPro]   = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nearbyPros = [] } = useQuery({
    queryKey: ['nearbyPros'],
    queryFn: () => base44.entities.User.filter(
      { user_type: 'professionnel', available: true, verification_status: 'verified' }, '-rating', 10
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
      { customer_email: user.email }, '-created_date', 10
    ).then(r => r.find(req => ['accepted', 'pro_en_route', 'in_progress'].includes(req.status)) || null),
    enabled: !!user?.email,
    staleTime: 30000,
    refetchInterval: 30000,
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

  const firstName = getFirstName(user);
  const greeting  = getGreeting();

  const activeStatusLabel = {
    accepted:    { icon: '📍', text: 'Mission acceptée' },
    pro_en_route: { icon: '🚗', text: 'Technicien en route' },
    in_progress:  { icon: '🔧', text: 'Mission en cours' },
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-[#F7F7F7]">
        <OnboardingModal />
        <TopBar />

        {/* ── Active mission banner ── */}
        <AnimatePresence>
          {activeRequest && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
              className="w-full text-left overflow-hidden"
            >
              <div className="px-4 py-3 flex items-center gap-3 text-white"
                style={{ background: 'linear-gradient(90deg, #00B894, #00CBA6)' }}>
                <span className="text-lg">{activeStatusLabel[activeRequest.status]?.icon || '📍'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-none">{activeStatusLabel[activeRequest.status]?.text}</p>
                  <p className="text-xs text-white/80 mt-0.5 truncate">
                    {activeRequest.professional_name} · {activeRequest.category_name}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Unfinished request banner ── */}
        <AnimatePresence>
          {unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-500 px-4 py-3 flex items-center gap-3 overflow-hidden"
            >
              <Clock className="w-4 h-4 text-white shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{unfinishedRequest.category_name}</p>
                <p className="text-xs text-white/80">Recherche d'un professionnel…</p>
              </div>
              <button
                onClick={() => setDismissedId(unfinishedRequest.id)}
                className="text-white/70 p-1 tap-scale"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pb-8">

          {/* ── Hero section ── */}
          <div className="bg-white px-5 pt-5 pb-6">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
              {firstName ? `${greeting},\n${firstName} 👋` : `${greeting} 👋`}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Que puis-je faire pour vous aujourd'hui ?</p>

            {/* Search bar — Airbnb style */}
            <div className="mt-4 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#9CA3AF', width: 18, height: 18 }}
              />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Plombier, électricien, peintre…"
                className="w-full h-[52px] pl-11 pr-11 rounded-2xl text-gray-900 text-sm font-medium focus:outline-none transition-shadow"
                style={{
                  background: '#F3F4F6',
                  boxShadow: searchQuery ? `0 0 0 2px ${BRAND}` : 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center tap-scale"
                >
                  <X className="w-3.5 h-3.5 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* ── SOS / Urgence — Uber-style action card ── */}
          <div className="px-4 mt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/Emergency')}
              className="w-full rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 4px 20px rgba(225,112,85,0.3)' }}
            >
              <div
                className="px-5 py-4 flex items-center gap-4"
                style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Zap className="w-7 h-7 text-white fill-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white leading-tight">Urgence à domicile ?</p>
                  <p className="text-sm text-white/75 mt-0.5">Intervention prioritaire sous 1h</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-1.5 shrink-0">
                  <span className="text-white text-xs font-black">SOS</span>
                </div>
              </div>
            </motion.button>
          </div>

          {/* ── Confirm cancel (si requis) ── */}
          <AnimatePresence>
            {unfinishedRequest && confirmCancel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-4 mt-3 bg-white rounded-2xl p-4 flex gap-2"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 tap-scale"
                >
                  Conserver
                </button>
                <button
                  onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 h-10 rounded-xl text-sm font-bold text-white tap-scale disabled:opacity-60"
                  style={{ background: '#E17055' }}
                >
                  {cancelMutation.isPending ? 'Annulation…' : 'Annuler la demande'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Services ── */}
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900">Nos services</h2>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-bold flex items-center gap-1"
                  style={{ color: BRAND }}
                >
                  <X className="w-3.5 h-3.5" /> Effacer
                </button>
              )}
            </div>

            {isLoading ? (
              <HomeSkeleton />
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-2xl"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <div className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center" style={{ background: `${BRAND}12` }}>
                  <Search className="w-8 h-8" style={{ color: BRAND }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-900">Aucun service trouvé</p>
                <p className="text-xs text-gray-400 mt-1">Essayez un autre terme</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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
          </div>

          {/* ── Top professionnels ── */}
          {nearbyPros.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 px-4">
                <h2 className="text-xl font-black text-gray-900">Top professionnels</h2>
                <button
                  onClick={() => navigate('/Map')}
                  className="text-sm font-bold flex items-center gap-1"
                  style={{ color: BRAND }}
                >
                  Voir sur la carte <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none' }}
              >
                {nearbyPros.map((pro, i) => (
                  <NearbyProCard
                    key={pro.id}
                    pro={pro}
                    index={i}
                    onPress={() => setViewingPro(pro)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Avis récents ── */}
          {recentReviews.length > 0 && (
            <div className="mt-8 px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900">Ce qu'ils disent</h2>
                <button
                  onClick={() => navigate('/ProReviews')}
                  className="text-sm font-bold flex items-center gap-1"
                  style={{ color: BRAND }}
                >
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {recentReviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
                      >
                        {(review.customer_name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{review.customer_name || 'Client'}</p>
                        <p className="text-xs text-gray-400">{review.category_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-600">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">"{review.comment}"</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Trust strip — Airbnb style ── */}
          <div className="mt-8 mx-4 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">
              Pourquoi ServiGo
            </p>
            <div className="flex items-center justify-around gap-2">
              {[
                { icon: Shield,     label: 'Pros vérifiés' },
                { icon: FileText,   label: 'Contrat inclus' },
                { icon: CreditCard, label: 'Paiement sécurisé' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: `${BRAND}10` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: BRAND }} strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] text-gray-500 font-semibold leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Identity pending ── */}
          {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
            <div className="mx-4 mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-center gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">Identité non vérifiée</p>
                <p className="text-xs text-amber-700 mt-0.5">Certaines fonctionnalités sont limitées</p>
              </div>
              <button
                onClick={() => navigate('/EidVerification')}
                className="text-xs font-black whitespace-nowrap px-3 py-2 rounded-xl text-white shrink-0"
                style={{ background: '#E2A000' }}
              >
                Vérifier
              </button>
            </div>
          )}
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
      </div>
    </PullToRefresh>
  );
}
