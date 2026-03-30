import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, CreditCard, Calendar, Shield, Zap, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import BackButton from '@/components/ui/BackButton';

export default function ProSubscription() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get('success') === 'true';

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: subscription, refetch } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () => base44.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const handleSubscribe = async () => {
    if (window.self !== window.top) {
      toast.error('Le paiement fonctionne uniquement depuis l\'application publiée.');
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke('createProSubscription', {
      successUrl: `${window.location.origin}/ProSubscription?success=true`,
      cancelUrl: `${window.location.origin}/ProSubscription`,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error('Erreur lors de la création de l\'abonnement.');
      setLoading(false);
    }
  };

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  const statusConfig = {
    active: { label: 'Actif ✓', cls: 'text-brand-green bg-green-50 border-green-200' },
    trial: { label: 'Essai gratuit', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
    expired: { label: 'Expiré', cls: 'text-red-600 bg-red-50 border-red-200' },
    cancelled: { label: 'Annulé', cls: 'text-gray-600 bg-gray-50 border-gray-200' },
    pending_payment: { label: 'Paiement en attente', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  };
  const sc = statusConfig[subscription?.status] || { label: 'Inactif', cls: 'text-gray-600 bg-gray-50 border-gray-200' };

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-10">
      <div className="flex items-center gap-2 mb-6">
        <BackButton fallback="/ProDashboard" />
        <h1 className="text-2xl font-bold">Mon abonnement</h1>
      </div>

      {isSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-brand-green shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Abonnement activé !</p>
            <p className="text-xs text-green-700">Vous pouvez maintenant recevoir des missions ServiGo.</p>
          </div>
        </motion.div>
      )}

      {subscription ? (
        <div className="bg-card rounded-2xl border border-border p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Abonnement Pro ServiGo</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{subscription.plan === 'annual' ? 'Annuel' : 'Mensuel'} — {subscription.price || 10} €/mois</span>
            </div>
            {subscription.renewal_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Renouvellement</span>
                <span className="font-medium">{format(new Date(subscription.renewal_date), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
            )}
            {subscription.started_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membre depuis</span>
                <span className="font-medium">{format(new Date(subscription.started_date), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Missions reçues</span>
              <span className="font-medium">{subscription.missions_received || 0}</span>
            </div>
          </div>
          {!isActive && (
            <Button onClick={handleSubscribe} disabled={loading} className="w-full h-12 rounded-xl font-semibold">
              <CreditCard className="w-4 h-4 mr-2" />
              {loading ? 'Redirection...' : 'Renouveler mon abonnement'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-lg text-primary">Accédez aux missions ServiGo</h2>
            <p className="text-sm text-muted-foreground">Pour recevoir des demandes de clients, un abonnement mensuel de 10 €/mois est requis.</p>
            {[
              { icon: <Zap className="w-4 h-4 text-primary" />, text: 'Missions en temps réel selon votre catégorie' },
              { icon: <Shield className="w-4 h-4 text-primary" />, text: 'Badge Pro Vérifié ✓ visible par les clients' },
              { icon: <Calendar className="w-4 h-4 text-primary" />, text: 'Gestion des disponibilités hebdomadaires' },
              { icon: <CheckCircle className="w-4 h-4 text-primary" />, text: 'Contrats de mission électroniques sécurisés' },
              ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-2xl border-2 border-primary p-6 text-center space-y-3">
            <p className="text-4xl font-bold text-primary">10 €<span className="text-base font-normal text-muted-foreground">/mois</span></p>
            <p className="text-sm text-muted-foreground">Sans engagement — résiliable à tout moment</p>
            <Button onClick={handleSubscribe} disabled={loading} className="w-full h-14 rounded-xl text-base font-bold">
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? 'Redirection Stripe...' : "S'abonner maintenant"}
            </Button>
          </div>
        </div>
      )}

      {subscription?.payment_history?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 mt-4">
          <h3 className="font-semibold mb-3">Historique des paiements</h3>
          <div className="space-y-2">
            {subscription.payment_history.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.date}</span>
                <span className={p.status === 'paid' ? 'text-brand-green font-medium' : 'text-destructive'}>{p.amount} € — {p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}