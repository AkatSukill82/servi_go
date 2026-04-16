import React, { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, CheckCircle, Clock, MessageCircle, CalendarDays } from 'lucide-react';
import SlotPicker from '@/components/request/SlotPicker';
import BackButton from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import QuestionStep from '@/components/request/QuestionStep';
import { motion, AnimatePresence } from 'framer-motion';
import MissionProgress from '@/components/mission/MissionProgress';

const STEPS = { ADDRESS: 'address', QUESTIONS: 'questions', SLOT: 'slot', SEARCHING: 'searching', CONFIRMED: 'confirmed' };

export default function ServiceRequest() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('categoryId');
  const isUrgent = urlParams.get('urgent') === 'true';
  const priorityProId = urlParams.get('priorityProId');
  const priorityProEmail = urlParams.get('priorityProEmail');
  const prefilledCategoryName = urlParams.get('category_name');

  const [step, setStep] = useState(STEPS.ADDRESS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [address, setAddress] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [preselectedPro, setPreselectedPro] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  useEffect(() => {
    if (user?.address && !address) setAddress(user.address);
  }, [user?.address]);

  // Load preselected pro if priorityProId or priorityProEmail is in URL
  useEffect(() => {
    if (!priorityProId && !priorityProEmail) return;
    const query = priorityProId ? { id: priorityProId } : { email: priorityProEmail };
    base44.entities.User.filter(query, '-created_date', 1)
      .then(users => { if (users[0]) setPreselectedPro(users[0]); })
      .catch(() => {});
  }, [priorityProId, priorityProEmail]);

  const { data: category, isLoading: loadingCategory } = useQuery({
    queryKey: ['category', categoryId, prefilledCategoryName],
    queryFn: async () => {
      if (categoryId) {
        const cats = await base44.entities.ServiceCategory.filter({ id: categoryId });
        return cats[0];
      }
      if (prefilledCategoryName) {
        const cats = await base44.entities.ServiceCategory.filter({ name: prefilledCategoryName });
        return cats[0];
      }
      return null;
    },
    enabled: !!(categoryId || prefilledCategoryName),
  });

  const questions = category?.questions || [];
  const totalQuestions = questions.length;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequestV2.create(data),
  });

  // Bloc eID
  if (user && user.eid_status !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"><span className="text-4xl">🪪</span></div>
        <h2 className="text-xl font-bold">Vérification d'identité requise</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Pour faire une demande de service, vérifiez d'abord votre identité avec votre carte eID.</p>
        <Button onClick={() => navigate('/EidVerification')} className="w-full h-14 rounded-xl text-base">Vérifier mon identité</Button>
        <Button variant="ghost" onClick={() => navigate('/Home')} className="w-full h-12 rounded-xl">Retour</Button>
      </div>
    );
  }

  if (loadingCategory) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!category && (categoryId || prefilledCategoryName)) return <div className="px-4 pt-6 text-center"><p className="text-muted-foreground">Service non trouvé</p><Button variant="outline" onClick={() => navigate('/Home')} className="mt-4">Retour</Button></div>;
  if (!category) return <div className="px-4 pt-6 text-center"><p className="text-muted-foreground">Aucun service sélectionné</p><Button variant="outline" onClick={() => navigate('/Home')} className="mt-4">Retour</Button></div>;

  const handleAddressNext = () => {
    if (!address.trim()) return;
    if (totalQuestions > 0) setStep(STEPS.QUESTIONS);
    else setStep(STEPS.SLOT);
  };

  const handleQuestionNext = () => {
    if (questionIndex < totalQuestions - 1) setQuestionIndex(questionIndex + 1);
    else setStep(STEPS.SLOT);
  };

  const handleConfirm = async () => {
    setStep(STEPS.SEARCHING);
    const answersArray = questions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }));
    const basePrice = isUrgent ? (category?.base_price || 80) * 1.5 : (category?.base_price || 80);
    const firstName = user?.first_name || user?.full_name?.split(' ')[0] || '';
    const lastName = user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || '';

    const newRequest = await createMutation.mutateAsync({
      category_id: category?.id || categoryId,
      category_name: category?.name,
      // Pre-fill pro if selected from profile
      ...(preselectedPro ? {
        professional_id: preselectedPro.id,
        professional_name: preselectedPro.full_name || `${preselectedPro.first_name || ''} ${preselectedPro.last_name || ''}`.trim(),
        professional_email: preselectedPro.email,
        status: 'pending_pro',
      } : {}),
      answers: answersArray,
      customer_id: user?.id,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_name: user?.full_name || '',
      customer_email: user?.email || '',
      customer_phone: user?.phone || '',
      customer_address: address,
      customer_latitude: user?.latitude || 50.8503,
      customer_longitude: user?.longitude || 4.3517,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      status: 'searching',
      is_urgent: isUrgent,
      estimated_price: basePrice,
      tried_professionals: [],
    });

    setRequestId(newRequest.id);

    // Notify matching pros individually
    const matchingPros = await base44.entities.User.filter({
      user_type: 'professionnel',
      category_name: category.name,
      available: true,
      verification_status: 'verified',
    }, '-created_date', 100).catch(() => []);
    await Promise.all(matchingPros.map(pro =>
      base44.entities.Notification.create({
        recipient_email: pro.email,
        recipient_type: 'professionnel',
        type: 'new_mission',
        title: `Nouvelle mission : ${category.name}`,
        body: `${address} · ${scheduledDate ? `Le ${scheduledDate}` : 'Dès que possible'}`,
        request_id: newRequest.id,
        action_url: '/ProDashboard',
      }).catch(() => {})
    ));

    setStep(STEPS.CONFIRMED);
  };

  const handleBack = () => {
    if (step === STEPS.QUESTIONS && questionIndex > 0) setQuestionIndex(questionIndex - 1);
    else if (step === STEPS.QUESTIONS) setStep(STEPS.ADDRESS);
    else if (step === STEPS.SLOT) totalQuestions > 0 ? setStep(STEPS.QUESTIONS) : setStep(STEPS.ADDRESS);
    else if (step === STEPS.ADDRESS) navigate('/Home');
    else navigate('/Home');
  };

  const stepLabel = {
    [STEPS.ADDRESS]: 'Votre adresse',
    [STEPS.QUESTIONS]: `Question ${questionIndex + 1} / ${totalQuestions}`,
    [STEPS.SLOT]: 'Date souhaitée',
    [STEPS.SEARCHING]: 'Envoi en cours...',
    [STEPS.CONFIRMED]: 'Demande envoyée !',
  };

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        {step !== STEPS.SEARCHING && step !== STEPS.CONFIRMED && (
          <BackButton fallback="/Home" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{category.name}</h1>
            {isUrgent && <span className="text-xs font-bold bg-destructive text-white rounded-full px-2.5 py-0.5">⚡ SOS</span>}
          </div>
          <p className="text-sm text-muted-foreground">{stepLabel[step]}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ADDRESS */}
        {step === STEPS.ADDRESS && (
          <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="space-y-2">
              <Label>Adresse d'intervention</Label>
              {user?.address && !addressConfirmed ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">Adresse enregistrée</p>
                      <p className="text-sm font-medium">{user.address}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">L'intervention aura-t-elle lieu à cette adresse ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setAddressConfirmed(true)} className="h-12 rounded-xl">Non, changer</Button>
                    <Button onClick={handleAddressNext} className="h-12 rounded-xl">Oui, confirmer</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Rue de la Loi 16, 1000 Bruxelles" className="h-12 rounded-xl" />
                  <Button onClick={handleAddressNext} disabled={!address.trim()} className="w-full h-14 rounded-xl text-base">Continuer <ChevronRight className="w-5 h-5 ml-2" /></Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* QUESTIONS */}
        {step === STEPS.QUESTIONS && (
          <motion.div key={`q-${questionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex gap-1 mb-4">
              {questions.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i <= questionIndex ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
            <QuestionStep
              question={questions[questionIndex]}
              answer={answers[questionIndex]}
              onChange={val => setAnswers({ ...answers, [questionIndex]: val })}
            />
            <Button onClick={handleQuestionNext} disabled={!answers[questionIndex]} className="w-full h-14 rounded-xl text-base">
              {questionIndex < totalQuestions - 1 ? 'Suivant' : 'Choisir une date'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* SLOT */}
        {step === STEPS.SLOT && (
          <motion.div key="slot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <SlotPicker
              proSlots={[]}
              selectedDate={scheduledDate}
              selectedTime={scheduledTime}
              onDateChange={setScheduledDate}
              onTimeChange={setScheduledTime}
            />
            {preselectedPro && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-xs font-semibold text-green-800">Professionnel pré-sélectionné</p>
                  <p className="text-xs text-green-700">{preselectedPro.full_name || preselectedPro.email} — {preselectedPro.category_name}</p>
                </div>
              </div>
            )}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-primary">📋 Récapitulatif</p>
              <p className="text-sm text-muted-foreground mt-1">{category.name} · {address}</p>
              {scheduledDate && <p className="text-sm text-muted-foreground">📅 {scheduledDate}{scheduledTime ? ` à ${scheduledTime}` : ''}</p>}
              <p className="text-xs text-muted-foreground mt-2">💡 Le règlement se fait directement avec le professionnel</p>
            </div>
            <Button onClick={handleConfirm} disabled={createMutation.isPending} className="w-full h-14 rounded-xl text-base font-bold">
              <CalendarDays className="w-5 h-5 mr-2" /> Envoyer ma demande
            </Button>
            <button onClick={handleConfirm} disabled={createMutation.isPending} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2">
              Envoyer sans date précise
            </button>
          </motion.div>
        )}

        {/* SEARCHING */}
        {step === STEPS.SEARCHING && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Search className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="font-semibold text-lg">Recherche de professionnels...</h2>
            <p className="text-sm text-muted-foreground">Nous contactons les professionnels de {category.name} disponibles</p>
            <div className="flex justify-center gap-1 mt-4">
              {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </motion.div>
        )}

        {/* CONFIRMED */}
        {step === STEPS.CONFIRMED && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Clock className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold">Demande envoyée !</h2>
              <p className="text-muted-foreground text-sm">Votre demande est visible par tous les {category.name}s disponibles. Le premier à accepter vous contactera.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Suivi de votre mission</p>
              <MissionProgress status="searching" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-blue-800">💡 Comment ça se passe ?</p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1.5">
                <li>1. Un professionnel accepte votre demande</li>
                <li>2. Un contrat de mission est créé et signé électroniquement</li>
                <li>3. Le professionnel se déplace et réalise le travail</li>
                <li>4. Le règlement se fait directement avec le professionnel</li>
              </ul>
            </div>

            <div className="space-y-3">
              {requestId && (
                <Button onClick={() => navigate(`/Chat?requestId=${requestId}`)} variant="outline" className="w-full h-12 rounded-xl border-primary text-primary">
                  <MessageCircle className="w-4 h-4 mr-2" /> Accéder au chat de la mission
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/Home')} className="w-full h-12 rounded-xl">
                Retour à l'accueil
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}