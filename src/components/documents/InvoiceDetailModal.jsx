import React from 'react';
import { X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';

export default function InvoiceDetailModal({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 shadow-sm"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <p className="font-semibold text-sm">Facture {invoice.invoice_number}</p>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 space-y-4 pb-12">
        {/* Header — montant à payer bien visible */}
        <div className="bg-[#1a1a2e] rounded-2xl p-5 text-white space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide">Facture</p>
              <p className="font-bold text-base">{invoice.invoice_number}</p>
              <p className="text-white/60 text-xs mt-0.5">
                {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr }) :
                 invoice.created_date ? format(new Date(invoice.created_date), 'dd MMMM yyyy', { locale: fr }) : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Montant total</p>
              <p className="text-3xl font-black text-white">{(invoice.total_ttc || invoice.total_price || 0).toFixed(2)} €</p>
            </div>
          </div>
          <div className={`rounded-xl px-4 py-2 flex items-center justify-between ${
            invoice.payment_status === 'paid' ? 'bg-green-500/20' : 'bg-orange-400/20'
          }`}>
            <p className="text-sm font-semibold">
              {invoice.payment_status === 'paid' ? '✅ Facture payée' : '💳 En attente de paiement'}
            </p>
            {invoice.payment_method && (
              <p className="text-xs text-white/70">
                {invoice.payment_method === 'cash' ? 'Espèces' : invoice.payment_method === 'bank_transfer' ? 'Virement' : 'Carte'}
              </p>
            )}
          </div>
          {invoice.professional_name && (
            <p className="text-white/70 text-xs">De la part de : <span className="text-white font-medium">{invoice.professional_name}</span></p>
          )}
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Client</p>
            <p className="font-semibold text-sm">{invoice.customer_name || '—'}</p>
            <p className="text-xs text-muted-foreground">{invoice.customer_email || '—'}</p>
            {invoice.customer_address && <p className="text-xs text-muted-foreground">{invoice.customer_address}</p>}
          </div>
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Prestataire</p>
            <p className="font-semibold text-sm">{invoice.professional_name || '—'}</p>
            {invoice.professional_bce && <p className="text-xs text-muted-foreground">BCE : {invoice.professional_bce}</p>}
            {invoice.professional_address && <p className="text-xs text-muted-foreground">{invoice.professional_address}</p>}
          </div>
        </div>

        {/* Service */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prestation</p>
          <p className="font-medium text-sm">{invoice.category_name || '—'}</p>
          {invoice.service_date && <p className="text-xs text-muted-foreground">Date : {invoice.service_date}</p>}
        </div>

        {/* Line items */}
        {invoice.line_items?.length > 0 ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Détail</p>
            </div>
            {invoice.line_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">Qté : {item.quantity} × {item.unit_price?.toFixed(2)} €</p>
                </div>
                <p className="font-bold text-sm">{item.line_total?.toFixed(2)} €</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <p className="text-sm">{invoice.category_name || 'Service'}</p>
            <p className="font-bold">{(invoice.base_price || invoice.subtotal_ht || 0).toFixed(2)} €</p>
          </div>
        )}

        {/* Totals */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          {invoice.subtotal_ht != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{invoice.subtotal_ht.toFixed(2)} €</span>
            </div>
          )}
          {invoice.total_vat != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span>{invoice.total_vat.toFixed(2)} €</span>
            </div>
          )}
          {invoice.commission != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Commission plateforme</span>
              <span>{invoice.commission.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border pt-2">
            <span>Total TTC</span>
            <span>{(invoice.total_ttc || invoice.total_price || 0).toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Statut</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              invoice.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {invoice.payment_status === 'paid' ? '✓ Payée' : 'En attente'}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signatures</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Client', url: invoice.signature_customer_url },
              { label: 'Prestataire', url: invoice.signature_pro_url },
            ].map(({ label, url }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                {url ? (
                  <img src={url} alt={`Signature ${label}`} className="w-full h-16 object-contain border border-border rounded-lg bg-gray-50" />
                ) : (
                  <div className="h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Non signé</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Download */}
        <button
          onClick={() => generateInvoicePDF(invoice)}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Télécharger le PDF
        </button>
      </div>
    </div>
  );
}