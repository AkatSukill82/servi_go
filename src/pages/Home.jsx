import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import { base44 } from '@/api/base44Client';
import { Search, ShieldCheck, Star, Zap } from 'lucide-react';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceCard from '@/components/home/ServiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

export default function Home() {
  const [search, setSearch] = useState('');
  const [viewingPro, setViewingPro] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000, // catégories stables, pas besoin de refetch souvent
  });

  const filtered = categories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });

  const firstName = user?.full_name?.split(' ')[0];
  const navigate = useNavigate();

  const { data: verifiedPros = [] } = useQuery({
    queryKey: ['verifiedProsHome'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel', verification_status: 'verified', available: true }, '-rating', 6),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-5 pt-7 pb-4">
        <OnboardingModal />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `Bonjour, ${firstName}` : 'Bonjour'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quel service recherchez-vous ?
          </p>
        </div>

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
              <p className="text-sm font-bold text-background">Urgence ? Mode SOS</p>
              <p className="text-xs text-background/70">Professionnel mobilisé en priorité</p>
            </div>
            <span className="text-xs font-bold text-destructive bg-destructive/20 rounded-full px-2.5 py-1">⚡ SOS</span>
          </div>
        </button>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Plombier, électricien, déménageur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted border-transparent focus-visible:border-border focus-visible:bg-card text-sm"
          />
        </div>

        {/* Verified pros strip */}
        {!search && verifiedPros.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Pros vérifiés du coin</p>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {verifiedPros.map(pro => (
                <button
                  key={pro.id}
                  onClick={() => setViewingPro(pro)}
                  className="shrink-0 w-[110px] bg-card rounded-2xl border border-border p-3 text-left"
                >
                  <div className="relative mb-2">
                    <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center font-bold text-sm">
                      {pro.photo_url
                        ? <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
                        : pro.full_name?.[0]}
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold leading-tight truncate">{pro.full_name?.split(' ')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{pro.category_name}</p>
                  {pro.rating > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-medium">{pro.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section label */}
        {!search && (
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
            Nos services
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
            <p className="text-sm text-muted-foreground">Aucun service trouvé</p>
          </div>
        )}

      </div>
    </PullToRefresh>
  );
}