import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ban, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function BlacklistTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminAllUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAllUsers'] });
      toast.success('Utilisateur mis à jour');
    },
  });

  const blacklisted = users.filter(u => u.is_blacklisted);
  const filtered = users.filter(u =>
    !u.is_blacklisted &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {blacklisted.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive" /> Utilisateurs bloqués ({blacklisted.length})
          </p>
          <div className="space-y-2">
            {blacklisted.map(u => (
              <div key={u.id} className="bg-card rounded-xl border border-destructive/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 text-sm font-bold text-destructive">
                  {u.full_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.blacklist_reason && <p className="text-xs text-destructive mt-0.5 truncate">Motif : {u.blacklist_reason}</p>}
                </div>
                <button
                  onClick={() => updateMutation.mutate({ id: u.id, data: { is_blacklisted: false, blacklist_reason: '' } })}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted text-foreground font-medium shrink-0"
                >
                  Débloquer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Tous les utilisateurs
        </p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring mb-3"
        />
        {search.length > 1 && (
          <div className="space-y-2">
            {filtered.slice(0, 10).map(u => (
              <div key={u.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold">
                    {u.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.user_type || 'user'}</p>
                  </div>
                </div>
                <input
                  value={reason[u.id] || ''}
                  onChange={e => setReason(r => ({ ...r, [u.id]: e.target.value }))}
                  placeholder="Motif du blocage..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    if (!reason[u.id]?.trim()) { toast.error('Indiquez un motif'); return; }
                    updateMutation.mutate({ id: u.id, data: { is_blacklisted: true, blacklist_reason: reason[u.id] } });
                    setReason(r => ({ ...r, [u.id]: '' }));
                    setSearch('');
                  }}
                  className="w-full text-xs py-2 rounded-lg bg-destructive text-white font-semibold"
                >
                  <Ban className="w-3 h-3 inline mr-1" /> Blacklister cet utilisateur
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>}
          </div>
        )}
      </div>
    </div>
  );
}
