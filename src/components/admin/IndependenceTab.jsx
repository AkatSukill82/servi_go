import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function IndependenceTab() {
  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['adminIndependenceDeclarations'],
    queryFn: () => base44.entities.ProIndependenceDeclaration.list('-created_date', 200),
  });

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringSoon = declarations.filter(d => {
    if (!d.renewal_required_date || !d.is_active) return false;
    const rd = new Date(d.renewal_required_date);
    return rd <= in30Days && rd >= today;
  });

  const expired = declarations.filter(d => {
    if (!d.renewal_required_date) return false;
    return new Date(d.renewal_required_date) < today;
  });

  const getStatus = (d) => {
    if (!d.renewal_required_date) return { label: 'Inconnu', color: 'bg-gray-100 text-gray-600', badge: 'bg-gray-100 text-gray-600' };
    const rd = new Date(d.renewal_required_date);
    const daysLeft = differenceInDays(rd, today);
    if (daysLeft < 0) return { label: 'Action requise', color: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: 'red' };
    if (daysLeft <= 30) return { label: 'Expire bientôt', color: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: 'orange' };
    return { label: 'Conforme', color: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: 'green' };
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{declarations.filter(d => d.is_active && d.renewal_required_date && new Date(d.renewal_required_date) >= today).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Conformes</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{expiringSoon.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Expirent &lt; 30j</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{expired.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Expirées</p>
        </div>
      </div>

      {/* Alerts */}
      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm text-orange-800 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {expiringSoon.length} charte(s) expirent dans les 30 jours
          </p>
          {expiringSoon.map(d => (
            <p key={d.id} className="text-xs text-orange-700">
              {d.professional_name} — expire le {d.renewal_required_date ? format(new Date(d.renewal_required_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
            </p>
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {expired.length} charte(s) expirée(s) — Action requise
          </p>
          {expired.map(d => (
            <p key={d.id} className="text-xs text-red-600">
              {d.professional_name} ({d.professional_email}) — expirée le {d.renewal_required_date ? format(new Date(d.renewal_required_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
            </p>
          ))}
        </div>
      )}

      {/* List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> Déclarations d'indépendance ({declarations.length})
          </h3>
        </div>
        {declarations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Aucune déclaration enregistrée</div>
        ) : (
          <div className="divide-y divide-border/50">
            {declarations.map(d => {
              const st = getStatus(d);
              const daysLeft = d.renewal_required_date ? differenceInDays(new Date(d.renewal_required_date), today) : null;

              return (
                <div key={d.id} className={`p-4 border-l-4 ${st.color}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{d.professional_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.badge}`}>
                          {st.icon === 'green' ? '✓' : '⚠'} {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.professional_email}</p>

                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>📅 Signé le: {d.accepted_at ? format(new Date(d.accepted_at), 'dd/MM/yyyy', { locale: fr }) : '—'}</span>
                        <span>🔄 Expire: {d.renewal_required_date ? format(new Date(d.renewal_required_date), 'dd/MM/yyyy', { locale: fr }) : '—'}</span>
                        <span>🏢 BCE: {d.bce_number || '—'}</span>
                        <span>📋 Version: {d.declaration_version || '1.0'}</span>
                        {d.insurance_company && <span>🛡 Assureur: {d.insurance_company}</span>}
                        {d.insurance_policy_number && <span>📄 Police: {d.insurance_policy_number}</span>}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${([d.confirms_independent_status, d.confirms_free_pricing, d.confirms_free_schedule, d.confirms_free_refusal, d.confirms_own_tools, d.confirms_own_insurance, d.confirms_multi_platform, d.confirms_no_exclusivity, d.confirms_own_clients].filter(Boolean).length / 9) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{[d.confirms_independent_status, d.confirms_free_pricing, d.confirms_free_schedule, d.confirms_free_refusal, d.confirms_own_tools, d.confirms_own_insurance, d.confirms_multi_platform, d.confirms_no_exclusivity, d.confirms_own_clients].filter(Boolean).length}/9 confirmations</span>
                      </div>

                      {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                        <p className="mt-1 text-[10px] font-semibold text-orange-600">⚠ Expire dans {daysLeft} jour(s)</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}