import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, Clock, MapPin, Star, ShieldCheck, ChevronRight, TrendingUp, BarChart2, CreditCard, AlertCircle, Play, StopCircle } from 'lucide-react';
import ProStats from '@/components/pro/ProStats';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import MissionProgress from '@/components/mission/MissionProgress';

export default function ProDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestPermission, notify } = useNotifications();
  const prevCountRef = useRef(null);
  const [activeTab, setActiveTab] = useState('missions');

  useEffect(() => { requestPermission(); }, []);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const proCategory = user?.category_name;

  const { data: subscription } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () => base44.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial';

  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['incomingRequests', proCategory],
    queryFn: async () => {
      if (!proCategory) return [];
      return base44.entities.ServiceRequestV2.filter({ category_name: proCategory, status: 'searching' }, '-created_date');
    },
    enabled: !!proCategory && hasActiveSubscription,
    staleTime: 10000,
  });

  useEffect(() => {
    if (!proCategory) return;
    const unsub = base44.entities.ServiceRequestV2.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['incomingRequests', proCategory] });
      }
    });
    return unsub;
  }, [proCategory]);

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
      // 1. Update request to contract_pending
      await base44.entities.ServiceRequestV2.update(requestId, {
        status: 'contract_pending',
        professional_id: user.id,
        professional_name: user.full_name,
        professional_email: user.email,
      });
      // 2. Create MissionContract
      const contractNumber = `CTR-${Date.now()}`;
      await base44.entities.MissionContract.create({
        request_id: requestId,
        contract_number: contractNumber,
        customer_email: request.customer_email,
        customer_name: request.customer_name,
        customer_address: request.customer_address,
        professional_email: user.email,
        professional_name: user.full_name,
        professional_phone: user.phone,
        professional_bce: user.bce_number,
        category_name: request.category_name,
        scheduled_date: request.scheduled_date,
        scheduled_time: request.scheduled_time,
        agreed_price: request.base_price || 0,
        status: 'sent_to_customer',
      });
      // 3. Notify customer
      await base44.entities.Notification.create({
        recipient_email: request.customer_email,
        recipient_type: 'particulier',
        type: 'contract_to_sign',
        title: `Mission acceptée par ${user.full_name}`,
        body: 'Un contrat de mission vous a été envoyé. Signez-le pour démarrer.',
        request_id: requestId,
      });
      // 4. Update subscription missions count
      if (subscription?.id) {
        await base44.entities.ProSubscription.update(subscription.id, { missions_received: (subscription.missions_received || 0) + 1 });
      }
    },
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['incomingRequests', proCategory] });
      const previous = queryClient.getQueryData(['incomingRequests', proCategory]);
      queryClient.setQueryData(['incomingRequests', proCategory], old => (old || []).filter(r => r.id !== requestId));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Mission acceptée ! Un contrat a été envoyé au client.');
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['incomingRequests', proCategory], ctx.previous);
      toast.error('Mission déjà prise. Réessayez.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ServiceRequestV2.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Statut mis \u00e0 jour !');
    },
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ['myReviews', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Review.filter({ professional_email: user.email }, '-created_date', 5);
    },
    enabled: !!user?.email,
  });

  const completedJobs = myJobs.filter(j => j.status === 'completed');
  const activeJobs = myJobs.filter(j => ['contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'accepted'].includes(j.status));

  return (
    <div className="px-5 pt-7 pb-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Pro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user?.category_name || 'Professionnel'} · {(() => { if (user?.first_name) return user.first_name; const h = (user?.full_name||'').includes('@') ? user.full_name.split('@')[0] : (user?.full_name||''); const s = h.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0]||''; return s.length>=2 ? s[0].toUpperCase()+s.slice(1).toLowerCase() : (user?.email||'').split('@')[0]; })()}</p>
        </div>
        {user?.verification_status === 'verified'
          ? <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-green bg-green-50 border border-green-200 rounded-full px-3 py-1.5"><ShieldCheck className="w-3.5 h-3.5" />Vérifié</span>
          : <button onClick={() => navigate('/ProProfile')} className="text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1.5">Vérifier →</button>
        }
      </div>

      {/* Identity pending banner */}
      {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-lg shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">Identité non vérifiée</p>
            <p className="text-xs text-orange-600">Certaines fonctionnalités sont limitées en attendant la vérification.</p>
          </div>
          <button onClick={() => navigate('/EidVerification')} className="text-xs font-bold text-orange-700 underline">Vérifier</button>
        </div>
      )}

      {/* Subscription banner */}
      {subscription ? (
        <button onClick={() => navigate('/ProSubscription')} className={`w-full rounded-2xl p-4 border flex items-center gap-3 text-left transition-colors ${hasActiveSubscription ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CreditCard className={`w-5 h-5 shrink-0 ${hasActiveSubscription ? 'text-brand-green' : 'text-destructive'}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold">{hasActiveSubscription ? 'Abonnement actif' : '⚠️ Abonnement expiré'}</p>
            <p className="text-xs text-muted-foreground">{hasActiveSubscription ? `10 €/mois · ${subscription.renewal_date ? `Renouvellement le ${subscription.renewal_date}` : ''}` : 'Renouvelez pour continuer à recevoir des missions'}</p>
          </div>
          <span className="text-xs font-bold text-primary">→</span>
        </button>
      ) : (
        <button onClick={() => navigate('/ProSubscription')} className="w-full rounded-2xl p-4 border border-primary/30 bg-primary/5 flex items-center gap-3 text-left">
          <CreditCard className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Activez votre abonnement</p>
            <p className="text-xs text-muted-foreground">10 €/mois pour recevoir des missions</p>
          </div>
          <span className="text-xs font-bold text-primary">S'abonner →</span>
        </button>
      )}

      {/* Subscription expired overlay */}
      {subscription && !hasActiveSubscription && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-800">Abonnement expiré</h3>
          <p className="text-sm text-red-700">Votre abonnement a expiré. Renouvelez-le pour accéder aux missions clients.</p>
          <Button onClick={() => navigate('/ProSubscription')} className="w-full h-12 rounded-xl">
            <CreditCard className="w-4 h-4 mr-2" /> Renouveler maintenant
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[['missions', 'Missions', incomingRequests.length], ['stats', 'Statistiques', 0]].map(([key, label, count]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeTab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>
            {label}
            {count > 0 && <span className="text-xs font-bold bg-white/20 rounded-full px-1.5">{count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && <ProStats userEmail={user?.email} />}

      {activeTab === 'missions' && hasActiveSubscription && <>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} /><p className="text-xs text-muted-foreground font-medium">Missions terminées</p></div>
            <p className="text-3xl font-bold tracking-tight">{completedJobs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-1.5 mb-2"><Star className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} /><p className="text-xs text-muted-foreground font-medium">Note moyenne</p></div>
            <p className="text-3xl font-bold tracking-tight">{user?.rating ? user.rating.toFixed(1) : '—'}</p>
            {user?.reviews_count > 0 && <p className="text-xs text-muted-foreground mt-1">{user.reviews_count} avis</p>}
          </div>
        </div>

        {/* Incoming requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Demandes disponibles</h2>
              {incomingRequests.length > 0 && <span className="text-xs font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">{incomingRequests.length}</span>}
            </div>
            {incomingRequests.length > 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" /><span className="text-xs text-muted-foreground">En direct</span></div>}
          </div>

          {incomingRequests.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-5 text-center border border-border">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium">Aucune demande pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1">Les nouvelles missions de {proCategory || 'votre métier'} apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{req.category_name}</p>
                        {req.is_urgent && <span className="text-[10px] font-bold bg-destructive text-white rounded-full px-2 py-0.5">⚡ SOS</span>}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{req.customer_address || 'Adresse non précisée'}</span>
                      </p>
                      {req.scheduled_date && <p className="text-xs text-muted-foreground mt-0.5">📅 {req.scheduled_date}{req.scheduled_time ? ` à ${req.scheduled_time}` : ''}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-base text-primary">{(req.base_price || 0).toFixed(0)} €</p>
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
              ))}
            </div>
          )}
        </div>

        {/* Active missions */}
        {activeJobs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Missions en cours</h2>
            <div className="space-y-3">
              {activeJobs.map(job => (
                <div key={job.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
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
                      <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-brand-green hover:bg-brand-green/90" onClick={() => statusMutation.mutate({ id: job.id, status: 'pro_en_route' })}>
                        <Play className="w-3.5 h-3.5 mr-1" /> En route
                      </Button>
                    )}
                    {job.status === 'pro_en_route' && (
                      <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => statusMutation.mutate({ id: job.id, status: 'in_progress' })}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Démarrer
                      </Button>
                    )}
                    {job.status === 'in_progress' && (
                      <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-brand-green hover:bg-brand-green/90" onClick={() => statusMutation.mutate({ id: job.id, status: 'completed' })}>
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
        {completedJobs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Missions récentes</h2>
            <div className="space-y-2">
              {completedJobs.slice(0, 5).map(job => (
                <button key={job.id} onClick={() => navigate(`/Chat?requestId=${job.id}`)} className="w-full bg-card rounded-xl px-4 py-3 border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">{(job.customer_first_name || job.customer_name || 'C')[0]}</div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{job.customer_first_name ? `${job.customer_first_name} ${job.customer_last_name?.[0] || ''}.` : (job.customer_name || 'Client')}</p>
                    <p className="text-xs text-muted-foreground">{job.category_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{(job.base_price || 0).toFixed(0)} €</p>
                    <p className="text-[10px] text-brand-green font-medium">Terminé</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {myReviews.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Avis clients</h2>
            <div className="space-y-2">
              {myReviews.map(review => (
                <div key={review.id} className="bg-card rounded-xl p-3.5 border border-border">
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
      </>}
    </div>
  );
}