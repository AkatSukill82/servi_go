import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Gift } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Inscrit', color: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Récompensé', color: 'bg-yellow-100 text-yellow-700' },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-600' },
};

export default function ReferralSection({ user }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [codeCreating, setCodeCreating] = useState(false);

  const { data: referrals = [], isSuccess } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }),
    enabled: !!user?.email,
  });

  const myCode = referrals.find(r => !r.referred_email)?.referral_code || referrals[0]?.referral_code;

  useEffect(() => {
    if (!isSuccess || myCode || codeCreating || !user?.email) return;
    setCodeCreating(true);
    const code = `${(user.first_name || 'USER').toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    base44.entities.Referral.create({
      referrer_email: user.email,
      referrer_name: user.full_name || user.email,
      referral_code: code,
      status: 'pending',
    }).then(() => queryClient.invalidateQueries({ queryKey: ['referrals', user.email] }));
  }, [isSuccess, myCode, user?.email]);

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copié !');
  };

  const referred = referrals.filter(r => r.referred_email);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-1">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Mes parrainages</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary font-medium">
            🎁 Parrainez un ami et gagnez une réduction de 10% sur votre prochaine mission
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Votre code de parrainage</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono font-bold text-base text-center tracking-widest border border-border">
                {myCode || '...'}
              </div>
              <button onClick={handleCopy} className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {referred.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Amis invités ({referred.length})</p>
              <div className="space-y-2">
                {referred.map(r => {
                  const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{r.referred_name || r.referred_email}</p>
                        {r.referred_email && <p className="text-xs text-muted-foreground">{r.referred_email}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
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
    </motion.div>
  );
}