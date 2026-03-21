import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceCard from '@/components/home/ServiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

export default function Home() {
  const [search, setSearch] = React.useState('');
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const filtered = categories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Bonjour 👋</h1>
        <p className="text-muted-foreground text-sm mt-0.5">De quel service avez-vous besoin ?</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card border-border rounded-2xl h-11 text-sm"
        />
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
              <Skeleton className="w-12 h-12 rounded-xl mb-3" />
              <Skeleton className="h-4 w-20 mb-2" />
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun service trouvé</p>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}