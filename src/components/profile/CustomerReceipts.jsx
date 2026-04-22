import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Receipt, Download, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import InvoiceDetailModal from '@/components/documents/InvoiceDetailModal';

const statusConfig = {
  completed:    { label: 'Terminée',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  accepted:     { label: 'En cours',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  cancelled:    { label: 'Annulée',    color: 'bg-red-100 text-red-700',      icon: XCircle },
  searching:    { label: 'En attente', color: 'bg-amber-100 text-amber-700',  icon: Clock },
  pending_pro:  { label: 'En attente', color: 'bg-amber-100 text-amber-700',  icon: Clock },
  in_progress:  { label: 'En cours',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  contract_pending: { label: 'Contrat en attente', color: 'bg-purple-100 text-purple-700', icon: Clock },
  contract_signed:  { label: 'Contrat signé',      color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle },
  pro_en_route:     { label: 'En route',           color: 'bg-blue-100 text-blue-700',     icon: Clock },
};


export default function CustomerReceipts({ user }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('factures');

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['customerRequestsV2', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['customerInvoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const invoiceMap = invoices.reduce((map, inv) => {
    if (inv.request_id) map[inv.request_id] = inv;
    return map;
  }, {});

  const isLoading = loadingRequests || loadingInvoices;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const unpaidInvoices = invoices.filter(inv => inv.payment_status !== 'paid');

  return (
    <>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[['factures', `Factures (${invoices.length})`], ['missions', `Missions (${requests.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                activeTab === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Unpaid alert */}
        {activeTab === 'factures' && unpaidInvoices.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-lg">💳</span>
            <p className="text-xs font-medium text-orange-800">
              {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} en attente de paiement —{' '}
              <span className="font-bold">{unpaidInvoices.reduce((s, i) => s + (i.total_price || 0), 0).toFixed(2)} €</span>
            </p>
          </div>
        )}

        {/* FACTURES TAB */}
        {activeTab === 'factures' && (
          invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Aucune facture pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1">Les factures envoyées par vos prestataires apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.category_name}</p>
                      {inv.professional_name && (
                        <p className="text-xs text-muted-foreground">par {inv.professional_name}</p>
                      )}
                      {inv.invoice_date && (
                        <p className="text-xs text-muted-foreground">
                          📅 {format(new Date(inv.invoice_date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{(inv.total_price || 0).toFixed(2)} €</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {inv.payment_status === 'paid' ? '✓ Payée' : '⏳ À payer'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Voir le détail
                    </button>
                    <button
                      onClick={() => generateInvoicePDF(inv)}
                      className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-primary/10"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* MISSIONS TAB */}
        {activeTab === 'missions' && (
          requests.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Aucune mission pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req, i) => {
                const cfg = statusConfig[req.status] || statusConfig.searching;
                const StatusIcon = cfg.icon;
                const invoice = invoiceMap[req.id];

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{req.category_name}</p>
                        {req.professional_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">par {req.professional_name}</p>
                        )}
                        {req.scheduled_date && (
                          <p className="text-xs text-muted-foreground">
                            📅 {format(new Date(req.scheduled_date), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {invoice ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Voir la facture — {(invoice.total_price || 0).toFixed(2)} €
                        </button>
                        <button
                          onClick={() => generateInvoicePDF(invoice)}
                          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </div>
                    ) : req.status === 'completed' ? (
                      <div className="h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <p className="text-xs font-medium text-amber-700">Facture en attente d'envoi par le pro</p>
                      </div>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </>
  );
}