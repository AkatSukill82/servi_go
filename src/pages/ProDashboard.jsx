import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, X, Clock, MapPin, Star, Bell, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';

export default function ProDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestPermission, notify } = useNotifications();
  const prevCountRef = useRef(null);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Poll for incoming requests every 5 seconds
  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['incomingRequests', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ServiceRequest.filter({
        professional_email: user.email,
        status: 'pending_pro',
      }, '-created_date');
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  // Fire notification when a new request arrives
  useEffect(() => {
    if (incomingRequests === undefined) return;
    const count = incomingRequests.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      const newReq = incomingRequests[0];
      notify(
        '🔔 Nouvelle demande !',
        `${newReq?.category_name || 'Service'} • ${newReq?.customer_address || ''}`
      );
    }
    prevCountRef.current = count;
  }, [incomingRequests?.length]);

  const { data: myJobs = [] } = useQuery({
    queryKey: ['myJobs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ServiceRequest.filter(
        { professional_email: user.email },
        '-created_date',
        20
      );
    },
    enabled: !!user?.email,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, accept, request }) => {
      if (accept) {
        await base44.entities.ServiceRequest.update(requestId, {
          status: 'accepted',
          payment_status: request.payment_method === 'cash' ? 'unpaid' : 'paid',
        });
        // Create invoice
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
      } else {
        // Refuse: mark as searching again so the system finds next pro
        const tried = [...(request.tried_professionals || []), user.id];
        await base44.entities.ServiceRequest.update(requestId, {
          status: 'searching',
          professional_id: null,
          professional_name: null,
          professional_email: null,
          tried_professionals: tried,
        });
      }
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success(accept ? 'Mission acceptée ! Le client est notifié.' : 'Demande refusée.');
    },
  });

  const acceptedJobs = myJobs.filter(j => j.status === 'accepted' || j.status === 'completed');

  return (
    <div className="px-4 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">
          {user?.category_name || 'Professionnel'} • {user?.full_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground">Missions</p>
          <p className="text-2xl font-bold">{acceptedJobs.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <p className="text-xs text-muted-foreground">Note</p>
          </div>
          <p className="text-2xl font-bold">{user?.rating || '—'}</p>
        </div>
      </div>

      {/* Incoming requests */}
      {incomingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">Nouvelle demande</h2>
            <Badge className="bg-accent text-accent-foreground text-xs">{incomingRequests.length}</Badge>
          </div>
          <div className="space-y-3">
            {incomingRequests.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl p-4 border-2 border-accent/30 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{req.category_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {req.customer_address || 'Adresse non précisée'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{req.base_price?.toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">votre part</p>
                  </div>
                </div>

                {req.answers?.length > 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 mb-3 space-y-1">
                    {req.answers.map((a, i) => (
                      <p key={i} className="text-xs">
                        <span className="text-muted-foreground">{a.question} : </span>
                        <span className="font-medium">{a.answer}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => respondMutation.mutate({ requestId: req.id, accept: false, request: req })}
                    disabled={respondMutation.isPending}
                    className="flex-1 h-11 rounded-xl text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" /> Refuser
                  </Button>
                  <Button
                    onClick={() => respondMutation.mutate({ requestId: req.id, accept: true, request: req })}
                    disabled={respondMutation.isPending}
                    className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" /> Accepter
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {incomingRequests.length === 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">En attente de demandes</p>
          <p className="text-xs text-muted-foreground mt-1">Vous serez notifié dès qu'un client vous contacte</p>
        </div>
      )}

      {/* Recent jobs */}
      {acceptedJobs.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Missions récentes</h2>
          <div className="space-y-2">
            {acceptedJobs.slice(0, 5).map(job => (
              <div key={job.id} className="bg-card rounded-xl p-3 border border-border/50 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{job.category_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{job.base_price?.toFixed(2)} €</p>
                    <Badge variant="secondary" className="text-xs">
                      {job.status === 'completed' ? 'Terminé' : 'Accepté'}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full w-9 h-9 text-primary"
                    onClick={() => navigate(`/Chat?requestId=${job.id}`)}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}