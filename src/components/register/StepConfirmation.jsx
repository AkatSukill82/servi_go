import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

async function createTrialSubscription(userEmail, userName) {
  // Vérifier si une subscription existe déjà
  const existing = await base44.entities.ProSubscription.filter({ professional_email: userEmail }, '-created_date', 1);
  if (existing.length > 0) return;

  const today = new Date();
  const trialEnd = new Date(today);
  trialEnd.setMonth(trialEnd.getMonth() + 3);

  const fmt = (d) => d.toISOString().split('T')[0];

  await base44.entities.ProSubscription.create({
    professional_email: userEmail,
    professional_name: userName || '',
    plan: 'monthly',
    price: 0,
    status: 'trial',
    started_date: fmt(today),
    renewal_date: fmt(trialEnd),
    trial_ends_date: fmt(trialEnd),
    payment_method: 'stripe',
    auto_renew: false,
  });
}

export default function StepConfirmation({ userType, firstName, navigate, userEmail, userName }) {
  const trialCreated = useRef(false);

  useEffect(() => {
    if (userType === 'professionnel' && userEmail && !trialCreated.current) {
      trialCreated.current = true;
      createTrialSubscription(userEmail, userName || firstName).catch(() => {});
    }
  }, [userType, userEmail]);

  return (
    <div className="w-full md:max-w-lg mx-auto px-5 pb-10 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
        className="w-24 h-24 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-6 mt-4">
        <CheckCircle className="w-12 h-12 text-[#1D9E75]" strokeWidth={1.5} />
      </motion.div>

      <h1 className="text-2xl font-bold text-[#111827] mb-2">Bienvenue, {firstName || 'chez ServiGo'} !</h1>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#1D9E75]" />
          <p className="font-semibold text-sm text-[#111827]">Compte créé ✓</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#F59E0B] flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
          </div>
          <p className="font-semibold text-sm text-[#111827]">Vérification d'identité en cours</p>
        </div>
        <p className="text-xs text-[#6B7280] bg-[#F9FAFB] rounded-xl p-3">
          {userType === 'particulier'
            ? 'Vos documents sont en cours de vérification (24h max). En attendant, vous pouvez découvrir les professionnels disponibles près de chez vous.'
            : 'Vos documents sont en cours de vérification (24h max). Une fois approuvé, vous pourrez commencer à recevoir des missions.'}
        </p>

        {userType === 'professionnel' && (
          <div className="mt-3 rounded-xl p-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #E1F5EE, #D1FAE5)', border: '1px solid #6EE7B7' }}>
            <span className="text-xl shrink-0">🎁</span>
            <p className="text-xs font-semibold text-emerald-800">3 mois d'abonnement offerts — profitez-en !</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(userType === 'particulier'
          ? [{ icon: '🔍', text: 'Trouvez des pros' }, { icon: '📋', text: 'Contrats signés' }, { icon: '⭐', text: 'Avis vérifiés' }]
          : [{ icon: '📩', text: 'Missions reçues' }, { icon: '✅', text: 'Badge vérifié' }, { icon: '💰', text: '0% commission' }]
        ).map(({ icon, text }) => (
          <div key={text} className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <span className="text-2xl block mb-1">{icon}</span>
            <p className="text-xs font-medium text-[#6B7280]">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(userType === 'professionnel' ? '/ProDashboard' : '/Home')}
        className="w-full h-12 rounded-xl text-base font-semibold text-white transition-colors"
        style={{ backgroundColor: '#FF6B35' }}
      >
        Découvrir ServiGo <ChevronRight className="inline w-5 h-5 ml-1" />
      </button>
    </div>
  );
}