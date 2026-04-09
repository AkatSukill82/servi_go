import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, CreditCard, Calendar, Shield, Zap, AlertCircle, RefreshCw, X, Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BENEFITS = [
  { icon: Zap, text: 'Missions en temps réel dans votre catégorie' },
  { icon: Shield, text: 'Badge Pro Vérifié ✓ visible par les clients' },
  { icon: Calendar, text: 'Gestion des disponibilités hebdomadaires' },
  { icon: CheckCircle, text: 'Contrats de mission électroniques sécurisés' },
];

function isInIframe() {
  try { return window.self !== window.top; } catch (e) { return true; }
}

export default function ProSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAutoRenewDialog, setShowAutoRenewDialog] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get('success') === 'true';

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: subscription, refetch } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () => base44.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const updateSubMutation = useMutation({
    mutationFn: (data) => base44.entities.ProSubscription.update(subscription.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proSubscription'] });
      toast.success('Abonnement mis à jour ✓');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleSubscribe = async () => {
    if (isInIframe()) {
      toast.error('Le paiement fonctionne uniquement depuis l\'app publiée. Ouvrez ServiGo dans votre navigateur.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createProSubscription', {
        plan,
        successUrl: `${window.location.origin}/ProSubscription?success=true&plan=${plan}`,
        cancelUrl: `${window.location.origin}/ProSubscription`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Erreur lors de la création de l\'abonnement. Réessayez.');
        setLoading(false);
      }
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    await updateSubMutation.mutateAsync({ status: 'cancelled', auto_renew: false });
    setShowCancelDialog(false);
    toast.success('Abonnement résilié. Vous gardez l\'accès jusqu\'au ' + (subscription?.renewal_date || '—'));
  };

  const handleAutoRenewToggle = async (newVal) => {
    if (!newVal) {
      setShowAutoRenewDialog(true);
    } else {
      await updateSubMutation.mutateAsync({ auto_renew: true });
      toast.success('Renouvellement automatique activé ✓');
    }
  };

  const [billingLoading, setBillingLoading] = useState(false);

  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['paymentHistory', user?.email],
    queryFn: () => base44.entities.PaymentHistory.filter({ professional_email: user.email }, '-created_date', 24),
    enabled: !!user?.email && !!subscription,
    staleTime: 60000,
  });

  const handleOpenBillingPortal = async () => {
    if (isInIframe()) {
      toast.error('Fonctionne uniquement depuis l\'app publiée.');
      return;
    }
    setBillingLoading(true);
    try {
      const res = await base44.functions.invoke('createBillingPortal', {
        returnUrl: `${window.location.origin}/ProSubscription`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Erreur, réessayez.');
      }
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setBillingLoading(false);
    }
  };

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  const statusConfig = {
    active: { label: 'Actif ✓', cls: 'text-green-700 bg-green-50 border-green-200' },
    trial: { label: 'Essai gratuit', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    expired: { label: 'Expiré', cls: 'text-red-600 bg-red-50 border-red-200' },
    cancelled: { label: 'Annulé', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
    pending_payment: { label: 'Paiement en attente', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  };
  const sc = statusConfig[subscription?.status] || { label: 'Inactif', cls: 'text-gray-600 bg-gray-50 border-gray-200' };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="flex items-center gap-2 px-5 pt-6 mb-6">
        <BackButton fallback="/ProDashboard" />
        <h1 className="text-2xl font-bold">Mon abonnement</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* Success banner */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Abonnement activé avec succès !</p>
                <p className="text-xs text-green-700">Vous pouvez maintenant recevoir des missions ServiGo.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Iframe warning */}
        {isInIframe() && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Le paiement fonctionne uniquement depuis l'app publiée. Ouvrez ServiGo dans votre navigateur pour vous abonner.</p>
          </div>
        )}

        {/* === GESTION ABONNEMENT ACTIF === */}
        {isActive && subscription ? (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base">Abonnement Pro ServiGo</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
                  <p className="font-semibold text-sm">{subscription.plan === 'annual' ? 'Annuel' : 'Mensuel'}</p>
                  <p className="text-xs text-muted-foreground">{subscription.price || 10} €{subscription.plan === 'annual' ? '/an' : '/mois'}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Missions reçues</p>
                  <p className="font-semibold text-sm">{subscription.missions_received || 0}</p>
                  <p className="text-xs text-muted-foreground">depuis le début</p>
                </div>
              </div>
              {subscription.renewal_date && (
                <div className="flex items-center justify-between text-sm bg-muted/30 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /> Prochain renouvellement
                  </span>
                  <span className="font-semibold">{format(new Date(subscription.renewal_date), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
              {subscription.started_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Membre depuis</span>
                  <span className="font-medium">{format(new Date(subscription.started_date), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              )}
            </div>

            {/* Auto-renew toggle */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-sm">Renouvellement automatique</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {subscription.auto_renew
                      ? 'Activé — Ton abonnement se renouvelle automatiquement. Tu ne perdras jamais l\'accès aux missions.'
                      : `Désactivé — Tu devras renouveler manuellement avant le ${subscription.renewal_date || '—'}. Passé cette date, tu ne recevras plus de missions.`
                    }
                  </p>
                </div>
                <Switch
                  checked={!!subscription.auto_renew}
                  onCheckedChange={handleAutoRenewToggle}
                  disabled={updateSubMutation.isPending}
                />
              </div>
            </div>

            {/* Change plan (monthly → annual) */}
            {subscription.plan === 'monthly' && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Passez à l'annuel</p>
                  <p className="text-xs text-muted-foreground">Économisez 17% — 100 €/an au lieu de 120 €</p>
                </div>
                <Button size="sm" onClick={() => { setPlan('annual'); handleSubscribe(); }} disabled={loading}
                  className="rounded-xl shrink-0 bg-primary text-xs">
                  Changer →
                </Button>
              </div>
            )}
            {subscription.plan === 'annual' && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
                <p className="text-sm font-semibold text-green-800">✓ Plan annuel — meilleur tarif</p>
                <p className="text-xs text-green-700">Prochain renouvellement le {subscription.renewal_date || '—'}</p>
              </div>
            )}

            {/* Update payment method */}
            <Button variant="outline" onClick={handleOpenBillingPortal} disabled={billingLoading}
              className="w-full h-11 rounded-xl border-dashed">
              {billingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Mettre à jour ma carte de paiement
            </Button>

            {/* PaymentHistory section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" /> Historique des paiements
              </h3>
              {historyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-2">
                  {paymentHistory.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{(p.amount || 0).toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">
                          {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                          {p.invoice_ref ? ` · ${p.invoice_ref.slice(0, 12)}…` : ''}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'paid' ? 'bg-green-50 text-green-700' :
                        p.status === 'failed' ? 'bg-red-50 text-red-600' :
                        p.status === 'refunded' ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {p.status === 'paid' ? 'Payé' : p.status === 'failed' ? 'Échoué' : p.status === 'refunded' ? 'Remboursé' : p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun historique de paiement</p>
              )}
            </div>

            {/* Cancel */}
            <div className="pt-2">
              <button onClick={() => setShowCancelDialog(true)} className="w-full text-center text-xs text-muted-foreground hover:text-red-500 transition-colors py-2 underline underline-offset-2">
                Résilier mon abonnement
              </button>
            </div>
          </div>
        ) : (
          /* === PAGE SOUSCRIPTION === */
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Activez votre abonnement ServiGo</h2>
              <p className="text-sm text-muted-foreground mt-1">Choisissez votre plan et commencez à recevoir des missions</p>
            </div>

            {/* Plan selector */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPlan('monthly')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${plan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <p className="text-xs text-muted-foreground mb-1">Mensuel</p>
                <p className="text-2xl font-bold">10 €</p>
                <p className="text-xs text-muted-foreground">/mois</p>
                {plan === 'monthly' && <CheckCircle className="w-4 h-4 text-primary mt-2" />}
              </button>
              <button onClick={() => setPlan('annual')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${plan === 'annual' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-green-500 text-white rounded-full px-2 py-0.5">-17%</span>
                <p className="text-xs text-muted-foreground mb-1">Annuel</p>
                <p className="text-2xl font-bold">100 €</p>
                <p className="text-xs text-muted-foreground">/an · 8,33€/mois</p>
                {plan === 'annual' && <CheckCircle className="w-4 h-4 text-primary mt-2" />}
              </button>
            </div>

            {/* Benefits */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-sm">Ce qui est inclus :</h3>
              {BENEFITS.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button onClick={handleSubscribe} disabled={loading || isInIframe()}
              className="w-full h-14 rounded-2xl text-base font-bold">
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? 'Redirection vers Stripe...' : `Payer ${plan === 'annual' ? '100 €/an' : '10 €/mois'}`}
            </Button>

            {!isActive && subscription && (
              <button onClick={handleSubscribe} disabled={loading}
                className="w-full text-center text-sm font-semibold text-primary hover:underline py-2">
                Renouveler mon abonnement →
              </button>
            )}

            <p className="text-center text-xs text-muted-foreground">Sans engagement · Résiliable à tout moment · Paiement sécurisé Stripe</p>
          </div>
        )}
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier l'abonnement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Si tu résilie, tu gardes l'accès jusqu'au {subscription?.renewal_date || '—'} et tu ne seras plus débité. Après cette date, tu ne recevras plus de nouvelles missions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleCancelSubscription}>
              Oui, résilier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-renew disable dialog */}
      <AlertDialog open={showAutoRenewDialog} onOpenChange={setShowAutoRenewDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le renouvellement automatique ?</AlertDialogTitle>
            <AlertDialogDescription>
              En désactivant le renouvellement automatique, ton accès aux missions prendra fin le {subscription?.renewal_date || '—'}. Tu devras renouveler manuellement avant cette date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await updateSubMutation.mutateAsync({ auto_renew: false });
              setShowAutoRenewDialog(false);
              toast.success('Renouvellement automatique désactivé');
            }}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}