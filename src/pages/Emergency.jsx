import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Zap, AlertTriangle, ChevronRight, Phone, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const SOS_CATEGORIES = [
  { icon: '🔧', name: 'Plombier', desc: 'Fuite, inondation, canalisation' },
  { icon: '⚡', name: 'Électricien', desc: 'Panne, court-circuit, danger' },
  { icon: '🔑', name: 'Serrurier', desc: 'Porte claquée, serrure cassée' },
  { icon: '🔥', name: 'Chauffagiste', desc: 'Panne de chauffage, gaz' },
  { icon: '🏗️', name: 'Constructeur', desc: 'Dégât structurel urgent' },
];

const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '101' },
  { label: 'Pompiers', number: '100' },
  { label: 'SAMU', number: '112' },
];

export default function Emergency() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // select | confirm | success
  const [selectedCat, setSelectedCat] = useState(null);
  const [countdown, setCountdown] = useState(5);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const createSosMutation = useMutation({
    mutationFn: async () => {
      const cat = categories.find(c => c.name === selectedCat);
      if (!cat || !user) throw new Error('Catégorie ou utilisateur manquant');
      const availablePros = await base44.entities.User.filter(
        { user_type: 'professionnel', available: true, category_name: cat.name, verification_status: 'verified' },
        '-created_date', 1
      );
      if (availablePros.length === 0) {
        toast('Aucun professionnel disponible pour ce service en ce moment. Votre demande sera prise en charge dès qu\'un pro sera disponible.', { duration: 6000 });
      }
      const estimatedPrice = (cat.base_price || 50) * 1.5;
      const req = await base44.entities.ServiceRequestV2.create({
        category_id: cat.id,
        category_name: cat.name,
        customer_id: user.id,
        customer_name: user.full_name || user.email,
        customer_email: user.email,
        customer_phone: user.phone || '',
        customer_address: user.address || '',
        customer_latitude: user.latitude || null,
        customer_longitude: user.longitude || null,
        estimated_price: estimatedPrice,
        status: 'searching',
        is_urgent: true,
      });
      await base44.entities.Notification.create({
        recipient_email: user.email,
        recipient_type: 'particulier',
        type: 'new_mission',
        title: '🚨 Intervention SOS lancée',
        body: `Nous cherchons un ${cat.name} disponible pour vous. Vous recevrez une notification dès qu'un pro accepte.`,
        request_id: req.id,
        action_url: `/Chat?requestId=${req.id}`,
      });
      return req.id;
    },
    onSuccess: (requestId) => {
      setStep('success');
      setCountdown(5);
      toast.success('Demande SOS envoyée !');
    },
    onError: (err) => {
      toast.error('Erreur : ' + (err?.message || 'impossible de créer la demande'));
    },
  });

  const handleSelect = (catName) => {
    setSelectedCat(catName);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    await createSosMutation.mutateAsync();
  };

  useEffect(() => {
    if (step !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          navigate(`/Chat?requestId=${createSosMutation.data}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, createSosMutation.data, navigate]);

  return (
    <div
      className="bg-background px-4 pb-24 overflow-y-auto"
      style={{ minHeight: '100dvh', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
    >
      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Header SOS */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Intervention urgente</h1>
                <p className="text-xs text-muted-foreground">Un pro disponible en moins de 30 min</p>
              </div>
            </div>

            {/* Surcharge badge */}
            <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-destructive">Surcharge urgence +50%</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Le tarif inclut une majoration urgence pour mobiliser un professionnel immédiatement.
                </p>
              </div>
            </div>

            {/* ETA */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
              <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              <p className="text-sm text-muted-foreground">Délai d'intervention estimé : <span className="font-semibold text-foreground">20 – 40 min</span></p>
            </div>

            {/* Category list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Quel type d'urgence ?
              </p>
              {SOS_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleSelect(cat.name)}
                  className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-4 active:scale-[0.98] transition-transform hover:border-destructive/40"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.8} />
                </button>
              ))}
            </div>

            {/* Emergency numbers */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Appels d'urgence</p>
              <div className="grid grid-cols-3 gap-2">
                {EMERGENCY_NUMBERS.map(em => (
                  <a
                    key={em.number}
                    href={`tel:${em.number}`}
                    className="flex flex-col items-center gap-2 p-3 bg-card rounded-xl border border-border active:scale-95 transition-transform"
                  >
                    <Phone className="w-4 h-4 text-destructive" strokeWidth={2} />
                    <span className="text-xs font-bold">{em.label}</span>
                    <span className="text-sm font-mono font-bold text-foreground">{em.number}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-yellow-800 font-medium">
                ⚠️ ServiGo SOS est réservé aux urgences <strong>non-vitales</strong>. Pour toute urgence médicale ou incendie, appelez le <strong>112</strong>.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-2"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <Zap className="w-10 h-10 text-destructive" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Intervention SOS</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {selectedCat} · Surcharge urgence <span className="font-bold text-destructive">+50%</span> appliquée
              </p>
            </div>
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 w-full text-left space-y-1.5">
              <p className="text-sm font-semibold">Ce que vous obtenez :</p>
              <p className="text-xs text-muted-foreground">✅ Professionnel mobilisé en priorité absolue</p>
              <p className="text-xs text-muted-foreground">✅ Arrivée estimée en 20–40 min</p>
              <p className="text-xs text-muted-foreground">⚠️ Tarif majoré de 50% (urgence)</p>
            </div>
            <div className="w-full space-y-3 pt-2">
              <button
                onClick={handleConfirm}
                disabled={createSosMutation.isPending}
                className="w-full bg-destructive text-white font-bold rounded-2xl py-4 text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-5 h-5" strokeWidth={2.5} />
                {createSosMutation.isPending ? 'Création...' : 'Confirmer l\'intervention SOS'}
              </button>
              <button
                onClick={() => setStep('select')}
                disabled={createSosMutation.isPending}
                className="w-full text-sm text-muted-foreground underline underline-offset-2 disabled:opacity-50"
              >
                Retour
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-2"
          >
            <motion.div
              className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <CheckCircle className="w-12 h-12 text-green-600" strokeWidth={1.5} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-green-700">Demande SOS envoyée !</h2>
              <p className="text-muted-foreground mt-2 text-sm">Nous cherchons un pro disponible pour vous.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 w-full">
              <p className="text-sm font-semibold text-green-700 mb-2">Étapes suivantes :</p>
              <ul className="text-xs text-green-700 space-y-1 text-left">
                <li>✅ Acceptation par un professionnel</li>
                <li>✅ Signature du contrat en ligne</li>
                <li>✅ Intervention à domicile</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">Redirection en <span className="font-bold text-foreground">{countdown}s</span>...</p>
            <button
              onClick={() => navigate('/Home')}
              className="w-full px-6 py-3 rounded-xl border border-border text-sm font-medium"
            >
              Retour à l'accueil
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}