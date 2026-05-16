import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Clock, MapPin, Star, ChevronRight, CreditCard,
  Play, StopCircle, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ProStats from '@/components/pro/ProStats';
import ClientScoreBadge from '@/components/pro/ClientScoreBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import MissionProgress from '@/components/mission/MissionProgress';
import TopBar from '@/components/layout/TopBar';
import { getFirstName, getGreeting } from '@/lib/userUtils';
import { BRAND } from '@/lib/theme';
import { useProDashboard } from '@/hooks/useProDashboard';

const getMinutesAgo = (date) => {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date)) / 60000);
};

export default function ProDashboard() {
  const [activeTab, setActiveTab] = useState('missions');
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [proRating, setProRating] = useState(5);
  const [proComment, setProComment] = useState('');

  const {
    user, proVerif, eidApproved, subscription, hasActiveSub,
    incomingRequests, assignedRequests, activeJobs, completedJobs,
    upcomingJob, myReviews, acceptMutation, statusMutation, navigate,
  } = useProDashboard();

  const firstName = getFirstName(user);
  const greeting = getGreeting();

  const handleStatusUpdate = (id, status, job) => {
    statusMutation.mutate({ id, status, job }, {
      onSuccess: () => {
        if (status === 'completed' && job) {
          setShowReviewModal(job);
          setProRating(5);
          setProComment('');
        }
      },
    });
  };

  return (
    <div className="min-h-full bg-background">
      <TopBar />

      <div className="relative px-4 pt-5 pb-6"
        style={{ background: `linear-gradient(160deg, #1a0533 0%, ${BRAND} 70%, #a78bfa 100%)` }}>
        <div className="mb-4">
          <p className="text-white/60 text-sm font-medium">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <p className="text-white font-bold text-base mt-0.5">{user?.category_name || 'Professionnel ServiGo'}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Terminées', value: completedJobs.length },
            { label: 'En cours', value: activeJobs.length },
            { label: 'Note', value: user?.rating ? `${user.rating.toFixed(1)} ⭐` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 text-center backdrop-blur">
              <p className="text-2xl font-black text-white leading-none">{value}</p>
              <p className="text-white/60 text-[10px] font-medium mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        {upcomingJob && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl shrink-0">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Mission demain !</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {upcomingJob.category_name} · {upcomingJob.scheduled_time || '?'} · {upcomingJob.customer_name || 'Client'}
              </p>
            </div>
          </div>
        )}

        {user && !eidApproved && (
          <div className={`border rounded-2xl p-4 flex items-center gap-3 ${
            proVerif?.status === 'pending_review' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-lg shrink-0">{proVerif?.status === 'pending_review' ? '⏳' : '🪪'}</span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${proVerif?.status === 'pending_review' ? 'text-blue-900' : 'text-red-900'}`}>
                {proVerif?.status === 'pending_review' ? 'Vérification eID en cours' : 'Vérification eID requise'}
              </p>
              <p className={`text-xs mt-0.5 ${proVerif?.status === 'pending_review' ? 'text-blue-600' : 'text-red-600'}`}>
                {proVerif?.status === 'pending_review'
                  ? 'Votre dossier est examiné — missions disponibles dès approbation'
                  : 'Soumettez votre carte eID pour recevoir des missions'}
              </p>
            </div>
            {proVerif?.status !== 'pending_review' && (
              <button onClick={() => navigate('/EidVerification')} className="text-xs font-black text-red-700 underline shrink-0">
                Vérifier →
              </button>
            )}
          </div>
        )}

        {!hasActiveSub ? (
          <button onClick={() => navigate('/ProSubscription')}
            className="w-full rounded-2xl p-4 text-left flex items-center gap-3 text-white tap-scale"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)`, boxShadow: `0 4px 16px rgba(108,92,231,0.3)` }}>
            <CreditCard className="w-5 h-5 text-white/80 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">🚀 Activez votre abonnement Pro</p>
              <p className="text-xs text-white/70 mt-0.5">9,99 €/mois — Recevez des missions dès aujourd'hui</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />
          </button>
        ) : (
          <button onClick={() => navigate('/ProSubscription')}
            className="w-full rounded-2xl p-4 border border-emerald-200 bg-emerald-50 flex items-center gap-3 text-left tap-scale">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">Abonnement actif ✓</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {subscription?.plan === 'annual' ? '90 €/an' : '9,99 €/mois'}
                {subscription?.renewal_date ? ` · Renouvellement le ${subscription.renewal_date}` : ''}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
          </button>
        )}

        <div className="flex gap-2 bg-muted p-1 rounded-2xl">
          {[['missions', 'Missions', incomingRequests.length], ['stats', 'Statistiques', 0]].map(([key, label, count]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === key
                ? { background: 'white', color: BRAND, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                : { color: '#9CA3AF' }
              }>
              {label}
              {count > 0 && (
                <span className="text-[10px] font-black rounded-full px-1.5 py-0.5"
                  style={activeTab === key
                    ? { background: `${BRAND}15`, color: BRAND }
                    : { background: '#E5E7EB', color: '#6B7280' }
                  }>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && <ProStats userEmail={user?.email} />}

        {activeTab === 'missions' && (
          <div className="space-y-4">

            {!hasActiveSub && incomingRequests.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                  <div className="text-center px-4">
                    <p className="text-white text-sm font-bold mb-3">
                      {incomingRequests.length} demande{incomingRequests.length > 1 ? 's' : ''} disponible{incomingRequests.length > 1 ? 's' : ''}
                    </p>
                    <Button onClick={() => navigate('/ProSubscription')} className="bg-white text-primary hover:bg-white/90">
                      S'abonner — 9,99 €/mois
                    </Button>
                  </div>
                </div>
                <div className="pointer-events-none opacity-30 space-y-3">
                  {incomingRequests.slice(0, 2).map(req => (
                    <div key={req.id} className="bg-white rounded-2xl p-4">
                      <p className="text-sm font-semibold">{req.category_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{req.customer_address || 'Adresse non précisée'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasActiveSub && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-foreground">
                    Demandes disponibles
                    {incomingRequests.length > 0 && (
                      <span className="ml-2 text-xs font-bold rounded-full px-2 py-0.5 text-white" style={{ background: BRAND }}>
                        {incomingRequests.length}
                      </span>
                    )}
                  </h2>
                  {incomingRequests.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground font-medium">En direct</span>
                    </div>
                  )}
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    <Clock className="w-8 h-8 text-border mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-bold text-foreground">Aucune demande pour l'instant</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les nouvelles missions de {user?.category_name || 'votre métier'} apparaîtront ici
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((req, i) => {
                      const isAssigned = assignedRequests.some(a => a.id === req.id);
                      const minsAgo = isAssigned ? getMinutesAgo(req.created_date) : null;
                      return (
                        <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg" style={{ background: `${BRAND}10` }}>
                              {req.is_urgent ? '⚡' : '📋'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-foreground">{req.category_name}</p>
                                {isAssigned && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">Pour vous</span>}
                                {req.is_urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-2 py-0.5">⚡ SOS</span>}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{req.customer_address || 'Adresse non précisée'}</span>
                              </p>
                              {req.scheduled_date && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  📅 {req.scheduled_date}{req.scheduled_time ? ` · ${req.scheduled_time}` : ''}
                                </p>
                              )}
                              {minsAgo !== null && (
                                <p className="text-xs text-orange-600 font-medium mt-1">⏰ En attente depuis {minsAgo} min — répondez vite !</p>
                              )}
                            </div>
                          </div>
                          {req.answers?.length > 0 && (
                            <div className="bg-muted/50 rounded-xl p-3 mb-3 space-y-1">
                              {req.answers.slice(0, 2).map((a, idx) => (
                                <p key={idx} className="text-xs">
                                  <span className="text-muted-foreground">{a.question} : </span>
                                  <span className="font-semibold">{a.answer}</span>
                                </p>
                              ))}
                            </div>
                          )}
                          {req.customer_email && (
                            <div className="mb-3">
                              <ClientScoreBadge customerEmail={req.customer_email} compact />
                            </div>
                          )}
                          <button
                            onClick={() => acceptMutation.mutate({ requestId: req.id, request: req })}
                            disabled={acceptMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
                          >
                            {acceptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                            Accepter cette mission
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {hasActiveSub && activeJobs.length > 0 && (
              <div>
                <h2 className="text-base font-black text-foreground mb-3">Missions en cours</h2>
                <div className="space-y-3">
                  {activeJobs.map(job => (
                    <div key={job.id} className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-black text-muted-foreground">
                          {(job.customer_first_name || job.customer_name || 'C')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">
                            {job.customer_first_name
                              ? `${job.customer_first_name} ${job.customer_last_name?.[0] || ''}.`
                              : (job.customer_name || 'Client')}
                          </p>
                          <p className="text-xs text-muted-foreground">{job.category_name}</p>
                        </div>
                      </div>
                      <MissionProgress status={job.status} compact />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 text-xs"
                          onClick={() => navigate(`/Chat?requestId=${job.id}`)}>
                          <ChevronRight className="w-3.5 h-3.5 mr-1" /> Chat & Contrat
                        </Button>
                        {job.status === 'contract_signed' && (
                          <Button size="sm" className="flex-1 rounded-xl h-10 text-xs bg-emerald-500 hover:bg-emerald-600 border-0"
                            onClick={() => handleStatusUpdate(job.id, 'pro_en_route', job)}>
                            <Play className="w-3.5 h-3.5 mr-1" /> En route
                          </Button>
                        )}
                        {job.status === 'pro_en_route' && (
                          <Button size="sm" className="flex-1 rounded-xl h-10 text-xs bg-blue-600 hover:bg-blue-700 border-0"
                            onClick={() => handleStatusUpdate(job.id, 'in_progress', job)}>
                            <Play className="w-3.5 h-3.5 mr-1" /> Démarrer
                          </Button>
                        )}
                        {job.status === 'in_progress' && (
                          <Button size="sm" className="flex-1 rounded-xl h-10 text-xs bg-emerald-500 hover:bg-emerald-600 border-0"
                            onClick={() => handleStatusUpdate(job.id, 'completed', job)}>
                            <StopCircle className="w-3.5 h-3.5 mr-1" /> Terminer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasActiveSub && completedJobs.length > 0 && (
              <div>
                <h2 className="text-base font-black text-foreground mb-3">Missions récentes</h2>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  {completedJobs.slice(0, 5).map((job) => (
                    <button key={job.id} onClick={() => navigate(`/Chat?requestId=${job.id}`)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/50 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-black text-muted-foreground">
                        {(job.customer_first_name || job.customer_name || 'C')[0]}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {job.customer_first_name
                            ? `${job.customer_first_name} ${job.customer_last_name?.[0] || ''}.`
                            : (job.customer_name || 'Client')}
                        </p>
                        <p className="text-xs text-muted-foreground">{job.category_name}</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 shrink-0">Terminé</span>
                      <ChevronRight className="w-4 h-4 text-border shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveSub && myReviews.length > 0 && (
              <div>
                <h2 className="text-base font-black text-foreground mb-3">Avis clients</h2>
                <div className="space-y-3">
                  {myReviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold">{review.customer_name || 'Client'}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} style={{ width: 12, height: 12 }}
                              className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-xs text-muted-foreground leading-relaxed">"{review.comment}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={!!showReviewModal} onOpenChange={(open) => { if (!open) setShowReviewModal(null); }}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Évaluez votre client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {showReviewModal?.customer_first_name
                  ? `${showReviewModal.customer_first_name} ${showReviewModal.customer_last_name || ''}`.trim()
                  : (showReviewModal?.customer_name || 'Client')}
              </p>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setProRating(s)} className="p-1">
                    <Star className={`w-8 h-8 transition-colors ${s <= proRating ? 'text-yellow-400 fill-yellow-400' : 'text-border'}`} />
                  </button>
                ))}
              </div>
              <Textarea value={proComment} onChange={e => setProComment(e.target.value)}
                placeholder="Commentaire optionnel sur ce client..." className="rounded-xl resize-none" rows={3} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReviewModal(null)}>Passer</Button>
                <Button className="flex-1 rounded-xl" onClick={async () => {
                  const job = showReviewModal;
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
                  setShowReviewModal(null);
                  toast.success('Avis envoyé !');
                }}>
                  Soumettre mon avis
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
