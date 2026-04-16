import React, { useState, useMemo, useEffect } from 'react';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, parseISO, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, List, MapPin, Clock, Phone, Euro, CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  pending_pro:  { label: 'En attente de confirmation', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  accepted:     { label: 'Confirmé', cls: 'bg-green-100 text-green-700 border-green-200' },
  contract_pending: { label: 'Contrat en cours', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  contract_signed:  { label: 'Contrat signé', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  pro_en_route: { label: 'En route', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress:  { label: 'En cours', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed:    { label: 'Terminé', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled:    { label: 'Annulé', cls: 'bg-red-100 text-red-600 border-red-200' },
};

function DeclineModal({ onConfirm, onClose, isPending }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Décliner le rendez-vous</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Indiquez la raison du déclin (optionnel). Le client sera notifié et un autre professionnel sera recherché.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Ex: Indisponible ce jour-là, zone trop éloignée..."
          rows={3}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-muted/30 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Annuler</Button>
          <Button onClick={() => onConfirm(reason)} disabled={isPending} className="flex-1 rounded-xl h-11 bg-destructive hover:bg-destructive/90">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1.5" />Décliner</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ req, user, onAccept, onDecline, accepting, declining }) {
  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending_pro;
  const isPending = req.status === 'pending_pro';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {req.customer_first_name ? `${req.customer_first_name} ${req.customer_last_name || ''}`.trim() : (req.customer_name || 'Client')}
          </p>
          {req.customer_phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />{req.customer_phone}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${sc.cls}`}>{sc.label}</span>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{req.category_name}</p>
        {req.scheduled_date && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(parseISO(req.scheduled_date), 'EEEE d MMMM yyyy', { locale: fr })}
            {req.scheduled_time ? ` à ${req.scheduled_time}` : ''}
          </p>
        )}
        {req.customer_address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{req.customer_address}</span>
          </p>
        )}
        {(req.estimated_price || req.base_price) > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Euro className="w-3 h-3" />
            {(req.estimated_price || req.base_price).toFixed(0)} € estimés
          </p>
        )}
        {req.customer_notes && (
          <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2.5 py-1.5">💬 {req.customer_notes}</p>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onAccept(req)}
            disabled={accepting}
            className="flex-1 rounded-xl h-10 bg-green-600 hover:bg-green-700 text-xs"
          >
            {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Accepter le RDV</>}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline(req)}
            disabled={declining}
            className="flex-1 rounded-xl h-10 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />Décliner
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function ProAgenda() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'list'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [decliningReq, setDecliningReq] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['proAgenda', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { professional_email: user.email },
      '-created_date',
      200
    ).then(reqs => reqs.filter(r =>
      ['pending_pro', 'accepted', 'contract_pending', 'contract_signed', 'pro_en_route', 'in_progress', 'completed', 'cancelled'].includes(r.status)
    )),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // Real-time updates
  React.useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.ServiceRequestV2.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['proAgenda', user.email] });
    });
    return unsub;
  }, [user?.email]);

  // Days with appointments for calendar dots
  const daysWithAppts = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      if (!a.scheduled_date) continue;
      const key = a.scheduled_date.split('T')[0];
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [appointments]);

  // Appointments for selected day
  const dayAppointments = useMemo(() =>
    appointments.filter(a => a.scheduled_date && isSameDay(parseISO(a.scheduled_date), selectedDay))
  , [appointments, selectedDay]);

  // Upcoming list view (sorted asc)
  const upcomingList = useMemo(() =>
    [...appointments].sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
  , [appointments]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = (start.getDay() + 6) % 7; // Monday = 0
    return { days, startPad };
  }, [currentMonth]);

  const acceptMutation = useMutation({
    mutationFn: async (req) => {
      setAcceptingId(req.id);
      await base44.entities.ServiceRequestV2.update(req.id, { status: 'accepted' });
      await base44.entities.Notification.create({
        recipient_email: req.customer_email,
        recipient_type: 'particulier',
        type: 'mission_accepted',
        title: 'RDV confirmé !',
        body: `Votre RDV a été confirmé par ${user.full_name}. Il sera là le ${req.scheduled_date}${req.scheduled_time ? ` à ${req.scheduled_time}` : ''}.`,
        request_id: req.id,
        action_url: `/Chat?requestId=${req.id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });
      toast.success('RDV confirmé ! Le client a été notifié.');
      setAcceptingId(null);
    },
    onError: () => setAcceptingId(null),
  });

  const declineMutation = useMutation({
    mutationFn: async ({ req, reason }) => {
      const tried = [...(req.tried_professionals || [])];
      if (user.email && !tried.includes(user.email)) tried.push(user.email);
      await base44.entities.ServiceRequestV2.update(req.id, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
        tried_professionals: tried,
        cancellation_reason: reason || null,
      });
      await base44.entities.Notification.create({
        recipient_email: req.customer_email,
        recipient_type: 'particulier',
        type: 'mission_refused',
        title: 'RDV décliné',
        body: `Votre RDV a été décliné. Nous recherchons un autre professionnel pour vous.`,
        request_id: req.id,
        action_url: `/Home`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
      toast.success('RDV décliné. Nous allons trouver un autre professionnel pour ce client.');
      setDecliningReq(null);
    },
  });

  const pendingCount = appointments.filter(a => a.status === 'pending_pro').length;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--accent-blue)' }}>Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} rendez-vous
            {pendingCount > 0 && <span className="ml-2 text-yellow-600 font-semibold">· {pendingCount} en attente</span>}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('month')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'month' ? 'bg-card shadow-sm' : ''}`}
          >
            <Calendar className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-card shadow-sm' : ''}`}
          >
            <List className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <p className="text-sm font-semibold text-yellow-800">{pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente de votre confirmation</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : viewMode === 'month' ? (
        <>
          {/* Monthly calendar */}
          <div className="bg-card rounded-2xl border border-border p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold text-sm capitalize">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</p>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <p key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</p>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {/* Padding before first day */}
              {Array(calendarDays.startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}

              {calendarDays.days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const count = daysWithAppts[key] || 0;
                const isSelected = isSameDay(day, selectedDay);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' :
                      isCurrentDay ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-xs font-medium">{format(day, 'd')}</span>
                    {count > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground/80' : 'bg-primary'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day appointments */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 capitalize">
              {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
            </p>
            {dayAppointments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun rendez-vous ce jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayAppointments.map(req => (
                  <AppointmentCard
                    key={req.id}
                    req={req}
                    user={user}
                    onAccept={r => acceptMutation.mutate(r)}
                    onDecline={r => setDecliningReq(r)}
                    accepting={acceptingId === req.id && acceptMutation.isPending}
                    declining={decliningReq?.id === req.id && declineMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* List view */
        <div className="space-y-6">
          {upcomingList.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun rendez-vous prévu</p>
              <p className="text-xs mt-1">Les nouvelles demandes apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <>
              {/* Scheduled appointments */}
              <div className="space-y-3">
                {upcomingList.filter(r => r.scheduled_date).map(req => (
                  <AppointmentCard
                    key={req.id}
                    req={req}
                    user={user}
                    onAccept={r => acceptMutation.mutate(r)}
                    onDecline={r => setDecliningReq(r)}
                    accepting={acceptingId === req.id && acceptMutation.isPending}
                    declining={decliningReq?.id === req.id && declineMutation.isPending}
                  />
                ))}
              </div>

              {/* Unscheduled appointments */}
              {upcomingList.filter(r => !r.scheduled_date).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">📋 Demandes sans date précise</p>
                  <div className="space-y-3">
                    {upcomingList.filter(r => !r.scheduled_date).map(req => (
                      <AppointmentCard
                        key={req.id}
                        req={req}
                        user={user}
                        onAccept={r => acceptMutation.mutate(r)}
                        onDecline={r => setDecliningReq(r)}
                        accepting={acceptingId === req.id && acceptMutation.isPending}
                        declining={decliningReq?.id === req.id && declineMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Decline modal */}
      {decliningReq && (
        <DeclineModal
          onConfirm={(reason) => declineMutation.mutate({ req: decliningReq, reason })}
          onClose={() => setDecliningReq(null)}
          isPending={declineMutation.isPending}
        />
      )}
    </div>
  );
}