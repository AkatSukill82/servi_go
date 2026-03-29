import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, CheckCircle, Clock, Navigation, MessageCircle, CalendarDays } from 'lucide-react';
import SlotPicker from '@/components/request/SlotPicker';
import { useNotifications } from '@/hooks/useNotifications';
import BackButton from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import QuestionStep from '@/components/request/QuestionStep';
import PriceQuote from '@/components/request/PriceQuote';
import PhotoAnalysisStep from '@/components/request/PhotoAnalysisStep';
import ProSelectionList from '@/components/request/ProSelectionList';
import { motion, AnimatePresence } from 'framer-motion';

// Find the closest available professional using Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Normalize a User record: fields may be at root level or inside .data
function normalizePro(p) {
  return {
    ...p,
    user_type: p.user_type || p.data?.user_type,
    available: p.available !== undefined ? p.available : p.data?.available,
    category_name: p.category_name || p.data?.category_name,
    base_price: p.base_price || p.data?.base_price,
    latitude: p.latitude || p.data?.latitude,
    longitude: p.longitude || p.data?.longitude,
    account_deleted: p.account_deleted || p.data?.account_deleted,
  };
}

const RADIUS_PRIMARY_KM = 15;
const RADIUS_FALLBACK_KM = 40;

function findClosestPro(professionals, customerLat, customerLon, excludeIds = []) {
  const normalized = professionals.map(normalizePro);
  const available = normalized.filter(p =>
    p.available === true &&
    p.user_type === 'professionnel' &&
    !p.account_deleted &&
    !excludeIds.includes(p.id)
  );
  if (!available.length) return null;

  // Attache la distance à chaque pro pour pouvoir filtrer et trier
  const withDist = available.map(p => ({
    ...p,
    _dist: (p.latitude && p.longitude)
      ? getDistance(customerLat, customerLon, p.latitude, p.longitude)
      : 9999,
  }));

  // 1ᵉʳ essai : pros dans le rayon primaire (15km)
  const nearby = withDist.filter(p => p._dist <= RADIUS_PRIMARY_KM);
  if (nearby.length > 0) return nearby.sort((a, b) => a._dist - b._dist)[0];

  // 2ᵉʳ essai : fallback rayon étendu (40km)
  const extended = withDist.filter(p => p._dist <= RADIUS_FALLBACK_KM);
  if (extended.length > 0) return extended.sort((a, b) => a._dist - b._dist)[0];

  // Dernier recours : le plus proche peu importe la distance
  return withDist.sort((a, b) => a._dist - b._dist)[0];
}

const STEPS = {
  ADDRESS: 'address',
  QUESTIONS: 'questions',
  PHOTO: 'photo',
  PRO_SELECT: 'pro_select',
  SLOT: 'slot',
  SEARCHING: 'searching',
  QUOTE: 'quote',
  CONFIRMED: 'confirmed',
};

