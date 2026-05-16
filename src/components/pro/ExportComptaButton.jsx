import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ExportComptaButton({ userEmail, userName }) {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      // Fetch missions complétées du mois
      const allMissions = await base44.entities.ServiceRequestV2.filter(
        { professional_email: userEmail, status: 'completed' },
        '-created_date',
        200
      );
      const missions = allMissions.filter(m => {
        const d = new Date(m.created_date);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });

      // Fetch factures du mois
      const allInvoices = await base44.entities.Invoice.filter(
        { professional_email: userEmail },
        '-created_date',
        200
      );
      const invoices = allInvoices.filter(inv => {
        const d = new Date(inv.created_date);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });

      const wb = XLSX.utils.book_new();
      const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });

      // ── Feuille 1 : Récapitulatif des missions ──
      const missionsData = missions.map((m, i) => ({
        'N°': i + 1,
        'Date': m.created_date ? format(new Date(m.created_date), 'dd/MM/yyyy') : '',
        'Service': m.category_name || '',
        'Client': m.customer_name || `${m.customer_first_name || ''} ${m.customer_last_name || ''}`.trim() || 'Client',
        'Adresse client': m.customer_address || '',
        'Prix estimé (€)': m.estimated_price || '',
        'Prix final (€)': m.final_price || '',
        'Statut': 'Terminée',
        'Urgent': m.is_urgent ? 'Oui' : 'Non',
      }));

      if (missionsData.length === 0) {
        missionsData.push({ 'N°': '', 'Date': 'Aucune mission ce mois', 'Service': '', 'Client': '', 'Adresse client': '', 'Prix estimé (€)': '', 'Prix final (€)': '', 'Statut': '', 'Urgent': '' });
      }

      const wsMissions = XLSX.utils.json_to_sheet(missionsData);
      wsMissions['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, wsMissions, 'Missions');

      // ── Feuille 2 : Factures ──
      const invoicesData = invoices.map((inv, i) => ({
        'N°': i + 1,
        'Numéro facture': inv.invoice_number || '',
        'Date': inv.created_date ? format(new Date(inv.created_date), 'dd/MM/yyyy') : '',
        'Client': inv.customer_name || '',
        'Service': inv.category_name || '',
        'HTVA (€)': inv.base_price || (inv.total_price ? (inv.total_price / 1.21).toFixed(2) : ''),
        'TVA 21% (€)': inv.total_vat || (inv.total_price ? (inv.total_price - inv.total_price / 1.21).toFixed(2) : ''),
        'Total TTC (€)': inv.total_price || '',
        'Mode paiement': inv.payment_method || '',
        'Statut paiement': inv.payment_status === 'paid' ? 'Payé' : 'En attente',
      }));

      if (invoicesData.length === 0) {
        invoicesData.push({ 'N°': '', 'Numéro facture': 'Aucune facture ce mois', 'Date': '', 'Client': '', 'Service': '', 'HTVA (€)': '', 'TVA 21% (€)': '', 'Total TTC (€)': '', 'Mode paiement': '', 'Statut paiement': '' });
      }

      // Ligne totaux
      const totalHT = invoices.reduce((s, inv) => s + (inv.base_price || (inv.total_price ? inv.total_price / 1.21 : 0)), 0);
      const totalTVA = invoices.reduce((s, inv) => s + (inv.total_vat || (inv.total_price ? inv.total_price - inv.total_price / 1.21 : 0)), 0);
      const totalTTC = invoices.reduce((s, inv) => s + (inv.total_price || 0), 0);
      invoicesData.push({
        'N°': '',
        'Numéro facture': 'TOTAL',
        'Date': '',
        'Client': '',
        'Service': '',
        'HTVA (€)': totalHT.toFixed(2),
        'TVA 21% (€)': totalTVA.toFixed(2),
        'Total TTC (€)': totalTTC.toFixed(2),
        'Mode paiement': '',
        'Statut paiement': '',
      });

      const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
      wsInvoices['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Factures');

      // ── Feuille 3 : Résumé comptable ──
      const resumeData = [
        { 'Indicateur': 'Professionnel', 'Valeur': userName || userEmail },
        { 'Indicateur': 'Période', 'Valeur': monthLabel },
        { 'Indicateur': 'Nombre de missions terminées', 'Valeur': missions.length },
        { 'Indicateur': 'Nombre de factures émises', 'Valeur': invoices.length },
        { 'Indicateur': 'CA total HTVA (€)', 'Valeur': totalHT.toFixed(2) },
        { 'Indicateur': 'TVA collectée 21% (€)', 'Valeur': totalTVA.toFixed(2) },
        { 'Indicateur': 'CA total TTC (€)', 'Valeur': totalTTC.toFixed(2) },
        { 'Indicateur': 'Factures payées', 'Valeur': invoices.filter(i => i.payment_status === 'paid').length },
        { 'Indicateur': 'Factures en attente', 'Valeur': invoices.filter(i => i.payment_status !== 'paid').length },
      ];
      const wsResume = XLSX.utils.json_to_sheet(resumeData);
      wsResume['!cols'] = [{ wch: 35 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé');

      const fileName = `ServiGo_Compta_${selectedMonth}_${(userName || 'Pro').replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Export ${monthLabel} téléchargé !`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'export.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-border space-y-3" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div>
        <p className="text-sm font-bold text-foreground">Export comptabilité</p>
        <p className="text-xs text-muted-foreground mt-0.5">Missions + Factures du mois au format Excel</p>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          onClick={handleExport}
          disabled={loading}
          className="rounded-xl h-10 px-4 text-sm font-bold shrink-0"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Download className="w-4 h-4 mr-1.5" /> Exporter</>
          }
        </Button>
      </div>
    </div>
  );
}