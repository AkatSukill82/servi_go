import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/hooks/useI18n';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import { base44 } from '@/api/base44Client';
import { Search, Zap } from 'lucide-react';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceCard from '@/components/home/ServiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

export default function Home() {
  const [search, setSearch] = useState('');
  const [viewingPro, setViewingPro] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['activeRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequest.filter(
      { customer_email: user.email, status: 'accepted' }, '-created_date', 1
    ).then((r) => r[0] || null),
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 5000
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000
  });

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
  const firstName = user?.full_name?.split(' ')[0];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-5 pt-7 pb-4">
        <OnboardingModal />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `${t('home_greeting')}, ${firstName}` : t('home_greeting')} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('home_subtitle')}</p>
        </div>

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

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('home_search_placeholder')}
            className="w-full h-11 rounded-xl border border-border bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {!search && (
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
            {t('home_our_services')}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <Skeleton className="w-10 h-10 rounded-lg mb-3" />
                <Skeleton className="h-3.5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((category, index) => (
              <ServiceCard key={category.id} category={category} index={index} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
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