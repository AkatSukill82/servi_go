import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle } from 'lucide-react';

function ScoreRing({ score, size = 56 }) {
  const r = (size / 2) - 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function ClientScoreBadge({ customerEmail, compact = false }) {
  const { data: completedMissions = [] } = useQuery({
    queryKey: ['clientMissions', customerEmail],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: customerEmail, status: 'completed' }, '-created_date', 50
    ),
    enabled: !!customerEmail,
    staleTime: 120000,
  });

  const { data: proReviews = [] } = useQuery({
    queryKey: ['clientProReviews', customerEmail],
    queryFn: () => base44.entities.ProReview.filter({ customer_email: customerEmail }, '-created_date', 20),
    enabled: !!customerEmail,
    staleTime: 120000,
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ['clientDisputes', customerEmail],
    queryFn: () => base44.entities.Dispute.filter({ customer_email: customerEmail }, '-created_date', 20),
    enabled: !!customerEmail,
    staleTime: 120000,
  });

  // Calculate score
  const missionsCount = completedMissions.length;
  const avgRating = proReviews.length > 0
    ? proReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / proReviews.length
    : null;
  const disputeCount = disputes.filter(d => d.opened_by === 'professional').length;
  const cancelledMissions = 0; // Could extend later

  // Score formula (0-100)
  let score = 70; // Base score for new clients
  if (missionsCount > 0) {
    score = 60;
    // +points per completed mission (max +20)
    score += Math.min(20, missionsCount * 2);
    // +points for avg rating from pros (max +15)
    if (avgRating) score += Math.round((avgRating / 5) * 15);
    // -points per dispute (max -20)
    score -= Math.min(20, disputeCount * 7);
    // Clamp
    score = Math.max(10, Math.min(100, score));
  }

  const level = score >= 80 ? { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    : score >= 60 ? { label: 'Bon client', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' }
    : { label: 'Prudence', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${level.bg} ${level.border}`}>
        <ScoreRing score={score} size={28} />
        <span className={`text-xs font-bold ${level.color}`}>{level.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${level.bg} ${level.border}`}>
      <div className="flex items-center gap-3 mb-3">
        <ScoreRing score={score} size={56} />
        <div>
          <p className={`font-bold text-base ${level.color}`}>Score client : {score}/100</p>
          <p className={`text-sm ${level.color} opacity-80`}>{level.label}</p>
        </div>
        {score < 60 && <AlertTriangle className="w-5 h-5 text-red-500 ml-auto shrink-0" />}
        {score >= 80 && <Shield className="w-5 h-5 text-emerald-600 ml-auto shrink-0" />}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/70 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-foreground leading-none">{missionsCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Missions</p>
        </div>
        <div className="bg-white/70 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black leading-none" style={{ color: avgRating ? '#F59E0B' : '#9CA3AF' }}>
            {avgRating ? avgRating.toFixed(1) : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Note reçue</p>
        </div>
        <div className="bg-white/70 rounded-xl p-2.5 text-center">
          <p className={`text-lg font-black leading-none ${disputeCount > 0 ? 'text-red-500' : 'text-foreground'}`}>
            {disputeCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Litiges</p>
        </div>
      </div>
    </div>
  );
}