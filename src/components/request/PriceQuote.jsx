import React from 'react';
import { motion } from 'framer-motion';
import SubsidiesPanel from '@/components/subsidies/SubsidiesPanel';
import { Check, X, CreditCard, Banknote, CalendarDays, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function PriceQuote({
  basePrice,
  commission,
  totalPrice,
  paymentMethod,
  setPaymentMethod,
  onAccept,
  onDecline,
  isSubmitting,
  scheduledDate,
  scheduledTime,
  isUrgent,
  categoryName,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Urgent banner */}
      {isUrgent && (
        <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" strokeWidth={2} />
          <div>
            <p className="text-sm font-bold text-destructive flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Intervention SOS — Priorité absolue
            </p>
            <p className="text-xs text-muted-foreground">Professionnel mobilisé en priorité</p>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Moyen de paiement</h3>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">

          {/* Virement bancaire via Stripe */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
            <RadioGroupItem value="stripe" id="stripe" />
            <Label htmlFor="stripe" className="flex items-center gap-3 cursor-pointer flex-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium">Virement bancaire</span>
                <p className="text-xs text-muted-foreground">Paiement sécurisé en ligne par carte ou virement</p>
              </div>
            </Label>
          </div>

          {/* Espèces */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer flex-1">
              <Banknote className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Espèces</span>
                <p className="text-xs text-muted-foreground">À remettre directement au professionnel</p>
              </div>
            </Label>
          </div>

        </RadioGroup>
      </div>

      {/* Subsidies */}
      {categoryName && <SubsidiesPanel categoryName={categoryName} />}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onDecline}
          className="flex-1 h-14 rounded-xl text-base"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5 mr-2" />
          Refuser
        </Button>
        <Button
          onClick={onAccept}
          disabled={!paymentMethod || isSubmitting}
          className="flex-1 h-14 rounded-xl text-base bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
          {isSubmitting ? 'Traitement...' : 'Confirmer ma demande'}
        </Button>
      </div>
    </motion.div>
  );
}