import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, Clock, MapPin, Star, Bell, MessageCircle, ShieldCheck, ChevronRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

export default function ProDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestPermission, notify } = useNotifications();
  const prevCountRef = useRef(null);

  useEffect(() => { requestPermission(); }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const proCategory = user?.data?.category_name || user?.category_name;

  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['incomingRequests', proCategory],
    queryFn: async () => {
      if (!proCategory) return [];
      return base44.entities.ServiceRequest.filter({ category_name: proCategory, status: 'searching' }, '-created_date');
    },
    enabled: !!proCategory,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (incomingRequests === undefined) return;
    const count = incomingRequests.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      const newReq = incomingRequests[0];
      notify('Nouvelle demande', `${newReq?.category_name} • ${newReq?.customer_address || ''}`);
    }
    prevCountRef.current = count;
  }, [incomingRequests?.length]);

  const { data: myJobs = [] } = useQuery({
    queryKey: ['myJobs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ServiceRequest.filter({ professional_email: user.email }, '-created_date', 20);
    },
    enabled: !!user?.email,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, request }) => {
      await base44.entities.ServiceRequest.update(requestId, {
        status: 'accepted',
        professional_id: user.id,
        professional_name: user.full_name,
        professional_email: user.email,
        payment_status: request.payment_method === 'cash' ? 'unpaid' : 'paid',
      });
      await base44.entities.Invoice.create({
        request_id: requestId,
        invoice_number: `INV-${Date.now()}`,
        category_name: request.category_name,
        professional_name: user.full_name,
        base_price: request.base_price,
        commission: request.commission,
        total_price: request.total_price,
        payment_method: request.payment_method,
        payment_status: request.payment_method === 'cash' ? 'unpaid' : 'paid',
        customer_name: request.customer_name,
        customer_email: request.customer_email,
      });
    },
    // Optimistic update : retire immédiatement la demande de la liste
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ['incomingRequests', proCategory] });
      const previous = queryClient.getQueryData(['incomingRequests', proCategory]);
      queryClient.setQueryData(['incomingRequests', proCategory], old =>
        (old || []).filter(r => r.id !== requestId)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('Mission acceptée !');
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['incomingRequests', proCategory], context.previous);
      }
      toast.error('Mission déjà prise par un autre professionnel.');
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
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

  const acceptedJobs = myJobs.filter(j => j.status === 'accepted' || j.status === 'completed');
  const revenue = acceptedJobs.reduce((sum, j) => sum + (j.base_price || 0), 0);

  return (
    <div className="px-5 pt-7 pb-4 space-y-7">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.category_name || 'Professionnel'} · {user?.full_name}
            </p>
          </div>
          {user?.verification_status === 'verified' ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted border border-border rounded-full px-3 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Vérifié
            </span>
          ) : (
            <button
              onClick={() => navigate('/ProProfile')}
              className="text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1.5 hover:border-foreground transition-colors"
            >
              Vérifier mon compte →
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Missions</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{acceptedJobs.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
            <p className="text-xs text-muted-foreground font-medium">Note moy.</p>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {user?.rating ? user.rating.toFixed(1) : '—'}
          </p>
          {user?.reviews_count > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{user.reviews_count} avis</p>
          )}
        </div>
      </div>

      {/* Incoming requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Demandes disponibles</h2>
            {incomingRequests.length > 0 && (
              <span className="text-xs font-bold bg-foreground text-background rounded-full w-5 h-5 flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </div>
          {incomingRequests.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-xs text-muted-foreground">En direct</span>
            </div>
          )}
        </div>

        {incomingRequests.length === 0 ? (
          <div className="bg-muted/50 rounded-xl p-5 text-center border border-border">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucune demande pour l'instant</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les nouvelles missions de {proCategory || 'votre métier'} apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{req.category_name}</p>
                      {req.is_urgent && (
                        <span className="text-[10px] font-bold bg-destructive text-white rounded-full px-2 py-0.5 flex items-center gap-0.5">
                          ⚡ SOS
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{req.customer_address || 'Adresse non précisée'}</span>
                    </p>
                    {req.scheduled_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.scheduled_date}{req.scheduled_time ? ` · ${req.scheduled_time}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold text-base">{(req.base_price || 80).toFixed(0)} €</p>
                    <p className="text-[10px] text-muted-foreground">votre part</p>
                  </div>
                </div>

                {req.answers?.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 mb-3 space-y-1">
                    {req.answers.map((a, idx) => (
                      <p key={idx} className="text-xs">
                        <span className="text-muted-foreground">{a.question} : </span>
                        <span className="font-medium">{a.answer}</span>
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => respondMutation.mutate({ requestId: req.id, request: req })}
                  disabled={respondMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <Check className="w-4 h-4" strokeWidth={2.2} />
                  Accepter cette mission
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent jobs */}
      {acceptedJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold tracking-tight mb-3">Missions récentes</h2>
          <div className="space-y-2">
            {acceptedJobs.slice(0, 5).map(job => (
              <button
                key={job.id}
                onClick={() => navigate(`/Chat?requestId=${job.id}`)}
                className="w-full bg-card rounded-xl px-4 py-3 border border-border flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
                  {job.customer_name?.[0] || '?'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{job.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{job.category_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{job.base_price?.toFixed(0)} €</p>
                  <p className="text-[10px] text-muted-foreground">
                    {job.status === 'completed' ? 'Terminé' : 'En cours'}
                  </p>
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
          <h2 className="text-sm font-semibold tracking-tight mb-3">Avis clients</h2>
          <div className="space-y-2">
            {myReviews.map(review => (
              <div key={review.id} className="bg-card rounded-xl p-3.5 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{review.customer_name || 'Client'}</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star
                        key={s}
                        style={{ width: 12, height: 12 }}
                        className={s <= review.rating ? 'text-foreground fill-foreground' : 'text-border fill-border'}
                      />
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

    </div>
  );
}