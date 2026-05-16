import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, X, Star, ChevronRight, Shield, FileText, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCard from '@/components/home/ServiceCard';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import LocationPermissionModal from '@/components/onboarding/LocationPermissionModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import TopBar from '@/components/layout/TopBar.jsx';
import HomeSkeleton from '@/components/home/HomeSkeleton';
import NearbyProCard from '@/components/home/NearbyProCard';
import ProStoriesCarousel from '@/components/home/ProStoriesCarousel';
import FreeMissionWidget from '@/components/loyalty/FreeMissionWidget';
import LazyProGrid from '@/components/home/LazyProGrid';
import { getFirstName, getGreeting } from '@/lib/userUtils';
import { BRAND } from '@/lib/theme';

export default function Home() {
  const [viewingPro, setViewingPro] = useState(null);
  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: nearbyPros = [], isLoading: loadingNearby } = useQuery({
    queryKey: ['nearbyProsOptimized'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProfessionalsOptimized', {
        category_name: null,
        page: 1,
        limit: 10,
      });
      return res.data || [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ['recentReviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 4),
    staleTime: 5 * 60 * 1000
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['activeRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email }, '-created_date', 10
    ).then((r) => r.find((req) => ['accepted', 'pro_en_route', 'in_progress'].includes(req.status)) || null),
    enabled: !!user?.email,
    staleTime: 30000,
    refetchInterval: 30000
  });

  const { data: unfinishedRequest } = useQuery({
    queryKey: ['unfinishedRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email }, '-created_date', 10
    ).then((r) => r.find((req) => ['searching', 'pending_pro'].includes(req.status)) || null),
    enabled: !!user?.email,
    staleTime: 90000,
    refetchInterval: 90000
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequestV2.update(id, { status: 'cancelled', cancelled_by: 'customer' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unfinishedRequest'] });
      setConfirmCancel(false);
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    queryClient.invalidateQueries({ queryKey: ['nearbyPros'] });
  };

  const firstName = getFirstName(user);
  const greeting = getGreeting();

  const activeStatusLabel = {
    accepted: { icon: '📍', text: 'Mission acceptée' },
    pro_en_route: { icon: '🚗', text: 'Technicien en route' },
    in_progress: { icon: '🔧', text: 'Mission en cours' }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-full bg-[#F2F3F7] overflow-x-hidden pb-safe">
        <OnboardingModal />
        <LocationPermissionModal />
        <TopBar />

        {/* ── Active mission banner — Uber Eats style ── */}
        <AnimatePresence>
          {activeRequest &&
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="mx-4 mt-3 overflow-hidden"
            style={{ borderRadius: 20 }}>
            
              <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
              className="w-full text-left"
              style={{
                background: 'linear-gradient(135deg, #00B894 0%, #00897B 100%)',
                borderRadius: 20,
                boxShadow: '0 6px 24px rgba(0,184,148,0.35)'
              }}>
              
                {/* Top row */}
                <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                  {/* Pro avatar */}
                  <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-base font-black text-white"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>
                  
                    {(activeRequest.professional_name || 'P')[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Pulsing dot */}
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                      </span>
                      <p className="text-sm font-black text-white leading-none">
                        {activeStatusLabel[activeRequest.status]?.text}
                      </p>
                    </div>
                    <p className="text-xs text-white/75 truncate">
                      {activeRequest.professional_name} · {activeRequest.category_name}
                    </p>
                  </div>

                  <div
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl shrink-0"
                  style={{ background: 'rgba(255,255,255,0.22)' }}>
                  
                    <span className="text-white text-xs font-black">Suivre</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Bottom progress bar */}
                <div className="h-1 mx-4 mb-4 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: '20%' }}
                  animate={{ width: activeRequest.status === 'in_progress' ? '80%' : activeRequest.status === 'pro_en_route' ? '55%' : '25%' }}
                  transition={{ duration: 1.2, ease: 'easeOut' }} />
                
                </div>
              </motion.button>
            </motion.div>
          }
        </AnimatePresence>

        {/* ── Unfinished request banner ── */}
        <AnimatePresence>
          {unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-500 px-4 py-3 flex items-center gap-3 overflow-hidden">
            
              <Clock className="w-4 h-4 text-white shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{unfinishedRequest.category_name}</p>
                <p className="text-xs text-white/80">Recherche d'un professionnel…</p>
              </div>
              <button
              onClick={() => setDismissedId(unfinishedRequest.id)}
              className="text-white/70 p-1 tap-scale">
              
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          }
        </AnimatePresence>

        <div className="pb-8">

          {/* ── Hero section ── */}
          <div className="bg-white px-5 pt-5 pb-6">
            <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight">
              {firstName ? `${greeting},\n${firstName} 👋` : `${greeting} 👋`}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Que puis-je faire pour vous aujourd'hui ?</p>
          </div>

          {/* ── SOS / Urgence — Uber-style action card ── */}
          <div className="px-4 mt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/Emergency')}
              className="w-full rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 4px 20px rgba(225,112,85,0.3)' }}>
              
              <div
                className="px-5 py-4 flex items-center gap-4"
                style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)' }}>
                
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
            {unfinishedRequest && confirmCancel &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-4 mt-3 bg-white rounded-2xl p-4 flex gap-2"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              
                <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-foreground tap-scale">
                
                  Conserver
                </button>
                <button
                onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                disabled={cancelMutation.isPending}
                className="flex-1 h-11 rounded-xl text-sm font-bold text-white tap-scale disabled:opacity-60 bg-destructive">
                
                  {cancelMutation.isPending ? 'Annulation…' : 'Annuler la demande'}
                </button>
              </motion.div>
            }
          </AnimatePresence>

          {/* ── Services ── */}
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-foreground">Nos services</h2>
            </div>

            {isLoading ?
            <HomeSkeleton /> :
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {categories.map((category, index) =>
              <ServiceCard
                key={category.id}
                category={category}
                index={index}
                onSearch={() => navigate(`/ServiceRequest?categoryId=${category.id}`)} />
              )}
              </div>
            }
          </div>

          {/* ── Stories before/after ── */}
          <ProStoriesCarousel />

          {/* ── Mission offerte ── */}
          {user && <FreeMissionWidget userEmail={user.email} />}

          {/* ── Top professionnels ── */}
           {!loadingNearby && nearbyPros.length > 0 &&
           <div className="mt-8">
               <div className="flex items-center justify-between mb-4 px-4">
                 <h2 className="text-xl font-black text-foreground">Top professionnels</h2>
               </div>
               <div className="px-4">
                 <LazyProGrid
                   items={nearbyPros}
                   columns={3}
                   renderItem={(pro) => (
                     <button
                       onClick={() => setViewingPro(pro)}
                       className="cursor-pointer"
                     >
                       <NearbyProCard pro={pro} onPress={() => setViewingPro(pro)} />
                     </button>
                   )}
                 />
               </div>
             </div>
           }

          {/* ── Avis récents ── */}
          {recentReviews.length > 0 &&
          <div className="mt-8 px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-foreground">Ce qu'ils disent</h2>
                <button
                onClick={() => navigate('/ProReviews')}
                className="text-sm font-bold flex items-center gap-1"
                style={{ color: BRAND }}>
                
                  Voir tout <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {recentReviews.map((review, i) =>
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl p-4"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
                    
                        {(review.customer_name || 'C')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{review.customer_name || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{review.category_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-amber-600">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment &&
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">"{review.comment}"</p>
                }
                  </motion.div>
              )}
              </div>
            </div>
          }

          {/* ── Trust strip — Airbnb style ── */}
          <div className="mt-8 mx-4 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center mb-4">
              Pourquoi ServiGo
            </p>
            <div className="flex items-center justify-around gap-2">
              {[
              { icon: Shield, label: 'Pros vérifiés' },
              { icon: FileText, label: 'Contrat inclus' },
              { icon: CreditCard, label: 'Paiement sécurisé' }].
              map(({ icon: Icon, label }) =>
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: `${BRAND}10` }}>
                  
                    <Icon className="w-5 h-5" style={{ color: BRAND }} strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] text-gray-500 font-semibold leading-tight">{label}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Identity pending ── */}
          {user && user.eid_status !== 'verified' && user.eid_status !== undefined &&
          <div className="mx-4 mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-center gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">Identité non vérifiée</p>
                <p className="text-xs text-amber-700 mt-0.5">Certaines fonctionnalités sont limitées</p>
              </div>
              <button
              onClick={() => navigate('/EidVerification')}
              className="text-xs font-black whitespace-nowrap px-3 py-2 rounded-xl text-white shrink-0"
              style={{ background: '#E2A000' }}>
              
                Vérifier
              </button>
            </div>
          }
        </div>

        {viewingPro &&
        <ProProfileSheet
          pro={viewingPro}
          onClose={() => setViewingPro(null)}
          onSelect={(pro) => {
            const cat = categories.find((c) => c.name === pro.category_name);
            if (cat) navigate(`/ServiceRequest?categoryId=${cat.id}&priorityProId=${pro.id}`);
            setViewingPro(null);
          }} />
        }
      </div>
    </PullToRefresh>
  );
}