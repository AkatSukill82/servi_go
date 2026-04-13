import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/hooks/useI18n';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import { base44 } from '@/api/base44Client';
import { Search, Zap, AlertCircle, X, CheckCircle } from 'lucide-react';
import InlineSearchResults from '@/components/search/InlineSearchResults';
import { useMutation, useQueryClient as useQC } from '@tanstack/react-query';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceCard from '@/components/home/ServiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

export default function Home() {

  const [viewingPro, setViewingPro] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: upcomingReminder } = useQuery({
    queryKey: ['upcomingReminder', user?.email],
    queryFn: async () => {
      const reqs = await base44.entities.ServiceRequestV2.filter(
        { customer_email: user.email }, '-created_date', 10
      );
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return reqs.find(r => ['contract_signed', 'accepted'].includes(r.status) && r.scheduled_date) 
        ? reqs.filter(r => ['contract_signed', 'accepted'].includes(r.status) && r.scheduled_date).find(r => {
            const d = new Date(r.scheduled_date);
            return d >= now && d <= in24h;
          }) || null
        : null;
    },
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 60000,
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['activeRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email, status: 'accepted' }, '-created_date', 1
    ).then((r) => r[0] || null),
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 20000,
    staleTime: 20000,
  });

  const { data: unfinishedRequest } = useQuery({
    queryKey: ['unfinishedRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email }, '-created_date', 10
    ).then(r => r.find(req => ['searching', 'pending_pro'].includes(req.status)) || null),
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 45000,
    staleTime: 45000,
  });

  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequestV2.update(id, { status: 'cancelled', cancelled_by: 'customer' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unfinishedRequest'] });
      setConfirmCancel(false);
    },
  });

  // Notification browser au retour sur l'app
  useEffect(() => {
    if (!unfinishedRequest || dismissedId === unfinishedRequest.id) return;
    if (Notification.permission === 'granted') {
      new Notification('ServiGo', {
        body: `Votre demande "${unfinishedRequest.category_name}" est toujours en cours. Pensez à la clôturer si elle n'est plus nécessaire.`,
        icon: '/icon.png',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [unfinishedRequest?.id]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allPros = [] } = useQuery({
    queryKey: ['allAvailablePros'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel', available: true }),
    staleTime: 5 * 60 * 1000,
  });

  const prosByCategory = allPros.reduce((acc, pro) => {
    if (pro.category_name) acc[pro.category_name] = (acc[pro.category_name] || 0) + 1;
    return acc;
  }, {});

  const filtered = categories;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
  const firstName = (() => {
    if (user?.first_name) return user.first_name;
    const handle = (user?.full_name || '').includes('@') ? (user.full_name.split('@')[0]) : (user?.full_name || '');
    const letters = handle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    if (letters.length >= 2) return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
    const emailLetters = (user?.email || '').split('@')[0].match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    if (emailLetters.length >= 2) return emailLetters.charAt(0).toUpperCase() + emailLetters.slice(1).toLowerCase();
    return '';
  })();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-5 pt-7 pb-4">
        <OnboardingModal />

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground leading-snug truncate">
            {firstName ? `${t('home_greeting')}, ${firstName}` : t('home_greeting')} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('home_subtitle')}</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setActiveQuery(searchQuery)}
              placeholder="Plombier, électricien, jardinier..."
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': '#FF6B35' }}
            />
          </div>
          <button
            onClick={() => setActiveQuery(searchQuery)}
            className="h-12 px-5 rounded-xl text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: '#FF6B35' }}
          >
            Rechercher
          </button>
        </div>

        {/* Unfinished request banner */}
        {unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest && (
          <div className="w-full mb-3 rounded-2xl overflow-hidden border border-orange-200 bg-orange-50">
            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">Demande en attente — {unfinishedRequest.category_name}</p>
                  <p className="text-xs text-orange-600 mt-0.5">Vous avez une demande non clôturée. Souhaitez-vous l'annuler ?</p>
                </div>
                <button onClick={() => setDismissedId(unfinishedRequest.id)} className="p-1 rounded-full hover:bg-orange-100">
                  <X className="w-4 h-4 text-orange-400" />
                </button>
              </div>
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="mt-3 w-full text-center text-xs font-semibold text-orange-700 border border-orange-300 bg-white rounded-xl py-2 hover:bg-orange-50 transition-colors"
                >
                  Annuler cette demande
                </button>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 text-xs font-medium border border-orange-200 rounded-xl py-2 bg-white text-orange-600"
                  >
                    Non, garder
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                    disabled={cancelMutation.isPending}
                    className="flex-1 text-xs font-semibold rounded-xl py-2 bg-orange-500 text-white disabled:opacity-60"
                  >
                    {cancelMutation.isPending ? 'Annulation...' : 'Oui, annuler'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminder banner */}
        {upcomingReminder && (
          <div className="w-full mb-3 rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center gap-3">
            <span className="text-xl shrink-0">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-800">Rappel — Mission demain</p>
              <p className="text-xs text-yellow-700">{upcomingReminder.category_name} à {upcomingReminder.scheduled_time || '?'} avec {upcomingReminder.professional_name || 'votre pro'}</p>
            </div>
          </div>
        )}

        {/* Active mission banner */}
        {activeRequest && (
          <button
            onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
            className="w-full mb-3 rounded-2xl overflow-hidden"
          >
            <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-300 animate-pulse shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{t('home_mission_accepted')} — {activeRequest.professional_name}</p>
                <p className="text-xs text-white/80">{t('home_track')}</p>
              </div>
              <span className="text-white text-lg">→</span>
            </div>
          </button>
        )}

        {/* Identity pending banner */}
        {user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
          <div className="w-full mb-3 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-center gap-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">Identité non vérifiée</p>
              <p className="text-xs text-orange-600">Certaines fonctionnalités sont limitées en attendant la vérification.</p>
            </div>
            <button onClick={() => navigate('/EidVerification')} className="text-xs font-bold text-orange-700 underline shrink-0">Vérifier</button>
          </div>
        )}

        {/* SOS banner */}
        <button
          onClick={() => navigate('/Emergency')}
          className="w-full mb-5 rounded-2xl overflow-hidden relative"
        >
          <div className="bg-foreground px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive flex items-center justify-center shrink-0 animate-pulse">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-background">{t('home_sos_title')}</p>
              <p className="text-xs text-background/70">{t('home_sos_subtitle')}</p>
            </div>
            <span className="text-xs font-bold text-destructive bg-destructive/20 rounded-full px-2.5 py-1">⚡ SOS</span>
          </div>
        </button>



        {/* Inline search results */}
        {activeQuery !== null && (
          <InlineSearchResults query={activeQuery} />
        )}

        {activeQuery === null && (
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
          {t('home_our_services')}
        </p>
        )}

        {/* Grid — only shown when not searching */}
        {activeQuery === null && isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <Skeleton className="w-10 h-10 rounded-lg mb-3" />
                <Skeleton className="h-3.5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : activeQuery === null ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((category, index) => (
              <ServiceCard
                key={category.id}
                category={category}
                index={index}
                unavailable={!prosByCategory[category.name]}
              />
            ))}
          </div>
        ) : null}

        {activeQuery === null && !isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">{t('home_no_service')}</p>
          </div>
        )}
      </div>

      {viewingPro && (
        <ProProfileSheet
          pro={viewingPro}
          onClose={() => setViewingPro(null)}
          onSelect={(pro) => {
            const cat = categories.find((c) => c.name === pro.category_name);
            if (cat) navigate(`/ServiceRequest?categoryId=${cat.id}&priorityProId=${pro.id}`);
            setViewingPro(null);
          }}
        />
      )}
    </PullToRefresh>
  );
}