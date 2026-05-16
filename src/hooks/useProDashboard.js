import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

export function useProDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestPermission, notify } = useNotifications();
  const prevCountRef = useRef(null);
  const lastGpsUpdateRef = useRef(0);

  useEffect(() => { requestPermission(); }, [requestPermission]);

  // ─── User & verification ───────────────────────────────────────────────────
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: proVerif } = useQuery({
    queryKey: ['identityVerif', user?.email],
    queryFn: () =>
      base44.entities.IdentityVerification
        .filter({ user_email: user.email }, '-created_date', 1)
        .then(r => r[0] || null),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const eidApproved = proVerif?.status === 'approved' || user?.eid_status === 'verified';

  useEffect(() => {
    if (!user) return;
    const isPreview = window.location.hostname.includes('preview');
    if (!isPreview && !user.independence_charter_signed) {
      navigate('/IndependenceCharter', { replace: true });
    }
  }, [user, navigate]);

  // ─── Subscription ──────────────────────────────────────────────────────────
  const { data: subscription } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () =>
      base44.entities.ProSubscription
        .filter({ professional_email: user.email }, '-created_date')
        .then(subs => {
          const PRIORITY = { active: 0, trial: 1, pending_payment: 2, expired: 3, cancelled: 4 };
          return [...subs].sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9))[0] || null;
        }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!subscription || subscription.status !== 'active') return;
    if (new Date(subscription.renewal_date) < new Date()) {
      base44.entities.ProSubscription.update(subscription.id, { status: 'expired', auto_renew: false }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['proSubscription', user?.email] });
    }
  }, [subscription]);

  const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'trial';
  const proCategory = user?.category_name;

  // ─── Incoming requests ─────────────────────────────────────────────────────
  const { data: poolRequests = [] } = useQuery({
    queryKey: ['poolRequests', proCategory],
    queryFn: () =>
      base44.entities.ServiceRequestV2
        .filter({ category_name: proCategory, status: 'searching' }, '-created_date'),
    enabled: !!proCategory,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const { data: assignedRequests = [] } = useQuery({
    queryKey: ['assignedRequests', user?.email],
    queryFn: () =>
      base44.entities.ServiceRequestV2
        .filter({ professional_email: user.email, status: 'pending_pro' }, '-created_date'),
    enabled: !!user?.email,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const incomingRequests = useMemo(() => {
    const seen = new Set();
    return [
      ...assignedRequests.filter(r => !seen.has(r.id) && seen.add(r.id)),
      ...poolRequests.filter(r => !seen.has(r.id) && seen.add(r.id)),
    ];
  }, [assignedRequests, poolRequests]);

  // Subscription supprimée — remplacée par refetchInterval: 30000 sur chaque query
  // (évite N connexions WebSocket simultanées à l'échelle)

  useEffect(() => {
    const count = incomingRequests.length;
    if (prevCountRef.current !== null && count > prevCountRef.current && incomingRequests[0]) {
      notify('Nouvelle demande', `${incomingRequests[0].category_name} — ${incomingRequests[0].customer_address || ''}`);
    }
    prevCountRef.current = count;
  }, [incomingRequests, notify]);

  // ─── My jobs ───────────────────────────────────────────────────────────────
  const { data: myJobs = [] } = useQuery({
    queryKey: ['myJobs', user?.email],
    queryFn: () =>
      base44.entities.ServiceRequestV2
        .filter({ professional_email: user.email }, '-created_date', 20),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const hasActiveMission = myJobs.some(j => ['accepted', 'pro_en_route', 'in_progress'].includes(j.status));
  useEffect(() => {
    if (!user?.id || !hasActiveMission || !navigator.geolocation) return;
    const GPS_THROTTLE_MS = 30_000; // max 1 écriture DB / 30s
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastGpsUpdateRef.current < GPS_THROTTLE_MS) return;
        lastGpsUpdateRef.current = now;
        base44.entities.User.update(user.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.id, hasActiveMission]);

  const { data: myReviews = [] } = useQuery({
    queryKey: ['myReviews', user?.email],
    queryFn: () => base44.entities.Review.filter({ professional_email: user.email }, '-created_date', 5),
    enabled: !!user?.email,
    staleTime: 120000,
  });

  // ─── Computed ──────────────────────────────────────────────────────────────
  const activeJobs = myJobs.filter(j =>
    ['contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'accepted'].includes(j.status)
  );
  const completedJobs = myJobs.filter(j => j.status === 'completed');
  const upcomingJob = myJobs.find(j => {
    if (!['contract_signed', 'accepted'].includes(j.status) || !j.scheduled_date) return false;
    const d = new Date(j.scheduled_date);
    return d >= new Date() && d <= new Date(Date.now() + 24 * 3600 * 1000);
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const acceptMutation = useMutation({
    mutationFn: async ({ requestId, request }) => {
      const fresh = await base44.entities.ServiceRequestV2
        .filter({ id: requestId }).then(r => r[0]);
      if (!fresh || !['searching', 'pending_pro'].includes(fresh.status)) {
        throw new Error('Mission déjà prise');
      }
      await base44.entities.ServiceRequestV2.update(requestId, {
        status: 'contract_pending',
        professional_id: user.id,
        professional_name: user.full_name,
        professional_email: user.email,
      });
      await base44.entities.MissionContract.create({
        request_id: requestId,
        contract_number: `CTR-${Date.now()}`,
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
        await base44.entities.ProSubscription.update(subscription.id, {
          missions_received: (subscription.missions_received || 0) + 1,
        });
      }
    },
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['poolRequests', proCategory] });
      const previous = queryClient.getQueryData(['poolRequests', proCategory]);
      queryClient.setQueryData(['poolRequests', proCategory], old => (old || []).filter(r => r.id !== requestId));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poolRequests', proCategory] });
      queryClient.invalidateQueries({ queryKey: ['assignedRequests', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['myJobs', user?.email] });
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
          body: `Évaluez ${user?.full_name || 'votre artisan'} pour sa prestation ${job.category_name}.`,
          request_id: id,
          action_url: `/Chat?requestId=${id}`,
        });
        base44.functions.invoke('awardLoyaltyPoints', {
          user_email: job.customer_email,
          user_name: job.customer_name || '',
          user_type: 'particulier',
          points_to_add: 50,
          reason: `Mission ${job.category_name} complétée`,
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Statut mis à jour !');
    },
  });

  return {
    user,
    proVerif,
    eidApproved,
    subscription,
    hasActiveSub,
    proCategory,
    incomingRequests,
    assignedRequests,
    activeJobs,
    completedJobs,
    upcomingJob,
    myReviews,
    acceptMutation,
    statusMutation,
    navigate,
  };
}
