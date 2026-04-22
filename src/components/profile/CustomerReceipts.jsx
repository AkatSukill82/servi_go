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

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['customerRequestsV2', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customerInvoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const invoiceMap = invoices.reduce((map, inv) => {
    map[inv.request_id] = inv;
    return map;
  }, {});

  const totalSpent = requests
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.final_price || r.agreed_price || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Résumé */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Missions</p>
            <p className="text-2xl font-bold">{requests.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Factures</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </div>
        </div>

        {/* Liste */}
        {requests.length === 0 ? (
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

                  <div className="text-xs text-muted-foreground">
                    {req.created_date && format(new Date(req.created_date), 'dd MMM yyyy', { locale: fr })}
                  </div>

                  {invoice && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="flex-1 h-9 rounded-xl border border-border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir la facture
                      </button>
                      <button
                        onClick={() => generateInvoicePDF(invoice)}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </>
  );
}