import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Star, Gift, ChevronRight, Trophy, Zap } from 'lucide-react';
import { BRAND } from '@/lib/theme';

const TIERS = {
  bronze:   { label: 'Bronze',   color: '#CD7F32', min: 0,    max: 200,   emoji: '🥉', discount: '2%' },
  silver:   { label: 'Silver',   color: '#9CA3AF', min: 200,  max: 500,   emoji: '🥈', discount: '5%' },
  gold:     { label: 'Gold',     color: '#F59E0B', min: 500,  max: 1000,  emoji: '🥇', discount: '8%' },
  platinum: { label: 'Platinum', color: '#6C5CE7', min: 1000, max: 1000,  emoji: '💎', discount: '12%' },
};

const REWARDS = [
  { points: 100, label: '-5€ sur votre prochaine mission',  emoji: '💶' },
  { points: 250, label: 'Priorité dans la file d\'attente', emoji: '⚡' },
  { points: 500, label: '-15€ sur une mission premium',     emoji: '🎁' },
  { points: 750, label: 'Mois d\'abonnement offert (pro)',  emoji: '🚀' },
];

export default function LoyaltyWidget({ userEmail }) {
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty', userEmail],
    queryFn: () => base44.entities.LoyaltyPoints
      .filter({ user_email: userEmail }, '-created_date', 1)
      .then(r => r[0] || null),
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const points = loyalty?.available_points || 0;
  const tier = TIERS[loyalty?.tier || 'bronze'];
  const progress = Math.min(100, ((points - tier.min) / (Math.max(1, tier.max - tier.min))) * 100);
  const nextTier = Object.values(TIERS).find(t => t.min > tier.min);
  const pointsToNext = nextTier ? Math.max(0, nextTier.min - points) : 0;

  return (
    <div className="mx-4 mt-6">
      <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, #1a0533 0%, ${BRAND} 70%, #a78bfa 100%)`, boxShadow: '0 8px 32px rgba(108,92,231,0.3)' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-white/80" />
              <span className="text-white font-bold text-sm">ServiGo Fidélité</span>
            </div>
            <span className="text-xl">{tier.emoji}</span>
          </div>

          <motion.p
            key={points}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-4xl font-black text-white leading-none"
          >
            {points.toLocaleString()}
          </motion.p>
          <p className="text-white/60 text-xs mt-1">points disponibles · Niveau {tier.label}</p>

          {/* Progress bar */}
          {nextTier && (
            <div className="mt-3">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-white"
                />
              </div>
              <p className="text-white/50 text-[10px] mt-1">
                {pointsToNext} pts pour atteindre {nextTier.label} {nextTier.emoji} · -{nextTier.discount} de commission
              </p>
            </div>
          )}
        </div>

        {/* Rewards */}
        <div className="bg-white/10 backdrop-blur-sm px-5 py-4">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">Récompenses disponibles</p>
          <div className="space-y-2">
            {REWARDS.map((reward) => {
              const unlocked = points >= reward.points;
              return (
                <div key={reward.points} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${unlocked ? 'bg-white/15' : 'opacity-40'}`}>
                  <span className="text-lg shrink-0">{reward.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold leading-tight">{reward.label}</p>
                    <p className="text-white/50 text-[10px] mt-0.5">{reward.points} pts requis</p>
                  </div>
                  {unlocked && (
                    <span className="text-[10px] font-bold text-white bg-white/20 rounded-full px-2 py-0.5 shrink-0">
                      Dispo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}