export default function ServiceRequest() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('categoryId');
  const priorityProId = urlParams.get('priorityProId');
  const isUrgent = urlParams.get('urgent') === 'true';
  const URGENCY_SURCHARGE = 0.5; // +50%

  const [step, setStep] = useState(STEPS.ADDRESS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [address, setAddress] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [assignedPro, setAssignedPro] = useState(null);
  const [aiResult, setAiResult] = useState(null); // résultat analyse IA photo
  const [allPros, setAllPros] = useState([]); // liste des pros chargée 1 seule fois
  const { requestPermission, notify } = useNotifications();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    onSuccess: (u) => {
      if (u?.address && !address) {
        setAddress(u.address);
      }
    },
  });

  // Pre-fill address from user profile when loaded
  React.useEffect(() => {
    if (user?.address && !address) {
      setAddress(user.address);
    }
  }, [user?.address]);

  const { data: category, isLoading: loadingCategory } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const categories = await base44.entities.ServiceCategory.filter({ id: categoryId });
      return categories[0];
    },
    enabled: !!categoryId,
  });

  // Fetch pros via backend function (bypass RLS sur User)
  const fetchFreshPros = () => base44.functions.invoke('getProfessionals', {})
    .then(res => res.data?.professionals || []);

  const questions = category?.questions || [];
  const totalQuestions = questions.length;

  // Poll the request status when searching
  const { data: currentRequest } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => base44.entities.ServiceRequest.filter({ id: requestId }).then(r => r[0]),
    enabled: !!requestId && (step === STEPS.SEARCHING || step === STEPS.QUOTE || step === STEPS.CONFIRMED),
    refetchInterval: 3000,
  });

  // Request notification permission when entering search/quote phase
  useEffect(() => {
    if (step === STEPS.SEARCHING || step === STEPS.QUOTE) {
      requestPermission();
    }
  }, [step]);

  // React to request status changes — dès qu'un pro accepte, on passe à CONFIRMED
  useEffect(() => {
    if (!currentRequest) return;
    if (currentRequest.status === 'accepted' && step !== STEPS.CONFIRMED) {
      setStep(STEPS.CONFIRMED);
      notify('✅ Mission confirmée !', `${currentRequest.professional_name || 'Un professionnel'} a pris votre demande.`);
      toast.success('Un professionnel a accepté votre demande !');
    }
  }, [currentRequest?.status]);

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceRequest.update(id, data),
  });

  const findAndContactNextPro = async (existingRequest) => {
    setStep(STEPS.SEARCHING);
    const req = existingRequest || currentRequest;
    const freshPros2 = await fetchFreshPros();
    const catPros = freshPros2.map(normalizePro).filter(p => {
      if (p.account_deleted) return false;
      if (category?.name && p.category_name && p.category_name !== category.name) return false;
      return true;
    });
    const tried = req?.tried_professionals || [];
    const customerLat = req?.customer_latitude || user?.latitude || 50.8503;
    const customerLon = req?.customer_longitude || user?.longitude || 4.3517;

    const nextPro = findClosestPro(catPros, customerLat, customerLon, tried);
    if (!nextPro) {
      toast.error('Aucun professionnel disponible pour ce service.');
      setStep(STEPS.QUOTE);
      return;
    }
    setAssignedPro(nextPro);

    const newTried = [...tried, nextPro.id];
    const basePrice = nextPro.base_price || category?.base_price || 80;
    const commission = basePrice * 0.10;
    const totalPrice = basePrice + commission;

    if (req?.id) {
      await updateRequestMutation.mutateAsync({
        id: req.id,
        data: {
          status: 'pending_pro',
          professional_id: nextPro.id,
          professional_name: nextPro.full_name,
          professional_email: nextPro.email,
          tried_professionals: newTried,
          base_price: basePrice,
          commission: commission,
          total_price: totalPrice,
        },
      });
    }
    setStep(STEPS.QUOTE);
  };

  const handleAddressNext = () => {
    if (!address.trim()) return;
    if (totalQuestions > 0) setStep(STEPS.QUESTIONS);
    else if (isUrgent) setStep(STEPS.QUOTE);
    else setStep(STEPS.SLOT);
  };

  const startSearch = async () => {
    setStep(STEPS.SEARCHING);

    const rawBase = category?.base_price || 80;
    const basePrice = isUrgent ? rawBase * (1 + URGENCY_SURCHARGE) : rawBase;
    const commission = basePrice * 0.10;
    const tva = (basePrice + commission) * 0.21;
    const totalPrice = basePrice + commission + tva;

    const answersArray = questions.map((q, i) => ({
      question: q.question,
      answer: answers[i] || '',
    }));

    // Lance la création ET un timer 3s en parallèle
    const [newRequest] = await Promise.all([
      createRequestMutation.mutateAsync({
        category_id: categoryId,
        category_name: category?.name,
        answers: answersArray,
        customer_name: user?.full_name || '',
        customer_email: user?.email || '',
        customer_address: address,
        customer_latitude: user?.data?.latitude || user?.latitude || 50.8503,
        customer_longitude: user?.data?.longitude || user?.longitude || 4.3517,
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
        tried_professionals: [],
        base_price: basePrice,
        commission: commission,
        total_price: totalPrice,
        payment_method: paymentMethod || 'bank_transfer',
        payment_status: 'unpaid',
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        is_urgent: isUrgent,
      }),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);

    setRequestId(newRequest.id);
    setStep(STEPS.QUOTE);
  };

  const handleQuestionNext = () => {
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Après les questions : étape photo IA (sauf SOS)
      if (isUrgent) setStep(STEPS.QUOTE);
      else setStep(STEPS.PHOTO);
    }
  };

  const handlePhotoResult = (result) => {
    setAiResult(result);
    loadAndShowProSelect();
  };

  const handlePhotoSkip = () => {
    setAiResult(null);
    loadAndShowProSelect();
  };

  const loadAndShowProSelect = () => {
    setStep(STEPS.PRO_SELECT);
    if (allPros.length === 0) {
      fetchFreshPros()
        .then(setAllPros)
        .catch(() => {
          toast.error('Impossible de charger les professionnels.');
          setAllPros([]);
        });
    }
  };

  const handleProSelected = (pro) => {
    setAssignedPro(pro);
    setStep(STEPS.SLOT);
  };

  const handleAcceptQuote = async () => {
    if (!paymentMethod) { toast.error('Choisissez un moyen de paiement'); return; }

    // Recalcule le prix final (avec surcharge SOS si besoin)
    const rawBasePrice = category?.base_price || 80;
    const finalBasePrice = isUrgent ? rawBasePrice * (1 + URGENCY_SURCHARGE) : rawBasePrice;
    const finalCommission = finalBasePrice * 0.10;
    const finalTva = (finalBasePrice + finalCommission) * 0.21;
    const finalTotalPrice = finalBasePrice + finalCommission + finalTva;

    // Si la demande n'existe pas encore (flux SOS sans slot), on la crée maintenant
    let id = requestId || currentRequest?.id;
    if (!id) {
      const answersArray = questions.map((q, i) => ({
        question: q.question,
        answer: answers[i] || '',
      }));
      const newRequest = await createRequestMutation.mutateAsync({
        category_id: categoryId,
        category_name: category?.name,
        answers: answersArray,
        customer_name: user?.full_name || '',
        customer_email: user?.email || '',
        customer_address: address,
        customer_latitude: user?.data?.latitude || user?.latitude || 50.8503,
        customer_longitude: user?.data?.longitude || user?.longitude || 4.3517,
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
        tried_professionals: [],
        base_price: finalBasePrice,
        commission: finalCommission,
        total_price: finalTotalPrice,
        payment_method: paymentMethod,
        payment_status: 'unpaid',
        scheduled_date: null,
        scheduled_time: null,
        is_urgent: isUrgent,
      });
      id = newRequest.id;
      setRequestId(id);
    } else {
      await updateRequestMutation.mutateAsync({
        id,
        data: { payment_method: paymentMethod },
      });
    }

    if (paymentMethod === 'stripe') {
      // Vérifier iframe
      if (window.self !== window.top) {
        toast.error('Le paiement en ligne fonctionne uniquement depuis l\'application publiée.');
        return;
      }
      const res = await base44.functions.invoke('createStripeCheckout', {
        requestId: id,
        totalPrice: finalTotalPrice,
        categoryName: category?.name,
        proName: currentRequest?.professional_name || '',
        successUrl: `${window.location.origin}/Invoices?payment=success`,
        cancelUrl: window.location.href,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Erreur lors de la création du paiement.');
      }
      return;
    }

    setStep(STEPS.CONFIRMED);
    toast.success('Devis accepté ! Pensez à payer en espèces au professionnel.');
  };

  const handleDecline = () => navigate('/Home');
  const handleBack = () => {
    if (step === STEPS.QUESTIONS && questionIndex > 0) setQuestionIndex(questionIndex - 1);
    else if (step === STEPS.QUESTIONS) setStep(STEPS.ADDRESS);
    else if (step === STEPS.ADDRESS) navigate('/Home');
    else navigate('/Home');
  };

  // Bloc eID : redirige si non vérifié
  if (user && user.eid_status !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-4xl">🪪</span>
        </div>
        <h2 className="text-xl font-bold">Vérification d'identité requise</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Pour faire une demande de service, vous devez d'abord vérifier votre identité avec votre carte eID.
        </p>
        <Button onClick={() => navigate('/EidVerification')} className="w-full h-14 rounded-xl text-base">
          Vérifier mon identité
        </Button>
        <Button variant="ghost" onClick={() => navigate('/Home')} className="w-full h-12 rounded-xl">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  if (loadingCategory) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!category) {
    return <div className="px-4 pt-6 text-center"><p className="text-muted-foreground">Service non trouvé</p><Button variant="outline" onClick={() => navigate('/Home')} className="mt-4">Retour</Button></div>;
  }

  const rawBase = assignedPro?.base_price || aiResult?.price_estimate || category?.base_price || 80;
  const basePrice = isUrgent ? rawBase * (1 + URGENCY_SURCHARGE) : rawBase;
  const commission = basePrice * 0.10;
  const tva = (basePrice + commission) * 0.21;
  const totalPrice = basePrice + commission + tva;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== STEPS.SEARCHING && step !== STEPS.CONFIRMED && (
          <BackButton fallback="/Home" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{category.name}</h1>
            {isUrgent && (
              <span className="text-xs font-bold bg-destructive text-white rounded-full px-2.5 py-0.5 flex items-center gap-1">
                ⚡ SOS
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {step === STEPS.ADDRESS && 'Votre adresse'}
            {step === STEPS.QUESTIONS && `Question ${questionIndex + 1} / ${totalQuestions}`}
            {step === STEPS.PHOTO && 'Analyse IA'}
            {step === STEPS.PRO_SELECT && 'Choisissez un professionnel'}
            {step === STEPS.SLOT && 'Date & heure'}
            {step === STEPS.SEARCHING && 'Recherche en cours...'}
            {step === STEPS.QUOTE && 'Votre devis'}
            {step === STEPS.CONFIRMED && 'Confirmé !'}
          </p>
        </div>
      </div>

      {step === STEPS.QUESTIONS && (
        <Progress value={((questionIndex + 1) / totalQuestions) * 100} className="mb-6 h-1.5" />
      )}
      {step === STEPS.PHOTO && (
        <Progress value={100} className="mb-6 h-1.5" />
      )}
      {step === STEPS.PRO_SELECT && (
        <Progress value={100} className="mb-6 h-1.5" />
      )}

      <AnimatePresence mode="wait">
        {/* ADDRESS STEP */}
        {step === STEPS.ADDRESS && (
          <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="space-y-2">
              <Label>Votre adresse d'intervention</Label>
              {user?.address && !addressConfirmed ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary mb-1">Adresse enregistrée</p>
                      <p className="text-sm font-medium">{user.address}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">L'intervention aura-t-elle lieu à cette adresse ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAddressConfirmed(true)}
                      className="h-12 rounded-xl"
                    >
                      Non, changer
                    </Button>
                    <Button
                      onClick={handleAddressNext}
                      className="h-12 rounded-xl"
                    >
                      Oui, confirmer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Ex: Rue de la Loi 16, 1000 Bruxelles"
                    className="h-12 rounded-xl"
                  />
                  <Button onClick={handleAddressNext} disabled={!address.trim()} className="w-full h-14 rounded-xl text-base">
                    Continuer <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* QUESTIONS STEP */}
        {step === STEPS.QUESTIONS && (
          <motion.div key={`q-${questionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <QuestionStep
              question={questions[questionIndex]}
              answer={answers[questionIndex]}
              onChange={val => setAnswers({ ...answers, [questionIndex]: val })}
            />
            <Button onClick={handleQuestionNext} disabled={!answers[questionIndex]} className="w-full h-14 rounded-xl text-base">
              {questionIndex < totalQuestions - 1 ? 'Suivant' : 'Voir le prix'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* PHOTO ANALYSIS */}
        {step === STEPS.PHOTO && (
          <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PhotoAnalysisStep
              categoryName={category?.name}
              basePrice={category?.base_price || 80}
              onResult={handlePhotoResult}
              onSkip={handlePhotoSkip}
            />
          </motion.div>
        )}

        {/* PRO SELECTION */}
        {step === STEPS.PRO_SELECT && (
          <motion.div key="pro_select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {allPros.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Chargement des professionnels...</p>
              </div>
            ) : (
              <ProSelectionList
                professionals={allPros}
                customerLat={user?.latitude || user?.data?.latitude || 50.8503}
                customerLon={user?.longitude || user?.data?.longitude || 4.3517}
                categoryName={category?.name}
                basePrice={category?.base_price || 80}
                onSelect={handleProSelected}
              />
            )}
          </motion.div>
        )}

        {/* SLOT PICKER */}
        {step === STEPS.SLOT && (
          <motion.div key="slot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <SlotPicker
              proSlots={assignedPro?.availability_slots || []}
              selectedDate={scheduledDate}
              selectedTime={scheduledTime}
              onDateChange={setScheduledDate}
              onTimeChange={setScheduledTime}
            />
            <Button
              onClick={startSearch}
              disabled={!scheduledDate || !scheduledTime}
              className="w-full h-14 rounded-xl text-base"
            >
              <CalendarDays className="w-5 h-5 mr-2" />
              Confirmer le créneau
            </Button>
            <button onClick={startSearch} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2">
              Passer (sans choisir de créneau)
            </button>
          </motion.div>
        )}

        {/* SEARCHING */}
        {step === STEPS.SEARCHING && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Search className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="font-semibold text-lg">Recherche du professionnel le plus proche...</h2>
            <p className="text-sm text-muted-foreground">Nous contactons les professionnels disponibles près de vous</p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* QUOTE */}
        {step === STEPS.QUOTE && (
          <motion.div key="quote" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {!isUrgent && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <Search className="w-5 h-5 text-primary animate-pulse shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">Demande envoyée à tous les {category?.name}s disponibles</p>
                  <p className="text-xs text-muted-foreground">Le premier à accepter prendra votre mission</p>
                </div>
              </div>
            )}
            <PriceQuote
              basePrice={basePrice}
              commission={commission}
              totalPrice={totalPrice}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onAccept={handleAcceptQuote}
              onDecline={handleDecline}
              isSubmitting={createRequestMutation.isPending || updateRequestMutation.isPending}
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              isUrgent={isUrgent}
              categoryName={category?.name}
            />
          </motion.div>
        )}

        {/* CONFIRMED */}
        {step === STEPS.CONFIRMED && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            {currentRequest?.status === 'accepted' ? (
              <>
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">Mission confirmée !</h2>
                {assignedPro && <p className="text-muted-foreground">{assignedPro.full_name || 'Le professionnel'} est en route vers vous.</p>}
                <p className="text-sm text-muted-foreground">Vous recevrez une confirmation par email.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Clock className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold">Devis accepté !</h2>
                <p className="text-muted-foreground">En attente de confirmation du professionnel...</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </>
            )}
            {/* Rappel cash */}
            {paymentMethod === 'cash' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-left mx-auto max-w-sm">
                <p className="text-sm font-semibold text-green-800">💵 Paiement en espèces</p>
                <p className="text-xs text-green-700 mt-1">Remettez <strong>{totalPrice.toFixed(2)} €</strong> en espèces directement au professionnel à la fin de l'intervention.</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button onClick={() => navigate(`/TrackingMap?requestId=${requestId || currentRequest?.id}`)} className="w-full h-12 rounded-xl bg-primary">
                <Navigation className="w-4 h-4 mr-2" /> Suivre sur la carte
              </Button>
              <Button onClick={() => navigate(`/Chat?requestId=${requestId || currentRequest?.id}`)} variant="outline" className="w-full h-12 rounded-xl border-primary text-primary">
                <MessageCircle className="w-4 h-4 mr-2" /> Contacter le professionnel
              </Button>
              <Button variant="outline" onClick={() => navigate('/Invoices')} className="w-full h-12 rounded-xl">
                Voir ma facture
              </Button>
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