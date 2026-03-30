import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, ChevronRight, CheckCircle2, Clock, XCircle, Wrench, AlertCircle, Calendar, Euro } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  completed: {
    label: 'Terminé',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  in_progress: {
    label: 'En cours',
    icon: Wrench,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  accepted: {
    label: 'Accepté',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  pending_pro: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  searching: {
    label: 'Recherche',
    icon: AlertCircle,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

export default function MissionHistoryCard({ request, invoice, isPro }) {
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  const isActive = ['accepted', 'in_progress'].includes(request.status);

  const handleCardClick = () => {
    if (!isPro && isActive) {
      navigate(`/TrackingMap?requestId=${request.id}`);
    } else {
      navigate(`/Chat?requestId=${request.id}`);
    }
  };

  const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.searching;
  const StatusIcon = status.icon;

  const dateStr = request.created_date
    ? format(parseISO(request.created_date), 'dd MMM yyyy', { locale: fr })
    : '—';

  const scheduledStr = request.scheduled_date
    ? format(parseISO(request.scheduled_date), 'dd MMM yyyy', { locale: fr })
    : null;

  async function handleDownloadInvoice() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURE', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`N° ${invoice.invoice_number}`, 20, 33);
      doc.text(`Date : ${dateStr}`, 20, 39);

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(20, 44, 190, 44);

      // Client / Pro info
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Client', 20, 55);
      doc.text('Prestataire', 110, 55);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(invoice.customer_name || '—', 20, 63);
      doc.text(invoice.customer_email || '—', 20, 69);
      doc.text(invoice.professional_name || '—', 110, 63);

      // Service
      doc.setDrawColor(220, 220, 220);
      doc.line(20, 80, 190, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('Prestation', 20, 90);
      doc.text('Montant HT', 120, 90);
      doc.line(20, 94, 190, 94);

      doc.setFont('helvetica', 'normal');
      doc.text(request.category_name || invoice.category_name || 'Service', 20, 103);
      doc.text(`${(invoice.base_price || 0).toFixed(2)} €`, 120, 103);

      if (invoice.commission > 0) {
        doc.text('Commission plateforme', 20, 112);
        doc.text(`${(invoice.commission || 0).toFixed(2)} €`, 120, 112);
      }

      // Total
      doc.setDrawColor(220, 220, 220);
      doc.line(20, 118, 190, 118);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL', 20, 128);
      doc.text(`${(invoice.total_price || 0).toFixed(2)} €`, 120, 128);

      // Payment
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      const paymentLabels = { apple_pay: 'Apple Pay', bank_transfer: 'Virement bancaire', cash: 'Espèces' };
      doc.text(`Mode de paiement : ${paymentLabels[invoice.payment_method] || '—'}`, 20, 140);
      doc.text(`Statut : ${invoice.payment_status === 'paid' ? 'Payé' : 'Non payé'}`, 20, 147);

      doc.save(`facture-${invoice.invoice_number}.pdf`);
      toast.success('Facture téléchargée');
    } catch (err) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
      onClick={handleCardClick}
    >
      {/* Active mission banner for customer */}
      {!isPro && isActive && (
        <div className="bg-primary px-4 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-primary-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            {request.status === 'accepted' ? 'Pro accepté — En route !' : 'Mission en cours'}
          </p>
          <span className="text-[10px] text-primary-foreground/70">Voir sur la carte →</span>
        </div>
      )}
      {/* Top row */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{request.category_name}</p>
          {isPro ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{request.customer_first_name ? `${request.customer_first_name} ${request.customer_last_name?.[0] || ''}.` : (request.customer_name || request.customer_email)}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{request.professional_name || 'Professionnel non assigné'}</p>
          )}
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ml-2 shrink-0 ${status.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-4 px-4 pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{scheduledStr || dateStr}</span>
        </div>
        {request.total_price > 0 && (
          <div className="flex items-center gap-1">
            <Euro className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">{request.total_price.toFixed(2)} €</span>
          </div>
        )}
        {invoice?.payment_status === 'paid' && (
          <span className="text-green-600 font-medium">Payé</span>
        )}
      </div>

      {/* Answers preview */}
      {request.answers?.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {request.answers.map(a => a.answer).filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Invoice download */}
      {invoice && (
        <div className="border-t border-border">
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            aria-label="Télécharger la facture PDF"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors min-h-[44px] active:bg-primary/10"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Facture {invoice.invoice_number}</span>
            </div>
            <div className="flex items-center gap-1">
              {downloading ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">PDF</span>
                  <Download className="w-4 h-4" />
                </>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}