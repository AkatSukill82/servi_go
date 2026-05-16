import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Ban, Users, Search, UserX, ShieldCheck } from 'lucide-react';
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
  const searchResults = search.length > 1
    ? users.filter(u =>
        !u.is_blacklisted &&
        (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
         u.email?.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Blocked users */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <UserX className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-sm font-bold text-slate-900">Utilisateurs bloqués</p>
          <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5 tabular-nums">
            {blacklisted.length}
          </span>
        </div>

        {blacklisted.length === 0 ? (
          <div className="py-10 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucun utilisateur bloqué</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {blacklisted.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-sm font-bold text-red-600">
                  {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || u.email}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  {u.blacklist_reason && (
                    <p className="text-[10px] text-red-500 truncate mt-0.5">Motif : {u.blacklist_reason}</p>
                  )}
                </div>
                <button
                  onClick={() => updateMutation.mutate({ id: u.id, data: { is_blacklisted: false, blacklist_reason: '' } })}
                  className="shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                >Débloquer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search & ban */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-900">Bloquer un utilisateur</p>
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
          </div>
        </div>

        {search.length > 1 && (
          <div className="px-4 pb-4 space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucun résultat</p>
            ) : searchResults.map(u => (
              <div key={u.id} className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 shrink-0">
                    {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || '—'}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email} · {u.user_type || 'user'}</p>
                  </div>
                </div>
                <input
                  value={reason[u.id] || ''}
                  onChange={e => setReason(r => ({ ...r, [u.id]: e.target.value }))}
                  placeholder="Motif du blocage (obligatoire)…"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <button
                  onClick={() => {
                    if (!reason[u.id]?.trim()) { toast.error('Indiquez un motif'); return; }
                    updateMutation.mutate({ id: u.id, data: { is_blacklisted: true, blacklist_reason: reason[u.id] } });
                    setReason(r => ({ ...r, [u.id]: '' }));
                    setSearch('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  <Ban className="w-3.5 h-3.5" /> Bloquer cet utilisateur
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}