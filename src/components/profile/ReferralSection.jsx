import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Copy, Check, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  pending: { label: 'En attente', cls: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Inscrit ✓', cls: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Récompensé 🎁', cls: 'bg-yellow-100 text-yellow-700' },
  expired: { label: 'Expiré', cls: 'bg-red-50 text-red-500' },
};

export default function ReferralSection({ user }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (code) => base44.entities.Referral.create({
      referrer_email: user.email,
      referrer_name: user.full_name || '',
      referral_code: code,
      status: 'pending',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referrals', user?.email] }),
  });

  // Auto-generate code if none exists
  useEffect(() => {
    if (!user?.email || referrals.length > 0) return;
    const base = (user.first_name || user.full_name?.split(' ')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const code = `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    createMutation.mutate(code);
  }, [user?.email, referrals.length]);

  const myCode = referrals.find(r => !r.referred_email)?.referral_code || referrals[0]?.referral_code;
  const friends = referrals.filter(r => !!r.referred_email);

  const copyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Mes parrainages</h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Tip */}
        <div className="bg-primary/5 rounded-xl px-4 py-3 text-xs text-primary font-medium">
          🎁 Parrainez un ami et gagnez une réduction de 10% sur votre prochaine mission
        </div>

        {/* Code box */}
        {myCode ? (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Votre code de parrainage</p>
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3">
              <span className="flex-1 font-mono text-base font-bold tracking-widest text-foreground">{myCode}</span>
              <button onClick={copyCode}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground">Génération du code...</div>
        )}

        {/* Friends list */}
        {friends.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Amis parrainés ({friends.length})</p>
            </div>
            <div className="space-y-2">
              {friends.map(r => {
                const s = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.referred_name || r.referred_email || 'Ami'}</p>
                      {r.referred_email && <p className="text-xs text-muted-foreground">{r.referred_email}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun ami parrainé pour l'instant. Partagez votre code !</p>
        )}
      </div>
    </div>
  );
}