import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, Clock, MapPin, Star, ShieldCheck, ChevronRight, TrendingUp, CreditCard, AlertCircle, Play, StopCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ProStats from '@/components/pro/ProStats';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import MissionProgress from '@/components/mission/MissionProgress';

const getTimeSinceCreated = (createdDate) => {
  if (!createdDate) return 0;
  const created = new Date(createdDate);
  const now = new Date();
  return Math.floor((now - created) / 60000);
};

export default function ProDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestPermission, notify } = useNotifications();
  const prevCountRef = useRef(null);
  const [activeTab, setActiveTab] = useState('missions');
  const [showProReviewModal, setShowProReviewModal] = useState(null);
  const [proRating, setProRating] = useState(5);
  const [proComment, setProComment] = useState('');

  useEffect(() => { requestPermission(); }, []);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const proCategory = user?.category_name;

  // Gate: redirect if independence charter not signed
  useEffect(() => {
    if (!user) return;
    if (!user.independence_charter_signed) {
      navigate('/IndependenceCharter', { replace: true });
    }
  }, [user, navigate]);

  const { data: subscription } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () => {
      const PRIORITY = { active: 0, trial: 1, pending_payment: 2, expired: 3, cancelled: 4 };
      return base44.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date').then(subs => {
        subs.sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
        return subs[0] || null;
      });
    },
    enabled: !!user?.email,
  });

  // Auto-expire subscription if renewal_date has passed
  useEffect(() => {
    if (!subscription || subscription.status !== 'active') return;
    const renewalDate = new Date(subscription.renewal_date);
    const today = new Date();
    if (renewalDate < today) {
      base44.entities.ProSubscription.update(subscription.id, { status: 'expired', auto_renew: false }).catch(() => {});
      if (user?.id) base44.entities.User.update(user.id, { subscription_active: false }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['proSubscription', user?.email] });
    }
  }, [subscription, user, queryClient]);

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial';

  // Query A: open pool (status='searching')
  const { data: poolRequests = [] } = useQuery({
    queryKey: ['poolRequests', proCategory],
    queryFn: async () => {
      if (!proCategory) return [];
      return base44.entities.ServiceRequestV2.filter({ category_name: proCategory, status: 'searching' }, '-created_date');
    },
    enabled: !!proCategory,
    staleTime: 30000,
  });

  // Query B: assigned to this pro (status='pending_pro')
  const { data: assignedRequests = [] } = useQuery({
    queryKey: ['assignedRequests', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ServiceRequestV2.filter({ professional_email: user.email, status: 'pending_pro' }, '-created_date');
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // Merge and deduplicate by id, assigned first
  const mergedIds = new Set();
  const incomingRequests = [
    ...assignedRequests.filter(r => { if (mergedIds.has(r.id)) return false; mergedIds.add(r.id); return true; }),
    ...poolRequests.filter(r => { if (mergedIds.has(r.id)) return false; mergedIds.add(r.id); return true; }),
  ];

  useEffect(() => {
    if (!proCategory || !user?.email) return;
    const unsub = base44.entities.ServiceRequestV2.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['poolRequests', proCategory] });
        queryClient.invalidateQueries({ queryKey: ['assignedRequests', user.email] });
      }
    });
    return unsub;
  }, [proCategory, user?.email, queryClient]);

  useEffect(() => {
    if (!incomingRequests?.length) return;
    const count = incomingRequests.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      const newReq = incomingRequests[0];
      notify('Nouvelle demande', `${newReq?.category_name} — ${newReq?.customer_address || ''}`);
    }
    prevCountRef.current = count;
  }, [incomingRequests?.length]);

  const { data: myJobs = [] } = useQuery({
    queryKey: ['myJobs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ServiceRequestV2.filter({ professional_email: user.email }, '-created_date', 20);
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // GPS tracking for active missions
  useEffect(() => {
    if (!user?.id) return;
    const hasActive = myJobs.some(j => ['accepted', 'pro_en_route', 'in_progress'].includes(j.status));
    if (!hasActive || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { base44.entities.User.update(user.id, { latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {}); },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.id, myJobs]);

  const acceptMutation = useMutation({
    mutationFn: async ({ requestId, request }) => {
      await base44.entities.ServiceRequestV2.update(requestId, {
        status: 'contract_pending',
        professional_id: user.id,
        professional_name: user.full_name,
        professional_email: user.email,
      });
      const contractNumber = `CTR-${Date.now()}`;
      await base44.entities.MissionContract.create({
        request_id: requestId,
        contract_number: contractNumber,
        customer_email: request.customer_email,
        customer_name: request.customer_name,
        customer_phone: request.customer_phone || '',
        customer_address: request.customer_address,
        professional_email: user.email,
        professional_name: user.full_name,
        professional_phone: user.phone,
        professional_bce: user.bce_number,
        category_name: request.category_name,
        service_description: request.answers?.length > 0
          ? request.answers.map(a => `${a.question}: ${a.answer}`).join(' | ')
          : request.category_name,
        scheduled_date: request.scheduled_date,
        scheduled_time: request.scheduled_time,
        estimated_duration_hours: 2,
        agreed_price: request.estimated_price || 0,
        cancellation_policy: 'free_24h',
        payment_terms: 'after_completion',
        status: 'sent_to_customer',
      });
      await base44.entities.Notification.create({
        recipient_email: request.customer_email,
        recipient_type: 'particulier',
        type: 'contract_to_sign',
        title: `Mission acceptée par ${user.full_name}`,
        body: 'Un contrat de mission vous a été envoyé. Signez-le pour démarrer.',
        request_id: requestId,
        action_url: `/Chat?requestId=${requestId}`,
      });
      if (subscription?.id) {
        await base44.entities.ProSubscription.update(subscription.id, { missions_received: (subscription.missions_received || 0) + 1 });
      }
    },
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['poolRequests', proCategory] });
      const previous = queryClient.getQueryData(['poolRequests', proCategory]);
      queryClient.setQueryData(['poolRequests', proCategory], old => (old || []).filter(r => r.id !== requestId));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poolRequests'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Mission acceptée ! Un contrat a été envoyé au client.');
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['poolRequests', proCategory], ctx.previous);
      toast.error('Mission déjà prise. Réessayez.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, job }) => {
      await base44.entities.ServiceRequestV2.update(id, { status });
      if (status === 'completed' && job && !job.review_requested) {
        await base44.entities.ServiceRequestV2.update(id, { review_requested: true });
        await base44.entities.Notification.create({
          recipient_email: job.customer_email,
          recipient_type: 'particulier',
          type: 'review_request',
          title: "Comment s'est passée votre mission ?",
          body: `Évaluez ${user?.full_name || 'votre artisan'} pour sa prestation ${job.category_name}. Votre avis aide d'autres clients.`,
          request_id: id,
          action_url: `/Chat?requestId=${id}`,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Statut mis à jour !');
      if (variables.status === 'completed' && variables.job) {
        setShowProReviewModal(variables.job);
        setProRating(5);
        setProComment('');
      }
    },
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ['myReviews', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Review.filter({ professional_email: user.email }, '-created_date', 5);
    },
    enabled: !!user?.email,
    staleTime: 120000,
  });

  const upcomingJob = myJobs.find(j => {
    if (!['contract_signed', 'accepted'].includes(j.status) || !j.scheduled_date) return false;
    const d = new Date(j.scheduled_date);
    const now = new Date();
    return d >= now && d <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
  });

  const completedJobs = myJobs.filter(j => j.status === 'completed');
  const activeJobs = myJobs.filter(j => ['contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'accepted'].includes(j.status));

  return (
    <div className="px-4 sm:px-6 pt-7 pb-4 space-y-5 bg-white min-h-full">

      {/* Upcoming mission reminder */}
      {upcomingJob && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Mission demain !</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">{upcomingJob.category_name} à {upcomingJob.scheduled_time || '?'} chez {upcomingJob.customer_name || 'le client'}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {(() => { if (user?.first_name) return `Bonjour, ${user.first_name} 👋`; const h = (user?.full_name||'').includes('@') ? user.full_name.split('@')[0] : (user?.full_name||''); const s = h.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0]||''; return s.length>=2 ? `Bonjour, ${s[0].toUpperCase()+s.slice(1).toLowerCase()} 👋` : 'Dashboard Pro'; })()}
        </h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-gray-500 text-sm">{user?.category_name || 'Professionnel'}</p>
          {user?.verification_status === 'verified'
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1"><ShieldCheck className="w-3.5 h-3.5" />Vérifié</span>
            : <button onClick={() => navigate('/ProProfile')} className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-full px-3 py-1">Vérifier →</button>
          }
        </div>
      </div>

      {/* Earnings card */}
      <div className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a78bfa)', boxShadow: '0 8px 24px rgba(108,92,231,0.25)' }}>
        <p className="text-white/70 text-sm font-medium">Missions terminées</p>
        <p className="text-5xl font-black mt-1">{completedJobs.length}</p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-white/70 text-xs">Note</p>
            <p className="text-white font-bold text-lg">{user?.rating ? user.rating.toFixed(1) : '—'} ⭐</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white/70 text-xs">En cours</p>
            <p className="text-white font-bold text-lg">{activeJobs.length}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white/70 text-xs">Avis</p>
            <p className="text-white font-bold text-lg">{user?.reviews_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Identity pending banner */}
      {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-lg shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Identité non vérifiée</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Certaines fonctionnalités sont limitées en attendant la vérification.</p>
          </div>
          <button onClick={() => navigate('/EidVerification')} className="text-xs font-bold text-orange-700 dark:text-orange-300 underline">Vérifier</button>
        </div>
      )}

      {/* Subscription banner */}
      {!subscription || subscription.status === 'pending_payment' ? (
        <button onClick={() => navigate('/ProSubscription')} className="w-full rounded-2xl p-4 border border-blue-200 bg-blue-50 flex items-center gap-3 text-left">
          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">🚀 Activez votre abonnement Pro</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">10€/mois — Recevez des missions dès aujourd'hui</p>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">S'abonner →</span>
        </button>
      ) : hasActiveSubscription ? (
        <button onClick={() => navigate('/ProSubscription')} className="w-full rounded-2xl p-4 border border-green-200 bg-green-50 flex items-center gap-3 text-left">
          <CreditCard className="w-5 h-5 text-[#38A169] dark:text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Abonnement actif</p>
            <p className="text-xs text-muted-foreground">{`10 €/mois · ${subscription.renewal_date ? `Renouvellement le ${subscription.renewal_date}` : ''}`}</p>
          </div>
          <span className="text-xs font-bold text-primary">→</span>
        </button>
      ) : (
        <button onClick={() => navigate('/ProSubscription')} className="w-full rounded-2xl p-4 border border-red-200 bg-red-50 flex items-center gap-3 text-left">
          <CreditCard className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">⚠️ Abonnement expiré</p>
            <p className="text-xs text-red-600 dark:text-red-400">Renouvelez-le pour continuer à recevoir des missions</p>
          </div>
          <span className="text-xs font-bold text-red-600 dark:text-red-400">Renouveler →</span>
        </button>
      )}

      {/* Subscription expired overlay */}
      {subscription && ['expired', 'cancelled'].includes(subscription.status) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-800 dark:text-red-300">Abonnement expiré</h3>
          <p className="text-sm text-red-700 dark:text-red-400">Votre abonnement a expiré. Renouvelez-le pour accéder aux missions clients.</p>
          <Button onClick={() => navigate('/ProSubscription')} className="w-full h-12 rounded-xl">
            <CreditCard className="w-4 h-4 mr-2" /> Renouveler maintenant
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[['missions', 'Missions', incomingRequests.length], ['stats', 'Statistiques', 0]].map(([key, label, count]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px] ${activeTab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>
            {label}
            {count > 0 && <span className={`text-xs font-bold rounded-full px-1.5 ${activeTab === key ? 'bg-white/25 text-white' : 'bg-muted text-foreground'}`}>{count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && <ProStats userEmail={user?.email} />}

      {activeTab === 'missions' && (
        <>
          {/* Stats removed — shown in earnings card above */}

          {/* Locked preview for inactive subscription */}
          {!hasActiveSubscription && incomingRequests.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center px-4">
                  <p className="text-white text-sm font-semibold mb-3">Abonnez-vous pour voir ces {incomingRequests.length} demande{incomingRequests.length !== 1 ? 's' : ''}</p>
                  <Button onClick={() => navigate('/ProSubscription')} className="bg-white text-primary hover:bg-white/90">
                    S'abonner maintenant
                  </Button>
                </div>
              </div>
              <div className="pointer-events-none opacity-40 space-y-3 p-1">
                {incomingRequests.slice(0, 2).map((req) => (
                  <div key={req.id} className="bg-card rounded-xl p-4 border border-border">
                    <p className="text-sm font-semibold">{req.category_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.customer_address || 'Adresse non précisée'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming requests (only when active) */}
          {hasActiveSubscription && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Demandes disponibles</h2>
                  {incomingRequests.length > 0 && <span className="text-xs font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">{incomingRequests.length}</span>}
                </div>
                {incomingRequests.length > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#38A169] animate-pulse" /><span className="text-xs text-muted-foreground">En direct</span></div>}
              </div>

              {incomingRequests.length === 0 ? (
                <div className="bg-muted/50 rounded-xl p-5 text-center border border-border">
                  <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm font-medium">Aucune demande pour l'instant</p>
                  <p className="text-xs text-muted-foreground mt-1">Les nouvelles missions de {proCategory || 'votre métier'} apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((req, i) => {
                    const isAssigned = assignedRequests.some(a => a.id === req.id);
                    const createdMinutesAgo = isAssigned ? getTimeSinceCreated(req.created_date) : null;
                    return (
                      <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isAssigned && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">📌 Assigné à vous</span>}
                              <p className="font-semibold text-sm">{req.category_name}</p>
                              {req.is_urgent && <span className="text-[10px] font-bold bg-destructive text-white rounded-full px-2 py-0.5">⚡ SOS</span>}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.8} />
                              <span className="truncate">{req.customer_address || 'Adresse non précisée'}</span>
                            </p>
                            {req.scheduled_date && <p className="text-xs text-muted-foreground mt-0.5">📅 {req.scheduled_date}{req.scheduled_time ? ` à ${req.scheduled_time}` : ''}</p>}
                            {createdMinutesAgo !== null && <p className="text-xs text-orange-600 mt-2">⏰ Cette demande vous attend depuis {createdMinutesAgo} minute{createdMinutesAgo !== 1 ? 's' : ''} — répondez vite !</p>}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="font-bold text-base text-primary">{(req.estimated_price || req.base_price || 0).toFixed(0)} €</p>
                            <p className="text-[10px] text-muted-foreground">estimé</p>
                          </div>
                        </div>
                        {req.answers?.length > 0 && (
                          <div className="bg-muted rounded-lg p-3 mb-3 space-y-1">
                            {req.answers.slice(0, 2).map((a, idx) => (
                              <p key={idx} className="text-xs"><span className="text-muted-foreground">{a.question} : </span><span className="font-medium">{a.answer}</span></p>
                            ))}
                          </div>
                        )}
                        <button onClick={() => acceptMutation.mutate({ requestId: req.id, request: req })} disabled={acceptMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
                          <Check className="w-4 h-4" strokeWidth={2.2} /> Accepter cette mission
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Active missions */}
          {hasActiveSubscription && activeJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">Missions en cours</h2>
              <div className="space-y-3">
                {activeJobs.map(job => (
                  <div key={job.id} className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{job.customer_first_name ? `${job.customer_first_name} ${job.customer_last_name?.[0] || ''}.` : (job.customer_name || 'Client')}</p>
                        <p className="text-xs text-muted-foreground">{job.category_name}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{(job.base_price || 0).toFixed(0)} €</span>
                    </div>
                    <MissionProgress status={job.status} compact />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-xs" onClick={() => navigate(`/Chat?requestId=${job.id}`)}>
                        <ChevronRight className="w-3.5 h-3.5 mr-1" /> Chat & Contrat
                      </Button>
                      {job.status === 'contract_signed' && (
                        <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-[#38A169] hover:bg-[#38A169]/90" onClick={() => statusMutation.mutate({ id: job.id, status: 'pro_en_route', job })}>
                          <Play className="w-3.5 h-3.5 mr-1" /> En route
                        </Button>
                      )}
                      {job.status === 'pro_en_route' && (
                        <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => statusMutation.mutate({ id: job.id, status: 'in_progress', job })}>
                          <Play className="w-3.5 h-3.5 mr-1" /> Démarrer
                        </Button>
                      )}
                      {job.status === 'in_progress' && (
                        <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-[#38A169] hover:bg-[#38A169]/90" onClick={() => statusMutation.mutate({ id: job.id, status: 'completed', job })}>
                          <StopCircle className="w-3.5 h-3.5 mr-1" /> Terminer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent completed */}
          {hasActiveSubscription && completedJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">Missions récentes</h2>
              <div className="space-y-2">
                {completedJobs.slice(0, 5).map(job => (
                  <button key={job.id} onClick={() => navigate(`/Chat?requestId=${job.id}`)} className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">{(job.customer_first_name || job.customer_name || 'C')[0]}</div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{job.customer_first_name ? `${job.customer_first_name} ${job.customer_last_name?.[0] || ''}.` : (job.customer_name || 'Client')}</p>
                      <p className="text-xs text-muted-foreground">{job.category_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{(job.base_price || 0).toFixed(0)} €</p>
                      <p className="text-[10px] text-[#38A169] font-medium">Terminé</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {hasActiveSubscription && myReviews.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">Avis clients</h2>
              <div className="space-y-2">
                {myReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium">{review.customer_name || 'Client'}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} style={{ width: 12, height: 12 }} className={s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-border fill-border'} />)}
                      </div>
                    </div>
                    {review.comment && <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ProReview modal */}
      <Dialog open={!!showProReviewModal} onOpenChange={(open) => { if (!open) setShowProReviewModal(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Évaluez votre client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{showProReviewModal?.customer_first_name ? `${showProReviewModal.customer_first_name} ${showProReviewModal.customer_last_name || ''}`.trim() : (showProReviewModal?.customer_name || 'Client')}</p>
            <div className="flex gap-1 justify-center">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setProRating(s)} className="p-1">
                  <Star className={`w-8 h-8 transition-colors ${s <= proRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <Textarea
              value={proComment}
              onChange={e => setProComment(e.target.value)}
              placeholder="Laissez un commentaire sur ce client (optionnel)..."
              className="rounded-xl resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowProReviewModal(null)}>Passer</Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={async () => {
                  const job = showProReviewModal;
                  await base44.entities.ProReview.create({
                    request_id: job.id,
                    professional_email: user.email,
                    professional_name: user.full_name,
                    customer_email: job.customer_email,
                    customer_name: job.customer_name || `${job.customer_first_name || ''} ${job.customer_last_name || ''}`.trim(),
                    rating: proRating,
                    comment: proComment,
                    category_name: job.category_name,
                    is_visible: true,
                  });
                  setShowProReviewModal(null);
                  toast.success('Avis envoyé !');
                }}
              >
                Soumettre mon avis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}