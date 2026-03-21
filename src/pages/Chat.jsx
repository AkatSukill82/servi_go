import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, MapPin, CheckCheck, CheckCircle, Star, CalendarDays } from 'lucide-react';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import RatingModal from '@/components/review/RatingModal';
import { toast } from 'sonner';

const STATUS_LABELS = {
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminée', color: 'bg-gray-100 text-gray-600' },
};

export default function Chat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => base44.entities.ServiceRequest.filter({ id: requestId }).then(r => r[0]),
    enabled: !!requestId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', requestId],
    queryFn: () => base44.entities.Message.filter({ request_id: requestId }, 'created_date'),
    enabled: !!requestId,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.request_id === requestId) {
        queryClient.invalidateQueries({ queryKey: ['messages', requestId] });
      }
    });
    return unsubscribe;
  }, [requestId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (msgData) => base44.entities.Message.create(msgData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', requestId] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => base44.entities.ServiceRequest.update(requestId, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      toast.success('Mission terminée !');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      // Create review
      await base44.entities.Review.create({
        request_id: requestId,
        professional_email: request.professional_email,
        customer_name: user.full_name,
        customer_email: user.email,
        rating,
        comment,
        category_name: request.category_name,
      });
      // Update pro's average rating
      const allReviews = await base44.entities.Review.filter({ professional_email: request.professional_email });
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      const pros = await base44.entities.User.filter({ email: request.professional_email });
      if (pros[0]) {
        await base44.entities.User.update(pros[0].id, {
          rating: Math.round(avg * 10) / 10,
          reviews_count: allReviews.length,
        });
      }
    },
    onSuccess: () => {
      setShowRating(false);
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      toast.success('Merci pour votre évaluation !');
    },
  });

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    await sendMutation.mutateAsync({
      request_id: requestId,
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherParty = user?.user_type === 'professionnel'
    ? { name: request?.customer_name, label: 'Client' }
    : { name: request?.professional_name, label: 'Professionnel' };

  const statusInfo = STATUS_LABELS[request?.status] || STATUS_LABELS['accepted'];

  if (!requestId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <p className="text-muted-foreground">Aucune conversation sélectionnée.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {showRating && (
        <RatingModal
          request={request}
          onSubmit={(data) => reviewMutation.mutate(data)}
          onClose={() => setShowRating(false)}
          isSubmitting={reviewMutation.isPending}
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-card border-b border-border/50 shadow-sm"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <BackButton fallback="/Home" />
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
          {otherParty.name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{otherParty.name || '...'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{otherParty.label}</span>
            {statusInfo && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 items-center">
          {/* Client can favorite the pro */}
          {user?.user_type === 'particulier' && request?.professional_id && (
            <FavoriteButton proId={request.professional_id} />
          )}
          {request?.status === 'accepted' && (
            <Button variant="ghost" size="icon" aria-label="Suivre sur la carte" className="rounded-full min-w-[44px] min-h-[44px]"
              onClick={() => navigate(`/TrackingMap?requestId=${requestId}`)}>
              <MapPin className="w-5 h-5 text-primary" />
            </Button>
          )}
          {/* Pro can mark mission as completed */}
          {request?.status === 'accepted' && user?.user_type === 'professionnel' && (
            <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-xs px-3"
              onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" /> Terminer
            </Button>
          )}
          {/* Pro: cash payment reminder after completion */}
          {request?.status === 'completed' && user?.user_type === 'professionnel' && request?.payment_method === 'cash' && request?.payment_status === 'unpaid' && (
            <Button size="sm" className="rounded-xl bg-yellow-500 hover:bg-yellow-600 text-xs px-3"
              onClick={() => {
                base44.entities.ServiceRequest.update(request.id, { payment_status: 'paid' });
                toast.success('Paiement cash confirmé !');
              }}>
              💵 Cash reçu
            </Button>
          )}
          {/* Client can rate after mission is completed */}
          {request?.status === 'completed' && user?.user_type === 'particulier' && (
            <Button size="sm" className="rounded-xl bg-yellow-500 hover:bg-yellow-600 text-xs px-3"
              onClick={() => setShowRating(true)}>
              <Star className="w-4 h-4 mr-1" /> Noter
            </Button>
          )}
        </div>
      </div>

      {/* Mission recap bar */}
      {request && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
          <p className="text-xs text-muted-foreground">
            Mission · <span className="font-medium text-foreground">{request.category_name}</span>
            {request.customer_address && <> · <span>{request.customer_address}</span></>}
            {request.scheduled_date && request.scheduled_time && (
              <> · <CalendarDays className="w-3 h-3 inline mb-0.5" /> <span className="font-medium text-foreground">{format(parseISO(request.scheduled_date), 'dd MMM', { locale: fr })} à {request.scheduled_time}</span></>
            )}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
          {messages.map((msg) => {
            const isMe = msg.sender_email === user?.email;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] space-y-1`}>
                  {!isMe && (
                    <p className="text-xs text-muted-foreground px-1">{msg.sender_name}</p>
                  )}
                  <div className={`rounded-2xl overflow-hidden ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border/50 rounded-bl-sm'
                  }`}>
                    {msg.message_type === 'photo' && msg.photo_url ? (
                      <img
                        src={msg.photo_url}
                        alt="Photo"
                        className="w-full max-w-[220px] object-cover rounded-2xl cursor-pointer"
                        onClick={() => window.open(msg.photo_url, '_blank')}
                      />
                    ) : (
                      <p className="px-4 py-2.5 text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  <p className={`text-[10px] text-muted-foreground px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.created_date ? format(new Date(msg.created_date), 'HH:mm', { locale: fr }) : ''}
                    {isMe && <CheckCheck className="w-3 h-3 inline ml-1 text-primary" />}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 bg-card border-t border-border/50"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Joindre une photo"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors shrink-0"
          >
            <Image className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            className="flex-1 h-11 rounded-2xl bg-muted border-0 focus-visible:ring-1"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="Envoyer le message"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}