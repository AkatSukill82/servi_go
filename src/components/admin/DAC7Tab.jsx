import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, AlertTriangle, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const REPORT_STATUS = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  pending_verification: { label: 'En vérification', color: 'bg-yellow-100 text-yellow-700' },
  verified: { label: 'Vérifié', color: 'bg-blue-100 text-blue-700' },
  submitted: { label: 'Soumis SPF', color: 'bg-green-100 text-green-700' },
};

function getQuarter(dateStr) {
  const m = new Date(dateStr).getMonth();
  return Math.floor(m / 3) + 1;
}

export default function DAC7Tab() {
  const queryClient = useQueryClient();
  const [generatingYear, setGeneratingYear] = useState(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: dac7Profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['adminDAC7Profiles'],
    queryFn: () => base44.entities.DAC7ProProfile.list('-created_date', 200),
  });

  const { data: annualReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['adminDAC7Reports', selectedYear],
    queryFn: () => base44.entities.DAC7AnnualReport.filter({ fiscal_year: selectedYear }, '-created_date', 200),
  });

  const { data: allPros = [] } = useQuery({
    queryKey: ['adminProsForDAC7'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel' }, '-created_date', 200),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => base44.entities.DAC7ProProfile.update(id, { is_verified: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDAC7Profiles'] });
      toast.success('Profil DAC7 vérifié ✓');
    },
  });

  const reportStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DAC7AnnualReport.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDAC7Reports', selectedYear] });
      toast.success('Statut mis à jour');
    },
  });

  const handleGenerateReports = async () => {
    setGeneratingYear(selectedYear);
    try {
      const missions = await base44.entities.ServiceRequestV2.filter({ status: 'completed' }, '-created_date', 2000);
      const yearMissions = missions.filter(m => {
        const d = m.updated_date || m.created_date;
        return d && new Date(d).getFullYear() === selectedYear;
      });

      // Group by professional email
      const byPro = {};
      for (const m of yearMissions) {
        if (!m.professional_email) continue;
        if (!byPro[m.professional_email]) byPro[m.professional_email] = [];
        byPro[m.professional_email].push(m);
      }

      let created = 0;
      for (const [proEmail, proMissions] of Object.entries(byPro)) {
        const profile = dac7Profiles.find(p => p.professional_email === proEmail);
        const proUser = allPros.find(u => u.email === proEmail);

        const q1 = proMissions.filter(m => getQuarter(m.updated_date || m.created_date) === 1);
        const q2 = proMissions.filter(m => getQuarter(m.updated_date || m.created_date) === 2);
        const q3 = proMissions.filter(m => getQuarter(m.updated_date || m.created_date) === 3);
        const q4 = proMissions.filter(m => getQuarter(m.updated_date || m.created_date) === 4);

        const sumQ = (arr) => arr.reduce((s, m) => s + (m.estimated_price || m.final_price || 0), 0);

        const existing = annualReports.find(r => r.professional_email === proEmail);
        const reportData = {
          professional_email: proEmail,
          professional_name: proUser?.full_name || profile?.professional_name || proEmail,
          bce_number: profile?.bce_number || proUser?.bce_number || '',
          tva_number: profile?.tva_number || '',
          fiscal_year: selectedYear,
          q1_transactions: q1.length, q1_amount: sumQ(q1),
          q2_transactions: q2.length, q2_amount: sumQ(q2),
          q3_transactions: q3.length, q3_amount: sumQ(q3),
          q4_transactions: q4.length, q4_amount: sumQ(q4),
          total_transactions: proMissions.length,
          total_amount: sumQ(proMissions),
          status: 'draft',
        };

        if (existing) {
          await base44.entities.DAC7AnnualReport.update(existing.id, reportData);
        } else {
          await base44.entities.DAC7AnnualReport.create(reportData);
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['adminDAC7Reports', selectedYear] });
      toast.success(`${Object.keys(byPro).length} rapports générés (${created} nouveaux)`);
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
    setGeneratingYear(null);
  };

  const handleExportCSV = () => {
    if (annualReports.length === 0) { toast.error('Aucun rapport à exporter'); return; }
    const headers = ['Nom', 'Email', 'BCE', 'TVA', 'Q1 Nb', 'Q1 €', 'Q2 Nb', 'Q2 €', 'Q3 Nb', 'Q3 €', 'Q4 Nb', 'Q4 €', 'Total Nb', 'Total €', 'Statut'];
    const rows = annualReports.map(r => [
      r.professional_name, r.professional_email, r.bce_number, r.tva_number,
      r.q1_transactions, r.q1_amount?.toFixed(2),
      r.q2_transactions, r.q2_amount?.toFixed(2),
      r.q3_transactions, r.q3_amount?.toFixed(2),
      r.q4_transactions, r.q4_amount?.toFixed(2),
      r.total_transactions, r.total_amount?.toFixed(2), r.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DAC7_ServiGo_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const completeCount = dac7Profiles.filter(p => p.is_complete).length;
  const verifiedCount = dac7Profiles.filter(p => p.is_verified).length;
  const incompleteCount = allPros.filter(p => !dac7Profiles.find(d => d.professional_email === p.email && d.is_complete)).length;

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Profils complets</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{verifiedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Vérifiés</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{incompleteCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Incomplets</p>
        </div>
      </div>

      {/* November reminder */}
      {new Date().getMonth() >= 10 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-orange-800">Rappel DAC7 annuel</p>
            <p className="text-xs text-orange-700 mt-1">Le rapport DAC7 doit être soumis au SPF Finances avant le 31 janvier. Pensez à générer et vérifier les rapports {currentYear} dès maintenant.</p>
          </div>
        </div>
      )}

      {/* DAC7 Profiles */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Profils DAC7 des professionnels
          </h3>
        </div>
        {loadingProfiles ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : dac7Profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Aucun profil DAC7 enregistré</div>
        ) : (
          <div className="divide-y divide-border/50">
            {dac7Profiles.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.professional_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.professional_email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {p.bce_number && <span className="text-[10px] text-muted-foreground">BCE: {p.bce_number}</span>}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.is_complete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.is_complete ? '✓ Complet' : '✗ Incomplet'}
                    </span>
                    {p.is_verified && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Vérifié</span>}
                  </div>
                </div>
                {!p.is_verified && p.is_complete && (
                  <button
                    onClick={() => verifyMutation.mutate(p.id)}
                    disabled={verifyMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 font-medium shrink-0"
                  >
                    Vérifier
                  </button>
                )}
                {p.is_verified && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incomplete alert */}
      {incompleteCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">⚠ {incompleteCount} pro(s) sans profil DAC7 complet</p>
          <div className="space-y-1">
            {allPros.filter(p => !dac7Profiles.find(d => d.professional_email === p.email && d.is_complete)).slice(0, 5).map(p => (
              <p key={p.id} className="text-xs text-red-600">{p.full_name || p.email} — {p.email}</p>
            ))}
          </div>
        </div>
      )}

      {/* Annual Reports */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">Rapports annuels</h3>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-xs h-8 px-2 rounded-lg border border-border bg-background"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Button onClick={handleGenerateReports} disabled={!!generatingYear} size="sm" className="flex-1 rounded-xl text-xs h-9">
              {generatingYear ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Générer rapports {selectedYear}
            </Button>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-9">
              <Download className="w-3 h-3 mr-1" /> Exporter CSV
            </Button>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : annualReports.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Aucun rapport pour {selectedYear}</div>
          ) : (
            <div className="space-y-2">
              {annualReports.map(r => {
                const st = REPORT_STATUS[r.status] || REPORT_STATUS.draft;
                return (
                  <div key={r.id} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.professional_name}</p>
                        <p className="text-xs text-muted-foreground">{r.professional_email}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[1, 2, 3, 4].map(q => (
                        <div key={q} className="bg-muted/40 rounded-lg p-1.5">
                          <p className="text-[10px] text-muted-foreground">T{q}</p>
                          <p className="text-xs font-semibold">{r[`q${q}_transactions`] || 0}</p>
                          <p className="text-[10px] text-muted-foreground">{(r[`q${q}_amount`] || 0).toFixed(0)}€</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Total: {r.total_transactions || 0} missions · {(r.total_amount || 0).toFixed(2)}€</p>
                      <div className="flex gap-1">
                        {r.status === 'draft' && (
                          <button onClick={() => reportStatusMutation.mutate({ id: r.id, status: 'pending_verification' })}
                            className="text-[10px] px-2 py-1 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 font-medium">
                            Vérification
                          </button>
                        )}
                        {r.status === 'pending_verification' && (
                          <button onClick={() => reportStatusMutation.mutate({ id: r.id, status: 'verified' })}
                            className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                            Valider
                          </button>
                        )}
                        {r.status === 'verified' && (
                          <button onClick={() => reportStatusMutation.mutate({ id: r.id, status: 'submitted' })}
                            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium">
                            Soumettre SPF
                          </button>
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
    </div>
  );
}