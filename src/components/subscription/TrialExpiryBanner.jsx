import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

// Affiche une bannière quand il reste <= 15 jours sur le trial
export default function TrialExpiryBanner({ subscription }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !subscription) return null;

  const { status, trial_ends_date, renewal_date } = subscription;
  if (status !== 'trial') return null;

  const endDate = trial_ends_date || renewal_date;
  if (!endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  // Afficher seulement dans les 15 derniers jours
  if (daysLeft > 15 || daysLeft < 0) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <div
      className="px-4 py-2.5 flex items-center gap-3 shrink-0"
      style={{ background: isUrgent ? '#DC2626' : '#F59E0B' }}
    >
      <span className="text-base shrink-0">{isUrgent ? '🚨' : '⏳'}</span>
      <p className="text-xs font-semibold text-white flex-1">
        {daysLeft === 0
          ? "Votre période d'essai expire aujourd'hui !"
          : daysLeft === 1
          ? "Votre période d'essai expire demain !"
          : `Votre période d'essai expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
      </p>
      <button
        onClick={() => navigate('/ProSubscription')}
        className="text-xs font-black bg-white rounded-full px-3 py-1 shrink-0"
        style={{ color: isUrgent ? '#DC2626' : '#D97706' }}
      >
        S'abonner
      </button>
      <button onClick={() => setDismissed(true)} className="text-white/70 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}