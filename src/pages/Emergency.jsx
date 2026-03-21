import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, ChevronRight, Phone, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SOS_CATEGORIES = [
  { icon: '🔧', name: 'Plombier', desc: 'Fuite, inondation, canalisation' },
  { icon: '⚡', name: 'Électricien', desc: 'Panne, court-circuit, danger' },
  { icon: '🔑', name: 'Serrurier', desc: 'Porte claquée, serrure cassée' },
  { icon: '🔥', name: 'Chauffagiste', desc: 'Panne de chauffage, gaz' },
  { icon: '🏗️', name: 'Constructeur', desc: 'Dégât structurel urgent' },
];

export default function Emergency() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // select | confirm
  const [selectedCat, setSelectedCat] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const handleSelect = (catName) => {
    setSelectedCat(catName);
    setStep('confirm');
  };

  const handleConfirm = () => {
    const cat = categories.find(c => c.name === selectedCat);
    if (cat) {
      navigate(`/ServiceRequest?categoryId=${cat.id}&urgent=true`);
    }
  };

  return (
    <div
      className="min-h-screen bg-background px-4 pb-24"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
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

            {/* 112 link */}
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium"
            >
              <Phone className="w-4 h-4" strokeWidth={2} />
              Danger réel → Appeler le 112
            </a>
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
                className="w-full bg-destructive text-white font-bold rounded-2xl py-4 text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" strokeWidth={2.5} />
                Confirmer l'intervention SOS
              </button>
              <button
                onClick={() => setStep('select')}
                className="w-full text-sm text-muted-foreground underline underline-offset-2"
              >
                Retour
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}