import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle, CreditCard, Calendar, Shield, Zap,
  RefreshCw, Receipt, Loader2, RotateCcw, ChevronRight,
  Briefcase, MessageCircle, Star,
} from 'lucide-react';
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
import { useAppleIAP } from '@/hooks/useAppleIAP';
import { isIOSNow } from '@/lib/platform';
import { BRAND } from '@/lib/theme';

const BENEFITS = [
  { icon: Zap,            text: 'Missions en temps réel dans votre catégorie' },
  { icon: Briefcase,      text: 'Contrats de mission électroniques inclus' },
  { icon: Shield,         text: 'Badge Pro Vérifié visible par tous les clients' },
  { icon: Calendar,       text: 'Agenda & disponibilités hebdomadaires' },
  { icon: MessageCircle,  text: 'Chat direct avec vos clients' },
  { icon: Star,           text: 'Profil mis en avant dans les résultats' },
];

export default function ProSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState('monthly');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAutoRenewDialog, setShowAutoRenewDialog] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const isSuccess = new URLSearchParams(window.location.search).get('success') === 'true';

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: subscription } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () =>
      base44.entities.ProSubscription
        .filter({ professional_email: user.email }, '-created_date', 1)
        .then((r) => r[0] || null),
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

  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['paymentHistory', user?.email],
    queryFn: () =>
      base44.entities.PaymentHistory.filter({ professional_email: user.email }, '-created_date', 24),
    enabled: !!user?.email && !!subscription,
    staleTime: 60000,
  });

  const { isNative, purchasing, restoring, purchase, restorePurchases, getProductInfo, storeReady } = useAppleIAP(user);

  const monthlyInfo = getProductInfo('monthly');
  const yearlyInfo  = getProductInfo('yearly');
  const monthlyPrice = monthlyInfo?.price || '9,99 €';
  const yearlyPrice  = yearlyInfo?.price  || '90,00 €';

  const handleSubscribe = async (overridePlan) => {
    const activePlan = overridePlan || plan;
    if (isIOSNow()) {
      await purchase(activePlan);
      return;
    }
    setBillingLoading(true);
    try {
      const res = await base44.functions.invoke('createProSubscription', {
        plan: activePlan,
        successUrl: `${window.location.origin}/ProSubscription?success=true&plan=${activePlan}`,
        cancelUrl:  `${window.location.origin}/ProSubscription`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Erreur. Réessayez.');
      }
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    await updateSubMutation.mutateAsync({ status: 'cancelled', auto_renew: false });
    setShowCancelDialog(false);
  };

  const handleOpenBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const res = await base44.functions.invoke('createBillingPortal', {
        returnUrl: `${window.location.origin}/ProSubscription`,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else toast.error(res.data?.error || 'Erreur, réessayez.');
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setBillingLoading(false);
    }
  };

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  const STATUS = {
    active:          { label: 'Actif',              color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    trial:           { label: 'Essai gratuit',       color: 'text-blue-700 bg-blue-50 border-blue-200' },
    expired:         { label: 'Expiré',              color: 'text-red-600 bg-red-50 border-red-200' },
    cancelled:       { label: 'Annulé',              color: 'text-gray-600 bg-gray-50 border-gray-200' },
    pending_payment: { label: 'Paiement en attente', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  };
  const sc = STATUS[subscription?.status] || { label: 'Inactif', color: 'text-gray-600 bg-gray-50 border-gray-200' };

  const isBusy = purchasing || billingLoading;
  const onIOS = isIOSNow();
  const ctaDisabled = isBusy || (onIOS && !storeReady);

  const ctaLabel = isBusy
    ? 'Traitement…'
    : plan === 'annual'
      ? `Commencer pour ${yearlyPrice}/an`
      : `Commencer pour ${monthlyPrice}/mois`;

  // ─── Abonnement actif ──────────────────────────────────────────────────────
  if (isActive && subscription) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white border-b border-gray-100">
          <BackButton fallback="/ProDashboard" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mon abonnement</h1>
            <p className="text-xs text-muted-foreground">ServiGo Pro</p>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Hero card actif */}
          <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)`, boxShadow: '0 8px 24px rgba(108,92,231,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Plan {subscription.plan === 'annual' ? 'Annuel' : 'Mensuel'}</p>
                <p className="text-2xl font-black mt-0.5">ServiGo Pro</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${sc.color}`}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-6 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-wide">Prix</p>
                <p className="text-white font-bold text-sm mt-0.5">
                  {subscription.price || (subscription.plan === 'annual' ? '90' : '9,99')} €/{subscription.plan === 'annual' ? 'an' : 'mois'}
                </p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-wide">Missions reçues</p>
                <p className="text-white font-bold text-sm mt-0.5">{subscription.missions_received || 0}</p>
              </div>
              {subscription.renewal_date && (
                <>
                  <div className="w-px h-8 bg-white/20" />
                  <div>
                    <p className="text-white/60 text-[10px] uppercase tracking-wide">Renouvellement</p>
                    <p className="text-white font-bold text-sm mt-0.5">
                      {format(new Date(subscription.renewal_date), 'dd MMM yy', { locale: fr })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Renouvellement auto */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${BRAND}12` }}>
                  <RefreshCw className="w-4 h-4" style={{ color: BRAND }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Renouvellement automatique</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {subscription.auto_renew ? 'Activé' : `Désactivé — expire le ${subscription.renewal_date || '—'}`}
                  </p>
                </div>
              </div>
              <Switch
                checked={!!subscription.auto_renew}
                onCheckedChange={(v) => v ? updateSubMutation.mutateAsync({ auto_renew: true }) : setShowAutoRenewDialog(true)}
                disabled={updateSubMutation.isPending}
              />
            </div>
          </div>

          {/* Upgrade vers annuel */}
          {subscription.plan === 'monthly' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-amber-900">🎯 Passez à l'annuel</p>
                <p className="text-xs text-amber-700 mt-0.5">Économisez 30 € — seulement {yearlyPrice}/an</p>
              </div>
              <button onClick={() => handleSubscribe('annual')}
                disabled={purchasing}
                className="rounded-xl shrink-0 text-xs font-semibold text-white px-3 py-1.5 tap-scale disabled:opacity-60"
                style={{ background: '#D97706' }}>
                Changer →
              </button>
            </div>
          )}

          {/* Actions */}
          {!onIOS && (
            <Button variant="outline" onClick={handleOpenBillingPortal} disabled={billingLoading}
              className="w-full h-11 rounded-xl">
              {billingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Gérer le paiement
            </Button>
          )}
          {onIOS && (
            <Button variant="outline" onClick={restorePurchases} disabled={restoring} className="w-full h-11 rounded-xl">
              {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Restaurer mes achats
            </Button>
          )}

          {/* Historique */}
          {(historyLoading || paymentHistory.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" /> Historique des paiements
              </h3>
              {historyLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {paymentHistory.map((ph) => (
                    <div key={ph.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{(ph.amount || 0).toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">
                          {ph.payment_date ? format(new Date(ph.payment_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                        ph.status === 'paid'     ? 'bg-emerald-50 text-emerald-700' :
                        ph.status === 'failed'   ? 'bg-red-50 text-red-600'       :
                        ph.status === 'refunded' ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {ph.status === 'paid' ? 'Payé' : ph.status === 'failed' ? 'Échoué' : ph.status === 'refunded' ? 'Remboursé' : ph.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Résilier */}
          <button onClick={() => setShowCancelDialog(true)}
            className="w-full text-center text-xs text-muted-foreground hover:text-red-500 transition-colors py-3 underline underline-offset-2">
            Résilier mon abonnement
          </button>
        </div>

        {/* Dialogs */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Résilier l'abonnement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous conservez l'accès jusqu'au {subscription?.renewal_date || '—'}, puis vous ne recevrez plus de nouvelles missions.
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

        <AlertDialog open={showAutoRenewDialog} onOpenChange={setShowAutoRenewDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Désactiver le renouvellement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Votre accès aux missions prendra fin le {subscription?.renewal_date || '—'}. Vous devrez renouveler manuellement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                await updateSubMutation.mutateAsync({ auto_renew: false });
                setShowAutoRenewDialog(false);
              }}>
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Page d'abonnement (non abonné) ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Header gradient */}
      <div className="relative px-5 pt-12 pb-10 overflow-hidden"
        style={{ background: `linear-gradient(160deg, #1a0533 0%, ${BRAND} 60%, #a78bfa 100%)` }}>
        <div className="absolute top-5 left-5">
          <BackButton fallback="/ProDashboard" iconColor="white" />
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
              <p className="text-sm text-white font-medium">Abonnement activé avec succès !</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-2">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ServiGo Pro</h1>
          <p className="text-white/70 text-sm mt-2 max-w-xs mx-auto">
            Recevez des missions locales et développez votre activité
          </p>
        </div>

        {/* iOS : store loading */}
        {onIOS && !storeReady && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-white/70 animate-spin shrink-0" />
            <p className="text-xs text-white/70">Connexion à l'App Store…</p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-5">

        {/* Plan selector */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Toggle mensuel / annuel */}
          <div className="flex border-b border-gray-100">
            {[
              { key: 'monthly', label: 'Mensuel', price: monthlyPrice, sub: '/mois', badge: null },
              { key: 'annual',  label: 'Annuel',  price: yearlyPrice,  sub: '/an',   badge: '−25%' },
            ].map(({ key, label, price, sub, badge }) => (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className="flex-1 py-5 px-4 text-center transition-all relative"
                style={{
                  background: plan === key ? `${BRAND}08` : 'white',
                  borderBottom: plan === key ? `2px solid ${BRAND}` : '2px solid transparent',
                }}
              >
                {badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-black bg-emerald-500 text-white rounded-full px-2 py-0.5">
                    {badge}
                  </span>
                )}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-black" style={{ color: plan === key ? BRAND : '#1a1a2e' }}>{price}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
                {plan === key && (
                  <CheckCircle className="w-4 h-4 mx-auto mt-2" style={{ color: BRAND }} />
                )}
              </button>
            ))}
          </div>

          {/* Économie annuelle */}
          {plan === 'annual' && (
            <div className="bg-emerald-50 px-4 py-2.5 text-center">
              <p className="text-xs font-semibold text-emerald-700">
                💡 Vous économisez 29,88 € par rapport à l'abonnement mensuel
              </p>
            </div>
          )}
        </div>

        {/* Avantages */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-4">Tout ce qui est inclus</p>
          <div className="space-y-3.5">
            {BENEFITS.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${BRAND}10` }}>
                  <Icon className="w-4 h-4" style={{ color: BRAND }} strokeWidth={1.8} />
                </div>
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={handleSubscribe}
            disabled={ctaDisabled}
            className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)`, border: 'none' }}
          >
            {isBusy
              ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              : <ChevronRight className="w-5 h-5 mr-2" />
            }
            {ctaLabel}
          </Button>

          {onIOS && (
            <button onClick={restorePurchases} disabled={restoring}
              className="w-full text-center text-sm font-medium py-2 flex items-center justify-center gap-2"
              style={{ color: BRAND }}>
              {restoring && <Loader2 className="w-3 h-3 animate-spin" />}
              Restaurer mes achats
            </button>
          )}

          {!isActive && subscription && (
            <button onClick={handleSubscribe} disabled={isBusy}
              className="w-full text-center text-sm font-semibold py-2"
              style={{ color: BRAND }}>
              Renouveler mon abonnement →
            </button>
          )}
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-6 py-2">
          {[
            { icon: Shield,   label: 'Sans engagement' },
            { icon: RefreshCw, label: 'Résiliable' },
            { icon: CreditCard, label: onIOS ? 'Apple Pay' : 'Stripe sécurisé' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground text-center">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground px-4 leading-relaxed">
          {onIOS
            ? 'Le paiement est géré par Apple. Gérez vos abonnements dans Réglages › Apple ID › Abonnements.'
            : 'Paiement sécurisé par Stripe. Vous pouvez résilier à tout moment depuis votre espace Pro.'
          }
        </p>
      </div>
    </div>
  );
}
