import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle, MessageCircle, Star, ChevronRight, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';

import { BRAND } from '@/lib/theme';

const ACTIVE_STATUSES = ['searching', 'pending_pro', 'accepted', 'contract_pending', 'contract_signed', 'pro_en_route', 'in_progress'];
const DONE_STATUSES = ['completed', 'cancelled', 'disputed'];

const STATUS_CONFIG = {
  searching:        { label: 'Recherche...', dot: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '#D97706' },
  pending_pro:      { label: 'En attente',   dot: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', text: '#B7870A' },
  accepted:         { label: 'Acceptée',     dot: '#6C5CE7', bg: 'rgba(108,92,231,0.1)',  text: '#6C5CE7' },
  contract_pending: { label: 'Contrat',      dot: '#A78BFA', bg: 'rgba(167,139,250,0.1)', text: '#7C3AED' },
  contract_signed:  { label: 'Signé',        dot: '#6C5CE7', bg: 'rgba(108,92,231,0.1)',  text: '#6C5CE7' },
  pro_en_route:     { label: 'En route',     dot: '#0EA5E9', bg: 'rgba(14,165,233,0.1)',  text: '#0284C7' },
  in_progress:      { label: 'En cours',     dot: '#6C5CE7', bg: 'rgba(108,92,231,0.1)',  text: '#6C5CE7' },
  completed:        { label: 'Terminée',     dot: '#00B894', bg: 'rgba(0,184,148,0.1)',   text: '#00897B' },
  cancelled:        { label: 'Annulée',      dot: '#94A3B8', bg: 'rgba(148,163,184,0.1)', text: '#64748B' },
  disputed:         { label: 'En litige',    dot: '#E17055', bg: 'rgba(225,112,85,0.1)',  text: '#C0392B' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: '#94A3B8', bg: 'rgba(148,163,184,0.1)', text: '#64748B' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function MissionCard({ req, onRate, index }) {
  const navigate = useNavigate();
  const canRate = req.status === 'completed' && !req.review_id && req.review_requested;
  const dateStr = req.scheduled_date
    ? format(parseISO(req.scheduled_date), 'd MMM yyyy', { locale: fr })
    : null;
  const isActive = ACTIVE_STATUSES.includes(req.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl border border-border/60 overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(108,92,231,0.06)' }}
    >
      {/* Top accent bar for active missions */}
      {isActive && (
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${BRAND}, #a78bfa)` }} />
      )}

      <div className="p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground truncate">{req.category_name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {req.professional_name || <span className="italic text-xs">Recherche d'un professionnel...</span>}
            </p>
            {dateStr && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>📅</span> {dateStr}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {req.estimated_price > 0 && (
              <p className="text-base font-bold" style={{ color: BRAND }}>{req.estimated_price} €</p>
            )}
            <StatusBadge status={req.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => navigate(`/Chat?requestId=${req.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 tap-scale"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          {req.status === 'completed' && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/Invoices'); }}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 tap-scale"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          {canRate && (
            <button
              onClick={() => onRate(req)}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-bold text-white tap-scale"
              style={{ background: 'linear-gradient(135deg, #FDCB6E, #F59E0B)' }}
            >
              <Star className="w-4 h-4 fill-white" />
              Noter
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ label, isActive }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: `${BRAND}12` }}>
        <ClipboardList className="w-9 h-9" style={{ color: BRAND }} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-base font-bold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isActive ? 'Réservez votre premier service en quelques clics' : 'Vos missions terminées apparaîtront ici'}
        </p>
      </div>
      {isActive && (
        <button
          onClick={() => navigate('/Home')}
          className="mt-1 text-white text-sm font-bold px-8 py-3 rounded-2xl tap-scale"
          style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
        >
          Trouver un artisan
        </button>
      )}
    </div>
  );
}

export default function MissionHistory() {
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

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/40 px-5 py-4">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Mes missions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {requests.length} mission{requests.length !== 1 ? 's' : ''} au total
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-muted/60 rounded-2xl">
          {[
            { key: 'active', label: 'En cours', count: active.length, icon: Clock },
            { key: 'done',   label: 'Terminées', count: done.length, icon: CheckCircle },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={tab === key ? {
                background: 'white',
                color: BRAND,
                boxShadow: '0 2px 8px rgba(108,92,231,0.12)',
              } : {
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className="text-[10px] font-black rounded-full px-1.5 py-0.5"
                  style={tab === key
                    ? { background: `${BRAND}15`, color: BRAND }
                    : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                  }>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 shimmer rounded-xl w-2/5" />
                    <div className="h-3 shimmer rounded-xl w-3/5" />
                  </div>
                  <div className="h-6 shimmer rounded-full w-20" />
                </div>
                <div className="h-10 shimmer rounded-xl" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            label={tab === 'active' ? 'Aucune mission en cours' : 'Aucune mission terminée'}
            isActive={tab === 'active'}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {displayed.map((req, i) => (
                <MissionCard key={req.id} req={req} onRate={setRatingTarget} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}