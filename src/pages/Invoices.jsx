import React, { useState, useMemo } from 'react';
import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, CreditCard, Banknote, Apple, Euro } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { toast } from 'sonner';

const PAYMENT_ICONS = {
  apple_pay: { icon: Apple, label: 'Apple Pay' },
  bank_transfer: { icon: Banknote, label: 'Virement' },
  cash: { icon: Euro, label: 'Espèces' },
  stripe: { icon: CreditCard, label: 'Carte bancaire' },
};

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

function InvoiceRow({ invoice }) {
  const pm = PAYMENT_ICONS[invoice.payment_method] || { icon: CreditCard, label: 'N/A' };
  const PmIcon = pm.icon;
  const isPaid = invoice.payment_status === 'paid';
  const [paying, setPaying] = React.useState(false);

  const handlePay = async () => {
    if (isInIframe()) {
      toast.error('Le paiement fonctionne uniquement depuis l\'app publiée.');
      return;
    }
    setPaying(true);
    try {
      const res = await base44.functions.invoke('createStripeCheckout', {
        request_id: invoice.request_id,
        amount: invoice.total_price,
        invoice_number: invoice.invoice_number,
        successUrl: `${window.location.origin}/Invoices?paid=true`,
        cancelUrl: `${window.location.origin}/Invoices`,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else toast.error('Erreur, réessayez.');
    } catch {
      toast.error('Erreur lors du paiement.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{invoice.invoice_number}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
              {isPaid ? 'Payé' : 'En attente'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{invoice.category_name}</p>
          {invoice.professional_name && <p className="text-xs text-muted-foreground">Par {invoice.professional_name}</p>}
          {invoice.created_date && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(invoice.created_date), 'd MMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-primary">{(invoice.total_price || 0).toFixed(2)} €</p>
          <div className="flex items-center gap-1 justify-end mt-1">
            <PmIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{pm.label}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-xs"
          onClick={() => { generateInvoicePDF(invoice); }}>
          <Download className="w-3.5 h-3.5 mr-1" /> Télécharger PDF
        </Button>
        {!isPaid && (
          <Button size="sm" className="flex-1 rounded-xl h-9 text-xs" onClick={handlePay} disabled={paying}>
            <CreditCard className="w-3.5 h-3.5 mr-1" /> {paying ? 'Redirection...' : 'Payer en ligne'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Invoices() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const totalSpent = useMemo(() =>
    invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + (i.total_price || 0), 0),
  [invoices]);

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['invoices', user?.email] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-2xl font-bold mb-0.5">Mes factures</h1>
        <p className="text-sm text-muted-foreground mb-5">Historique de vos services</p>

        {/* Total */}
        {invoices.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total dépensé</p>
              <p className="text-2xl font-bold text-primary">{totalSpent.toFixed(2)} €</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">Aucune facture pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1">Vos factures apparaîtront ici après une mission</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}