import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Receipt, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

const paymentIcons = {
  apple_pay: Smartphone,
  bank_transfer: CreditCard,
  cash: Banknote,
};

const paymentLabels = {
  apple_pay: 'Apple Pay',
  bank_transfer: 'Bancaire',
  cash: 'Espèces',
};

export default function InvoiceCard({ invoice, index }) {
  const PayIcon = paymentIcons[invoice.payment_method] || CreditCard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{invoice.category_name}</p>
            <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
          </div>
        </div>
        <Badge
          variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}
          className={invoice.payment_status === 'paid'
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-amber-100 text-amber-700 border-amber-200'
          }
        >
          {invoice.payment_status === 'paid' ? 'Payée' : 'En attente'}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PayIcon className="w-3.5 h-3.5" />
          <span>{paymentLabels[invoice.payment_method] || 'N/A'}</span>
          {invoice.created_date && (
            <>
              <span>•</span>
              <span>{format(new Date(invoice.created_date), 'dd MMM yyyy', { locale: fr })}</span>
            </>
          )}
        </div>
        <p className="font-bold text-lg">{invoice.total_price?.toFixed(2)} €</p>
      </div>
    </motion.div>
  );
}