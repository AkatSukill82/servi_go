import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { label: 'En attente', className: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Inscrit ✓', className: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Récompensé 🏆', className: 'bg-yellow-100 text-yellow-700' },
  expired: { label: 'Expiré', className: 'bg-red-50 text-red-500' },
};

export default function ReferralSection({ user }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }, '-created_date', 50),
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

  // Get or generate referral code
  const myReferral = referrals.find(r => r.referrer_email === user?.email && r.referral_code);
  const referralCode = myReferral?.referral_code;

  const handleGenerateCode = () => {
    const prefix = (user?.first_name || user?.full_name?.split(' ')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${prefix}-${suffix}`;
    createMutation.mutate(code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode || '');
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const referred = referrals.filter(r => r.referred_email || r.referred_name);

  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Mes parrainages</h3>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Tip */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-xs text-primary font-medium">
          🎁 Parrainez un ami et gagnez une réduction de 10% sur votre prochaine mission
        </div>

        {/* Referral code */}
        {referralCode ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Votre code de parrainage</p>
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3 border border-border/50">
              <span className="flex-1 font-mono font-bold text-lg tracking-widest text-foreground">{referralCode}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerateCode}
            disabled={createMutation.isPending || isLoading}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Génération...' : '✨ Générer mon code de parrainage'}
          </button>
        )}

        {/* Referred friends list */}
        {referred.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Amis parrainés ({referred.length})</p>
            </div>
            <div className="space-y-2">
              {referred.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {(r.referred_name || r.referred_email || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{r.referred_name || r.referred_email || 'Ami invité'}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {referred.length === 0 && referralCode && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Partagez votre code pour inviter vos amis !
          </p>
        )}
      </div>
    </div>
  );
}