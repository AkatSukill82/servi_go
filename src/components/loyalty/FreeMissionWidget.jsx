import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Gift, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/lib/theme';

const FREE_MISSION_THRESHOLD = 500; // €

export default function FreeMissionWidget({ userEmail }) {
  const navigate = useNavigate();

  const { data: requests = [] } = useQuery({
    queryKey: ['completedMissionsTotal', userEmail],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: userEmail, status: 'completed' }, '-created_date', 100
    ),
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000,
  });

  const totalSpent = requests.reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
  const completedCount = requests.length;

  // Combien de missions offertes ont déjà été utilisées (celles avec final_price=0 ou free_mission flag)
  const freeMissionsEarned = Math.floor(totalSpent / FREE_MISSION_THRESHOLD);
  
  // On compte les missions "gratuites" déjà utilisées parmi les complétées
  const freeMissionsUsed = requests.filter(r => r.is_free_mission).length;
  const freeMissionsAvailable = Math.max(0, freeMissionsEarned - freeMissionsUsed);

  const progress = Math.min(100, ((totalSpent % FREE_MISSION_THRESHOLD) / FREE_MISSION_THRESHOLD) * 100);
  const remaining = FREE_MISSION_THRESHOLD - (totalSpent % FREE_MISSION_THRESHOLD);

  if (completedCount === 0) return null;

  return (
    <div className="mx-4 mt-6">
      {freeMissionsAvailable > 0 ? (
        // Mission gratuite disponible !
        <motion.button
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/ServiceRequest')}
          className="w-full rounded-3xl overflow-hidden text-left"
          style={{
            background: 'linear-gradient(135deg, #00B894 0%, #00897B 100%)',
            boxShadow: '0 8px 32px rgba(0,184,148,0.35)',
          }}
        >
          <div className="px-5 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-lg leading-tight">Mission offerte 🎁</p>
              <p className="text-white/80 text-sm mt-0.5">
                {freeMissionsAvailable > 1
                  ? `Vous avez ${freeMissionsAvailable} missions gratuites à utiliser !`
                  : 'Votre prochaine mission est gratuite !'}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 shrink-0">
              <span className="text-white text-xs font-black">Utiliser</span>
            </div>
          </div>
        </motion.button>
      ) : (
        // Progression vers la prochaine mission gratuite
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #1a0533 0%, ${BRAND} 70%, #a78bfa 100%)`,
            boxShadow: '0 8px 32px rgba(108,92,231,0.3)',
          }}
        >
          <div className="px-5 py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Prochaine mission offerte</p>
                <p className="text-white/60 text-xs">Dépensez encore {remaining.toFixed(0)}€</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white font-black text-lg">{totalSpent.toFixed(0)}€</p>
                <p className="text-white/50 text-[10px]">sur {FREE_MISSION_THRESHOLD}€</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <p className="text-white/40 text-[10px] mt-2 text-center">
              Chaque mission complétée vous rapproche d'une mission 100% offerte
            </p>
          </div>
        </div>
      )}
    </div>
  );
}