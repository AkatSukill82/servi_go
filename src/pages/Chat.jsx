import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, MapPin, CheckCheck, Star, CalendarDays } from 'lucide-react';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';
import MissionProgress from '@/components/mission/MissionProgress';
import ContractPanel from '@/components/mission/ContractPanel';
import ReportButton from '@/components/report/ReportButton';

export default function Chat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const viewportHeight = useVisualViewport();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ id: requestId }).then(r => r[0]),
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  const { data: contract } = useQuery({
    queryKey: ['contract', request?.contract_id],
    queryFn: () => base44.entities.MissionContract.filter({ id: request.contract_id }).then(r => r[0]),
    enabled: !!request?.contract_id,
    refetchInterval: 3000,
  });

  // Auto-sync contract signature state to request status
  useEffect(() => {
    if (!contract || contract.status !== 'signed_both' || !request || !requestId) return;
    if (['pro_en_route', 'in_progress', 'completed', 'contract_signed'].includes(request.status)) return;
    base44.entities.ServiceRequestV2.update(requestId, { status: 'contract_signed' }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['request', requestId] });
  }, [contract?.status, request?.status, request?.id, requestId, queryClient]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', requestId],
    queryFn: () => base44.entities.Message.filter({ request_id: requestId }, 'created_date'),
    enabled: !!requestId,
    refetchInterval: 3000,
  });

  // Auto-create Conversation record if not exists
  useEffect(() => {
    if (!request?.customer_email || !request?.professional_email) return;
    base44.entities.Conversation.filter({
      customer_email: request.customer_email,
      professional_email: request.professional_email,
    }, '-created_date', 1).then(convs => {
      if (convs.length > 0) {
        setConversationId(convs[0].id);
      } else {
        base44.entities.Conversation.create({
          customer_email: request.customer_email,
          customer_name: request.customer_name || '',
          professional_email: request.professional_email,
          professional_name: request.professional_name || '',
          request_id: requestId,
          last_message_at: new Date().toISOString(),
          unread_count_customer: 0,
          unread_count_pro: 0,
        }).then(conv => setConversationId(conv.id)).catch(() => {});
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (msgData) => base44.entities.Message.create(msgData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', requestId] }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const customerName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.full_name || user.email?.split('@')[0] || 'Client');
      await base44.entities.Review.create({
        request_id: requestId,
        professional_email: request.professional_email,
        customer_name: customerName,
        customer_email: user.email,
        rating, comment,
        category_name: request.category_name,
      });
      // Update request
      await base44.entities.ServiceRequestV2.update(requestId, { review_id: requestId });
      const allReviews = await base44.entities.Review.filter({ professional_email: request.professional_email });
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      const rounded = Math.round(avg * 10) / 10;
      // Update pro User
      const pros = await base44.entities.User.filter({ email: request.professional_email });
      if (pros[0]) await base44.entities.User.update(pros[0].id, { rating: rounded, reviews_count: allReviews.length });
      // Notify pro
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

  const isFinished = ['completed', 'cancelled', 'disputed'].includes(request?.status);
  const isCustomer = user?.user_type === 'particulier';
  const isPro = user?.user_type === 'professionnel';
  const customerDisplayName = request?.customer_first_name
    ? `${request.customer_first_name} ${request.customer_last_name?.[0] || ''}.`
    : (request?.customer_name || 'Client');
  const otherParty = isPro
    ? { name: customerDisplayName, label: 'Client', email: request?.customer_email, type: 'particulier' }
    : { name: request?.professional_name, label: 'Professionnel', email: request?.professional_email, type: 'professionnel' };

  const STATUS_LABELS = {
    searching: { label: 'Recherche', color: 'bg-orange-100 text-orange-700' },
    pending_pro: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    accepted: { label: 'Acceptée', color: 'bg-blue-100 text-blue-700' },
    contract_pending: { label: 'Contrat envoyé', color: 'bg-purple-100 text-purple-700' },
    contract_signed: { label: 'Contrat signé', color: 'bg-indigo-100 text-indigo-700' },
    pro_en_route: { label: 'En route', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Terminée', color: 'bg-gray-100 text-gray-600' },
  };
  const statusInfo = STATUS_LABELS[request?.status] || STATUS_LABELS['accepted'];
  const showContract = ['contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'completed'].includes(request?.status);

  if (!requestId) return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
      <p className="text-muted-foreground">Aucune conversation sélectionnée.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Retour</Button>
    </div>
  );

  return (
    <div className="flex flex-col bg-background" style={{ height: viewportHeight }}>
      {showRating && (
        <RatingModal request={request} onSubmit={(data) => reviewMutation.mutate(data)} onClose={() => setShowRating(false)} isSubmitting={reviewMutation.isPending} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-card border-b border-border/50 shadow-sm"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <BackButton fallback="/Home" />
        {request?.professional_photo_url && !isPro ? (
          <img src={request.professional_photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
            {(otherParty.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{otherParty.name || '...'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{otherParty.label}</span>
            {statusInfo && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>}
          </div>
        </div>
        <div className="flex gap-1 items-center">
          {isCustomer && request?.professional_id && <FavoriteButton proId={request.professional_id} />}
          {request?.status === 'accepted' && (
            <Button variant="ghost" size="icon" className="rounded-full min-w-[44px] min-h-[44px]" onClick={() => navigate(`/TrackingMap?requestId=${requestId}`)}>
              <MapPin className="w-5 h-5 text-primary" />
            </Button>
          )}
          {request?.status === 'completed' && isCustomer && !request?.review_id && (
            <Button size="sm" className="rounded-xl bg-yellow-500 hover:bg-yellow-600 text-xs px-3" onClick={() => setShowRating(true)}>
              <Star className="w-4 h-4 mr-1" /> Noter
            </Button>
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

      {/* Mission recap */}
      {request && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{request.category_name}</span>
            {request.customer_address && <> · <span>{request.customer_address}</span></>}
            {request.scheduled_date && (
              <> · <CalendarDays className="w-3 h-3 inline mb-0.5" /> <span className="font-medium text-foreground">{format(parseISO(request.scheduled_date), 'dd MMM', { locale: fr })}{request.scheduled_time ? ` à ${request.scheduled_time}` : ''}</span></>
            )}
          </p>
        </div>
      )}

      {/* Mission progress bar */}
      {request && (
        <div className="px-4 py-2 border-b border-border/30 bg-background">
          <MissionProgress status={request.status} compact />
        </div>
      )}

      {/* Contract panel */}
      {showContract && requestId && user && (
        <ContractPanel requestId={requestId} userEmail={user.email} userType={user.user_type} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Démarrez la conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Échangez des détails sur la mission</p>
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
            const dateLabel = msgDate ? (isToday(msgDate) ? "Aujourd'hui" : isYesterday(msgDate) ? 'Hier' : format(msgDate, 'EEEE d MMMM', { locale: fr })) : '';
            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-muted-foreground font-medium capitalize">{dateLabel}</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                )}
                {isSystem ? (
                  <div className="flex justify-center">
                    <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1 text-center max-w-[80%]">{msg.content}</span>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] space-y-1">
                      {!isMe && <p className="text-xs text-muted-foreground px-1">{msg.sender_name}</p>}
                      <div className={`rounded-2xl overflow-hidden ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border/50 rounded-bl-sm'}`}>
                        {msg.message_type === 'photo' && msg.photo_url ? (
                          <img src={msg.photo_url} alt="Photo" className="w-full max-w-[220px] object-cover rounded-2xl cursor-pointer" onClick={() => window.open(msg.photo_url, '_blank')} />
                        ) : (
                          <p className="px-4 py-2.5 text-sm leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                      <p className={`text-[10px] text-muted-foreground px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {msgDate ? format(msgDate, 'HH:mm', { locale: fr }) : ''}
                        {isMe && <CheckCheck className="w-3 h-3 inline ml-1 text-primary" />}
                      </p>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {isFinished ? (
        <div className="px-4 py-4 bg-card border-t border-border/50 text-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <p className="text-xs text-muted-foreground">🔒 Cette mission est terminée — la conversation est archivée</p>
        </div>
      ) : (
        <div className="px-4 py-3 bg-card border-t border-border/50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={sending} aria-label="Photo"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors shrink-0">
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Votre message..." className="flex-1 h-11 rounded-2xl bg-muted border-0 focus-visible:ring-1" disabled={sending} />
            <button onClick={handleSend} disabled={!text.trim() || sending} aria-label="Envoyer"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40">
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}