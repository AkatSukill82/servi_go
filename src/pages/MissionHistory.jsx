import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageCircle, Star, Clock, Search, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';

const ACTIVE_STATUSES = ['searching', 'pending_pro', 'accepted', 'contract_pending', 'contract_signed', 'pro_en_route', 'in_progress'];
const DONE_STATUSES = ['completed', 'cancelled', 'disputed'];

const STATUS_CONFIG = {
  searching: { label: 'Recherche...', cls: 'bg-orange-100 text-orange-700' },
  pending_pro: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepté', cls: 'bg-blue-100 text-blue-700' },
  contract_pending: { label: 'Contrat envoyé', cls: 'bg-purple-100 text-purple-700' },
  contract_signed: { label: 'Contrat signé', cls: 'bg-indigo-100 text-indigo-700' },
  pro_en_route: { label: 'En route', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminé', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', cls: 'bg-gray-100 text-gray-500' },
  disputed: { label: 'Litige', cls: 'bg-red-100 text-red-600' },
};

function MissionCard({ req, isPro, onReview }) {
  const navigate = useNavigate();
  const sc = STATUS_CONFIG[req.status] || { label: req.status, cls: 'bg-gray-100 text-gray-500' };
  const canReview = req.status === 'completed' && !isPro && req.review_requested && !req.review_id;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{req.category_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {isPro
                ? (req.customer_name || req.customer_email || 'Client')
                : (req.professional_name || 'En recherche de professionnel...')}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${sc.cls}`}>{sc.label}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {req.scheduled_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(req.scheduled_date), 'dd MMM yyyy', { locale: fr })}
              {req.scheduled_time ? ` à ${req.scheduled_time}` : ''}
            </span>
          )}
          {(req.estimated_price || req.final_price) && (
            <span className="font-semibold text-foreground">{(req.final_price || req.estimated_price).toFixed(0)} €</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/Chat?requestId=${req.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 text-primary rounded-xl py-2.5 text-xs font-semibold"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Voir la mission
          </button>
          {canReview && (
            <button
              onClick={() => onReview(req)}
              className="flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl px-3 py-2.5 text-xs font-semibold"
            >
              <Star className="w-3.5 h-3.5" /> Avis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <FileText className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold">Aucune mission {label}</p>
      <p className="text-sm text-muted-foreground">Vos missions apparaîtront ici</p>
    </div>
  );
}

export default function MissionHistory() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [reviewRequest, setReviewRequest] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isPro = user?.user_type === 'professionnel';

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['missionHistory', user?.email, isPro],
    queryFn: () => {
      if (!user?.email) return [];
      const filter = isPro ? { professional_email: user.email } : { customer_email: user.email };
      return base44.entities.ServiceRequestV2.filter(filter, '-created_date', 50);
    },
    enabled: !!user?.email,
  });

  const activeMissions = useMemo(() => requests.filter(r => ACTIVE_STATUSES.includes(r.status)), [requests]);
  const doneMissions = useMemo(() => requests.filter(r => DONE_STATUSES.includes(r.status)), [requests]);

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const customerName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.full_name || user.email?.split('@')[0] || 'Client');
      await base44.entities.Review.create({
        request_id: reviewRequest.id,
        professional_email: reviewRequest.professional_email,
        customer_name: customerName,
        customer_email: user.email,
        rating, comment,
        category_name: reviewRequest.category_name,
      });
      await base44.entities.ServiceRequestV2.update(reviewRequest.id, { review_id: reviewRequest.id });
      const allReviews = await base44.entities.Review.filter({ professional_email: reviewRequest.professional_email });
      const avg = Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10;
      const pros = await base44.entities.User.filter({ email: reviewRequest.professional_email });
      if (pros[0]) await base44.entities.User.update(pros[0].id, { rating: avg, reviews_count: allReviews.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missionHistory'] });
      setReviewRequest(null);
      toast.success('Merci pour votre avis !');
    },
  });

  const shown = activeTab === 'active' ? activeMissions : doneMissions;

  return (
    <div className="min-h-screen bg-background pb-6">
      {reviewRequest && (
        <RatingModal
          request={reviewRequest}
          onSubmit={(data) => reviewMutation.mutate(data)}
          onClose={() => setReviewRequest(null)}
          isSubmitting={reviewMutation.isPending}
        />
      )}

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold">Historique des missions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{isPro ? 'Vos interventions' : 'Vos demandes de service'}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{requests.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{activeMissions.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">En cours</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{doneMissions.filter(r => r.status === 'completed').length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Terminées</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${activeTab === 'active' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
          >
            <Search className="w-4 h-4" /> En cours
            {activeMissions.length > 0 && <span className={`text-xs font-bold rounded-full px-1.5 ${activeTab === 'active' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{activeMissions.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${activeTab === 'done' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}
          >
            <CheckCircle className="w-4 h-4" /> Terminées
            {doneMissions.length > 0 && <span className={`text-xs font-bold rounded-full px-1.5 ${activeTab === 'done' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{doneMissions.length}</span>}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        ) : shown.length === 0 ? (
          <EmptyState label={activeTab === 'active' ? 'en cours' : 'terminée'} />
        ) : (
          <div className="space-y-3">
            {shown.map(req => (
              <MissionCard
                key={req.id}
                req={req}
                isPro={isPro}
                onReview={setReviewRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}