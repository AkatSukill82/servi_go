import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, MapPin, CheckCheck, Star, CalendarDays, AlertOctagon } from 'lucide-react';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import { useNavigate } from 'react-router-dom';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';
import MissionProgress from '@/components/mission/MissionProgress';
import ContractPanel from '@/components/mission/ContractPanel';
import ReportButton from '@/components/report/ReportButton';

const DISPUTE_REASONS = [
  { value: 'travail_non_conforme', label: 'Travail non conforme' },
  { value: 'no_show', label: 'Professionnel absent' },
  { value: 'paiement', label: 'Problème de paiement' },
  { value: 'dommages', label: 'Dommages causés' },
  { value: 'qualite', label: 'Qualité insuffisante' },
  { value: 'autre', label: 'Autre problème' },
];

function DisputeModal({ request, user, queryClient, onClose }) {
  const [reason, setReason] = useState('travail_non_conforme');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const openedBy = user?.user_type === 'professionnel' ? 'professional' : 'customer';

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Dispute.create({
        request_id: request.id,
        customer_email: request.customer_email,
        customer_name: request.customer_name,
        professional_email: request.professional_email,
        professional_name: request.professional_name,
        reason,
        description,
        amount_disputed: amount ? parseFloat(amount) : 0,
        status: 'open',
        opened_by: openedBy,
      });
      await base44.entities.ServiceRequestV2.update(request.id, { status: 'disputed' });
      const otherEmail = openedBy === 'customer' ? request.professional_email : request.customer_email;
      const otherType = openedBy === 'customer' ? 'professionnel' : 'particulier';
      if (otherEmail) {
        await base44.entities.Notification.create({
          recipient_email: otherEmail,
          recipient_type: otherType,
          type: 'dispute_opened',
          title: 'Un litige a été ouvert',
          body: `Un litige a été ouvert pour la mission ${request.category_name}. Notre équipe vous contactera sous 24h.`,
          request_id: request.id,
          action_url: `/Chat?requestId=${request.id}`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['request', request.id] });
      toast.success('Litige ouvert. Notre équipe examine votre demande sous 24h.');
      onClose();
    } catch {
      toast.error("Erreur lors de l'ouverture du litige");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-t-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 pb-1">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-base">Ouvrir un litige</h3>
            <p className="text-xs text-muted-foreground">Notre équipe examinera votre demande sous 24h</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Motif</p>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {DISPUTE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Description *</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} placeholder="Décrivez précisément le problème..."
            className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Montant en litige € (optionnel)</p>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" min="0" step="0.01"
            className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving || !description.trim()}
            className="flex-1 h-11 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50 transition-opacity">
            {saving ? 'Envoi...' : 'Ouvrir le litige'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const creatingConvRef = useRef(false);
  const viewportHeight = useVisualViewport();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ id: requestId }).then((r) => r[0]),
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', requestId],
    queryFn: () => base44.entities.Message.filter({ request_id: requestId }, 'created_date'),
    enabled: !!requestId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!request?.customer_email || !request?.professional_email) return;
    base44.entities.Conversation.filter(
      { customer_email: request.customer_email, professional_email: request.professional_email },
      '-created_date', 1
    ).then((convs) => {
      if (convs.length > 0) {
        setConversationId(convs[0].id);
      } else if (!creatingConvRef.current) {
        creatingConvRef.current = true;
        base44.entities.Conversation.create({
          customer_email: request.customer_email,
          customer_name: request.customer_name || '',
          professional_email: request.professional_email,
          professional_name: request.professional_name || '',
          request_id: requestId,
          last_message_at: new Date().toISOString(),
          unread_count_customer: 0,
          unread_count_pro: 0,
        }).then((conv) => setConversationId(conv.id)).catch(() => {}).finally(() => { creatingConvRef.current = false; });
      }
    }).catch(() => {});
  }, [request?.customer_email, request?.professional_email]);

  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.request_id === requestId) queryClient.invalidateQueries({ queryKey: ['messages', requestId] });
    });
    return unsubscribe;
  }, [requestId]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (!conversationId || !user?.email) return;
    const field = user.user_type === 'professionnel' ? 'unread_count_pro' : 'unread_count_customer';
    base44.entities.Conversation.update(conversationId, { [field]: 0 }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['conversations', user.email] });
  }, [conversationId, user?.email]);

  useEffect(() => {
    if (!request || !requestId) return;
    const checkAndUpdateContract = async () => {
      try {
        const contracts = await base44.entities.MissionContract.filter({ request_id: requestId }, '-created_date', 1);
        const contract = contracts[0];
        if (contract?.status === 'signed_both' && !['contract_signed', 'pro_en_route', 'in_progress', 'completed'].includes(request.status)) {
          await base44.entities.ServiceRequestV2.update(requestId, { status: 'contract_signed' });
          queryClient.invalidateQueries({ queryKey: ['request', requestId] });
        }
      } catch (e) {
        console.warn('Contract sync error:', e);
      }
    };
    checkAndUpdateContract();
  }, [request?.status, requestId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (msgData) => {
      const msg = await base44.entities.Message.create(msgData);
      if (conversationId) {
        const senderIsPro = msgData.sender_type === 'professionnel';
        base44.entities.Conversation.update(conversationId, {
          last_message_preview: msgData.content || '📷 Photo',
          last_message_at: new Date().toISOString(),
          [senderIsPro ? 'unread_count_customer' : 'unread_count_pro']: 1,
        }).catch(() => {});
      }
      return msg;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', requestId] }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const customerName = user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : user.full_name || user.email?.split('@')[0] || 'Client';
      await base44.entities.Review.create({
        request_id: requestId,
        professional_email: request.professional_email,
        customer_name: customerName,
        customer_email: user.email,
        rating, comment,
        category_name: request.category_name,
      });
      await base44.entities.ServiceRequestV2.update(requestId, { review_id: requestId });
      const allReviews = await base44.entities.Review.filter({ professional_email: request.professional_email });
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      const rounded = Math.round(avg * 10) / 10;
      const pros = await base44.entities.User.filter({ email: request.professional_email });
      if (pros[0]) await base44.entities.User.update(pros[0].id, { rating: rounded, reviews_count: allReviews.length });
      if (request.professional_email) {
        await base44.entities.Notification.create({
          recipient_email: request.professional_email,
          recipient_type: 'professionnel',
          type: 'new_review',
          title: `Nouvel avis de ${customerName}`,
          body: `${rating}/5 — ${comment || ''}`,
          request_id: requestId,
          action_url: `/Chat?requestId=${requestId}`,
        });
      }
    },
    onSuccess: () => { setShowRating(false); toast.success('Merci pour votre évaluation !'); },
  });

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    await sendMutation.mutateAsync({
      request_id: requestId,
      conversation_id: conversationId || undefined,
      sender_email: user.email,
      sender_name: user.full_name,
      sender_type: user.user_type || 'particulier',
      content: text.trim(),
      message_type: 'text',
    });
    setText('');
    setSending(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await sendMutation.mutateAsync({
      request_id: requestId,
      conversation_id: conversationId || undefined,
      sender_email: user.email,
      sender_name: user.full_name,
      sender_type: user.user_type || 'particulier',
      content: '',
      photo_url: file_url,
      message_type: 'photo',
    });
    setSending(false);
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Vérification d'accès : seuls le client, le pro et les admins peuvent voir cette conversation
  const hasAccess = !request || !user || user.role === 'admin' ||
    user.email === request.customer_email ||
    user.email === request.professional_email;

  const isFinished = ['completed', 'cancelled', 'disputed'].includes(request?.status);
  const isCustomer = user?.user_type === 'particulier';
  const isPro = user?.user_type === 'professionnel';
  const canDispute = ['accepted', 'in_progress', 'completed'].includes(request?.status);

  const customerDisplayName = request?.customer_first_name
    ? `${request.customer_first_name} ${request.customer_last_name?.[0] || ''}.`
    : request?.customer_name || 'Client';

  const otherParty = isPro
    ? { name: customerDisplayName, label: 'Client', email: request?.customer_email, type: 'particulier' }
    : { name: request?.professional_name, label: 'Professionnel', email: request?.professional_email, type: 'professionnel' };

  const STATUS_CONFIG = {
    searching:        { label: 'Recherche en cours', bg: '#FFF3E0', color: '#E65100' },
    pending_pro:      { label: 'En attente du pro',  bg: '#FFF8E1', color: '#F57F17' },
    accepted:         { label: 'Acceptée',            bg: '#E3F2FD', color: '#1565C0' },
    contract_pending: { label: 'Contrat envoyé',      bg: '#F3E5F5', color: '#6A1B9A' },
    contract_signed:  { label: 'Contrat signé',       bg: '#EDE7F6', color: '#4527A0' },
    pro_en_route:     { label: 'Pro en route',        bg: '#E8F5E9', color: '#1B5E20' },
    in_progress:      { label: 'En cours',            bg: '#E8F5E9', color: '#1B5E20' },
    completed:        { label: 'Terminée',            bg: '#F5F5F5', color: '#616161' },
  };
  const statusCfg = STATUS_CONFIG[request?.status] || STATUS_CONFIG['accepted'];
  const showContract = ['contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'completed'].includes(request?.status);

  const initials = (otherParty.name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (!requestId) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Send className="w-7 h-7 text-border" />
      </div>
      <p className="text-gray-600 font-semibold">Aucune conversation sélectionnée</p>
      <button onClick={() => navigate(-1)} className="text-[#6C5CE7] font-bold text-sm">← Retour</button>
    </div>
  );

  if (request && user && !hasAccess) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl">🔒</div>
      <p className="text-foreground font-semibold">Accès non autorisé</p>
      <p className="text-sm text-muted-foreground max-w-xs">Vous n'avez pas accès à cette conversation.</p>
      <button onClick={() => navigate(-1)} className="text-[#6C5CE7] font-bold text-sm">← Retour</button>
    </div>
  );

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: viewportHeight }}>
      {showRating && (
        <RatingModal
          request={request}
          onSubmit={(data) => reviewMutation.mutate(data)}
          onClose={() => setShowRating(false)}
          isSubmitting={reviewMutation.isPending}
        />
      )}
      {showDispute && request && user && (
        <DisputeModal
          request={request}
          user={user}
          queryClient={queryClient}
          onClose={() => setShowDispute(false)}
        />
      )}

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 bg-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 px-4 pb-3">
          <BackButton fallback="/Home" />

          {/* Avatar */}
          <div className="relative shrink-0">
            {request?.professional_photo_url && !isPro ? (
              <img src={request.professional_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
              >
                {initials}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00B894] rounded-full border-2 border-white" />
          </div>

          {/* Name + badge */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-foreground truncate leading-tight">{otherParty.name || '...'}</p>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isCustomer && request?.professional_id && <FavoriteButton proId={request.professional_id} />}
            {request?.status === 'accepted' && (
              <button
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                onClick={() => navigate(`/TrackingMap?requestId=${requestId}`)}
              >
                <MapPin className="w-4 h-4 text-[#6C5CE7]" />
              </button>
            )}
            {request?.status === 'completed' && isCustomer && !request?.review_id && (
              <button
                onClick={() => setShowRating(true)}
                className="flex items-center gap-1 px-3 h-8 rounded-full text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #f39c12, #e17055)' }}
              >
                <Star className="w-3 h-3 fill-white" /> Noter
              </button>
            )}
            {canDispute && (
              <button
                className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center"
                onClick={() => setShowDispute(true)}
                title="Ouvrir un litige"
              >
                <AlertOctagon className="w-4 h-4 text-red-500" />
              </button>
            )}
            {otherParty.email && (
              <ReportButton
                user={user}
                reportedEmail={otherParty.email}
                reportedName={otherParty.name}
                reportedType={otherParty.type}
                requestId={requestId}
              />
            )}
          </div>
        </div>

        {/* Mission strip */}
        {request && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-t border-border/50">
            <span className="text-xs font-bold text-[#6C5CE7] shrink-0">{request.category_name}</span>
            {request.customer_address && (
              <>
                <span className="text-border text-xs">·</span>
                <span className="text-xs text-muted-foreground truncate">{request.customer_address}</span>
              </>
            )}
            {request.scheduled_date && (
              <>
                <span className="text-border text-xs shrink-0">·</span>
                <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground shrink-0">
                  {format(parseISO(request.scheduled_date), 'dd MMM', { locale: fr })}
                  {request.scheduled_time ? ` ${request.scheduled_time}` : ''}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {request && (
        <div className="flex-shrink-0 px-4 py-2 bg-background border-t border-border/30">
          <MissionProgress status={request.status} compact />
        </div>
      )}

      {/* Contract panel */}
      {showContract && requestId && user && (
        <div className="flex-shrink-0">
          <ContractPanel requestId={requestId} userEmail={user.email} userType={user.user_type} />
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-white"
              style={{ boxShadow: '0 4px 20px rgba(108,92,231,0.15)' }}
            >
              <Send className="w-7 h-7 text-[#6C5CE7]" />
            </div>
            <p className="text-base font-bold text-foreground">Démarrez la conversation</p>
            <p className="text-sm text-muted-foreground mt-1">Échangez les détails de la mission</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.sender_email === user?.email;
            const isSystem = msg.message_type === 'system';
            const msgDate = msg.created_date ? new Date(msg.created_date) : null;
            const prevMsg = messages[idx - 1];
            const prevDate = prevMsg?.created_date ? new Date(prevMsg.created_date) : null;
            const showDateSep = msgDate && (!prevDate || !isSameDay(msgDate, prevDate));
            const dateLabel = msgDate
              ? isToday(msgDate) ? "Aujourd'hui"
              : isYesterday(msgDate) ? 'Hier'
              : format(msgDate, 'EEEE d MMMM', { locale: fr })
              : '';

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground font-medium capitalize">{dateLabel}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <span
                      className="text-[11px] text-muted-foreground bg-white rounded-full px-4 py-1.5 font-medium text-center max-w-[80%]"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                    >
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}>
                      {!isMe && (
                        <p className="text-[11px] text-muted-foreground px-1 font-medium">{msg.sender_name}</p>
                      )}

                      <div
                        className={`rounded-2xl overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={
                          isMe
                            ? { background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }
                            : { background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                        }
                      >
                        {msg.message_type === 'photo' && msg.photo_url ? (
                          <img
                            src={msg.photo_url}
                            alt="Photo"
                            className="w-full max-w-[220px] object-cover rounded-2xl cursor-pointer"
                            onClick={() => window.open(msg.photo_url, '_blank')}
                          />
                        ) : (
                          <p className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'text-white' : 'text-foreground'}`}>
                            {msg.content}
                          </p>
                        )}
                      </div>

                      <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {msgDate ? format(msgDate, 'HH:mm', { locale: fr }) : ''}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-[#6C5CE7]" />}
                      </div>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      {isFinished ? (
        <div
          className="flex-shrink-0 bg-white px-4 py-4 text-center border-t border-gray-100"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <p className="text-xs text-muted-foreground font-medium">Mission terminée · Conversation archivée</p>
        </div>
      ) : (
        <div
          className="flex-shrink-0 bg-white px-4 py-3 border-t border-gray-100"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 active:bg-border transition-colors"
            >
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

            <div className="flex-1 flex items-center bg-muted rounded-full px-4 h-11">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                disabled={sending}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
