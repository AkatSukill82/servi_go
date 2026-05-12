import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import BceValidator from '@/components/bce/BceValidator';
import AvailabilityEditor from '@/components/pro/AvailabilityEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TOTAL_STEPS = 5;

function ProgressBar({ step }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Étape {step} sur {TOTAL_STEPS}</p>
        <p className="text-xs text-muted-foreground">{Math.round((step / TOTAL_STEPS) * 100)}%</p>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ProVerificationOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2
  const [categoryName, setCategoryName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [proDescription, setProDescription] = useState('');

  // Step 3
  const [bceNumber, setBceNumber] = useState('');

  // User data
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const saveStep1 = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Prénom et nom requis');
      return false;
    }
    setSaving(true);
    await base44.auth.updateMe({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      phone: phone.trim(),
    });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    return true;
  };

  const saveStep2 = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      category_name: categoryName,
      base_price: Number(basePrice) || null,
      hourly_rate: Number(hourlyRate) || null,
      pro_description: proDescription.trim(),
    });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    return true;
  };

  const saveStep3 = async () => {
    if (bceNumber) {
      setSaving(true);
      await base44.auth.updateMe({ bce_number: bceNumber });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSaving(false);
    }
    return true;
  };

  const startTrial = async () => {
    setSaving(true);
    const today = new Date();
    const trialEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await base44.entities.ProSubscription.create({
      professional_email: user.email,
      professional_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name,
      status: 'trial',
      plan: 'monthly',
      price: 10,
      trial_ends_date: trialEnd,
      started_date: today.toISOString().split('T')[0],
    });
    toast.success('Période d\'essai activée ! 🎉');
    navigate('/ProDashboard');
  };

  const handleNext = async () => {
    let ok = false;
    if (step === 1) ok = await saveStep1();
    else if (step === 2) ok = await saveStep2();
    else if (step === 3) ok = await saveStep3();
    else ok = true;
    if (ok) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep(s => s - 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 py-8">
      <div className="w-full md:max-w-lg mx-auto flex-1 flex flex-col">

        {/* Back button */}
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 -ml-1">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <ProgressBar step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-5">
              <div>
                <h1 className="text-2xl font-black">Informations de base</h1>
                <p className="text-sm text-muted-foreground mt-1">Dites-nous qui vous êtes</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prénom *</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+32 470 12 34 56" className="h-11 rounded-xl" />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-5">
              <div>
                <h1 className="text-2xl font-black">Votre métier</h1>
                <p className="text-sm text-muted-foreground mt-1">Décrivez votre activité professionnelle</p>
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie de service</Label>
                <Select value={categoryName} onValueChange={setCategoryName}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisissez votre métier" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prix de base €</Label>
                  <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="80" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Taux horaire €/h</Label>
                  <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="45" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description de vos services</Label>
                <Textarea value={proDescription} onChange={e => setProDescription(e.target.value)} placeholder="Décrivez vos compétences..." rows={3} className="rounded-xl resize-none" />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-5">
              <div>
                <h1 className="text-2xl font-black">Vérification BCE</h1>
                <p className="text-sm text-muted-foreground mt-1">Renseignez votre numéro d'entreprise belge</p>
              </div>
              <BceValidator value={bceNumber} onChange={setBceNumber} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-5">
              <div>
                <h1 className="text-2xl font-black">Disponibilités</h1>
                <p className="text-sm text-muted-foreground mt-1">Configurez vos horaires de travail</p>
              </div>
              {user && <AvailabilityEditor userEmail={user.email} />}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 space-y-5">
              <div>
                <h1 className="text-2xl font-black">Abonnement Pro</h1>
                <p className="text-sm text-muted-foreground mt-1">Choisissez comment démarrer</p>
              </div>
              <div className="space-y-3">
                {/* Monthly */}
                <button onClick={() => navigate('/ProSubscription?plan=monthly')} className="w-full bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Mensuel</p>
                      <p className="text-xs text-muted-foreground">10 € / mois · Sans engagement</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">10€</span>
                  </div>
                </button>
                {/* Annual */}
                <button onClick={() => navigate('/ProSubscription?plan=annual')} className="w-full bg-primary/5 rounded-2xl border border-primary/30 p-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Annuel</p>
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">-17%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">100 € / an · Économisez 20€</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">100€</span>
                  </div>
                </button>
              </div>
              {/* Trial */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-800">Essai gratuit 14 jours</p>
                </div>
                <p className="text-xs text-green-700">Aucune carte bancaire requise. Accès complet pendant 14 jours.</p>
                <Button onClick={startTrial} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Commencer en essai gratuit
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        <div className="pt-6 space-y-3">
          {step < 5 && (
            <Button onClick={handleNext} disabled={saving} className="w-full h-12 rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? 'Sauvegarde...' : 'Continuer'}
              {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
          {(step === 3 || step === 4) && (
            <button onClick={() => setStep(s => s + 1)} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2">
              Passer cette étape
            </button>
          )}
          {step === 5 && (
            <button onClick={() => navigate('/ProDashboard')} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2">
              Continuer sans abonnement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}