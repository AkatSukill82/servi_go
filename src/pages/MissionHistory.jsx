import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, MessageCircle, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';

const ACTIVE_STATUSES = ['searching', 'pending_pro', 'accepted', 'contract_pending', 'contract_signed', 'pro_en_route', 'in_progress'];
const DONE_STATUSES = ['completed', 'cancelled', 'disputed'];

const STATUS_CONFIG = {
  searching:        { label: 'Recherche...', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  pending_pro:      { label: 'En attente', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  accepted:         { label: 'Acceptée', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  contract_pending: { label: 'Contrat envoyé', cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  contract_signed:  { label: 'Contrat signé', cls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
  pro_en_route:     { label: 'En route', cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
  in_progress:      { label: 'En cours', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  completed:        { label: 'Terminée ✓', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  cancelled:        { label: 'Annulée', cls: 'bg-muted text-muted-foreground' },
  disputed:         { label: 'En litige', cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
};

function MissionCard({ req, onRate }) {
  const navigate = useNavigate();
  const sc = STATUS_CONFIG[req.status] || { label: req.status, cls: 'bg-gray-100 text-gray-500' };
  const canRate = req.status === 'completed' && !req.review_id && req.review_requested;
  const dateStr = req.scheduled_date
    ? format(parseISO(req.scheduled_date), 'd MMM yyyy', { locale: fr })
    : null;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3 shadow-card tap-scale">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{req.category_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {req.professional_name || <span className="italic">En recherche de professionnel...</span>}
          </p>
          {dateStr && <p className="text-xs text-muted-foreground mt-0.5">📅 {dateStr}</p>}
        </div>
        <div className="text-right shrink-0">
          {req.estimated_price > 0 && <p className="text-sm font-bold text-primary">{req.estimated_price} €</p>}
          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-xs"
          onClick={() => navigate(`/Chat?requestId=${req.id}`)}>
          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Voir le chat
        </Button>
        {canRate && (
          <Button size="sm" className="flex-1 rounded-xl h-9 text-xs bg-yellow-500 hover:bg-yellow-600"
            onClick={() => onRate(req)}>
            <Star className="w-3.5 h-3.5 mr-1" /> Laisser un avis
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label, isActive }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-20 h-20 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
        <FileText className="w-10 h-10 text-[#4F46E5]" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {isActive ? 'Réservez votre premier service en quelques clics' : 'Vos missions terminées apparaîtront ici'}
      </p>
      {isActive && (
        <button
          onClick={() => navigate('/Home')}
          className="mt-3 bg-[#4F46E5] text-white text-sm font-semibold px-6 py-3 rounded-pill tap-scale"
        >
          Trouver un artisan
        </button>
      )}
    </div>
  );
}

export default function MissionHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('active');
  const [ratingTarget, setRatingTarget] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPro = user?.user_type === 'professionnel';

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['missionHistory', user?.email, isPro],
    queryFn: () => {
      const filter = isPro ? { professional_email: user.email } : { customer_email: user.email };
      return base44.entities.ServiceRequestV2.filter(filter, '-created_date', 50);
    },
    enabled: !!user?.email,
  });

  const active = useMemo(() => requests.filter(r => ACTIVE_STATUSES.includes(r.status)), [requests]);
  const done = useMemo(() => requests.filter(r => DONE_STATUSES.includes(r.status)), [requests]);

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const req = ratingTarget;
      const customerName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.full_name || 'Client');
      await base44.entities.Review.create({
        request_id: req.id,
        professional_email: req.professional_email,
        customer_name: customerName,
        customer_email: user.email,
        rating, comment,
        category_name: req.category_name,
      });
      await base44.entities.ServiceRequestV2.update(req.id, { review_id: req.id });
      const allReviews = await base44.entities.Review.filter({ professional_email: req.professional_email });
      const avg = Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10;
      const pros = await base44.entities.User.filter({ email: req.professional_email });
      if (pros[0]) await base44.entities.User.update(pros[0].id, { rating: avg, reviews_count: allReviews.length });
    },
    onSuccess: () => {
      setRatingTarget(null);
      toast.success('Merci pour votre avis !');
      queryClient.invalidateQueries({ queryKey: ['missionHistory'] });
    },
  });

  const displayed = tab === 'active' ? active : done;

  return (
    <div className="min-h-full bg-background pb-6">
      {ratingTarget && (
        <RatingModal
          request={ratingTarget}
          onSubmit={data => reviewMutation.mutate(data)}
          onClose={() => setRatingTarget(null)}
          isSubmitting={reviewMutation.isPending}
        />
      )}

      <div
        className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Missions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{requests.length} mission{requests.length !== 1 ? 's' : ''} au total</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'active', label: 'En cours', count: active.length, icon: Clock },
            { key: 'done', label: 'Terminées', count: done.length, icon: CheckCircle },
          ].map(({ key, label, count, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${
                tab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={`text-xs font-bold rounded-full px-1.5 ${tab === key ? 'bg-white/25 text-white' : 'bg-muted text-foreground'}`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 shimmer rounded-lg w-2/5" />
                    <div className="h-3 shimmer rounded-lg w-3/5" />
                  </div>
                  <div className="h-5 shimmer rounded-pill w-16" />
                </div>
                <div className="h-9 shimmer rounded-lg" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState label={tab === 'active' ? 'Aucune mission en cours' : 'Aucune mission terminée'} isActive={tab === 'active'} />
        ) : (
          <div className="space-y-3">
            {displayed.map(req => (
              <MissionCard key={req.id} req={req} onRate={setRatingTarget} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}