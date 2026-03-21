import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, CreditCard, Banknote, Smartphone, CalendarDays, Loader2 } from 'lucide-react';
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
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Price Breakdown */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Détail du prix</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prix du service</span>
            <span className="font-medium">{basePrice.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de service (10%)</span>
            <span className="font-medium">{commission.toFixed(2)} €</span>
          </div>
          {scheduledDate && scheduledTime && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Intervention prévue
              </span>
              <span className="font-medium">
                {format(new Date(scheduledDate), 'dd MMM', { locale: fr })} à {scheduledTime}
              </span>
            </div>
          )}
          <div className="border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-2xl text-primary">{totalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Moyen de paiement</h3>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">

          {/* Apple Pay / Google Pay via Stripe */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
            <RadioGroupItem value="stripe" id="stripe" />
            <Label htmlFor="stripe" className="flex items-center gap-3 cursor-pointer flex-1">
              <Smartphone className="w-5 h-5 text-foreground" />
              <div>
                <span className="font-medium">Apple Pay / Google Pay / Carte</span>
                <p className="text-xs text-muted-foreground">Paiement sécurisé en ligne</p>
              </div>
            </Label>
          </div>

          {/* Virement bancaire */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
            <RadioGroupItem value="bank_transfer" id="bank_transfer" />
            <Label htmlFor="bank_transfer" className="flex items-center gap-3 cursor-pointer flex-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <span className="font-medium">Virement bancaire</span>
                <p className="text-xs text-muted-foreground">IBAN du professionnel affiché après confirmation</p>
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
          {isSubmitting ? 'Traitement...' : paymentMethod === 'stripe' ? 'Payer en ligne' : 'Confirmer'}
        </Button>
      </div>
    </motion.div>
  );
}