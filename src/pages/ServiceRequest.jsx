import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, CheckCircle, MessageCircle, CalendarDays, MapPin } from 'lucide-react';
import SlotPicker from '@/components/request/SlotPicker';
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

  useEffect(() => {
    if (!priorityProId && !priorityProEmail) return;
    const query = priorityProId ? { id: priorityProId } : { email: priorityProEmail };
    base44.entities.User.filter(query, '-created_date', 1)
      .then((users) => { if (users[0]) setPreselectedPro(users[0]); })
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

  // ── eID gate — vérifie via IdentityVerification en complément du champ user ──
  const { data: identityVerif, isLoading: loadingVerif } = useQuery({
    queryKey: ['identityVerif', user?.email],
    queryFn: () => base44.entities.IdentityVerification.filter({ user_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  if (!user || loadingVerif) return null;

  const eidApproved = identityVerif?.status === 'approved' || user?.eid_status === 'verified';

  if (!eidApproved) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6 bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
        >
          <span className="text-5xl">🪪</span>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Vérification requise</h2>
          <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">
            {identityVerif?.status === 'pending_review'
              ? 'Votre dossier est en cours de vérification. Vous pourrez faire une demande dès qu\'il sera approuvé.'
              : 'Pour faire une demande de mission, vous devez d\'abord vérifier votre identité avec votre carte eID.'}
          </p>
        </div>
        {identityVerif?.status !== 'pending_review' && (
          <button
            onClick={() => navigate('/EidVerification')}
            className="w-full h-14 rounded-2xl text-white font-extrabold text-base"
            style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
          >
            Vérifier mon identité
          </button>
        )}
        <button onClick={() => navigate('/Home')} className="text-gray-400 font-medium text-sm">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (loadingCategory) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-10 h-10 rounded-full border-4 border-[#6C5CE7]/20 border-t-[#6C5CE7] animate-spin" />
    </div>
  );

  if (!category) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4 bg-white">
      <p className="text-gray-500 font-medium">Service introuvable</p>
      <button onClick={() => navigate('/Home')} className="text-[#6C5CE7] font-bold">Retour à l'accueil</button>
    </div>
  );

  // ── Handlers ──
  const handleAddressNext = () => {
    if (!address.trim()) return;
    if (totalQuestions > 0) setStep(STEPS.QUESTIONS);
    else setStep(STEPS.SLOT);
  };

  const handleQuestionNext = () => {
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Si le client indique qu'il est bloqué → pas besoin de choisir une date, on envoie directement
      const clientIsBlocked = Object.values(answers).some(
        (a) => typeof a === 'string' && /bloqu/i.test(a)
      );
      if (clientIsBlocked) handleConfirm();
      else setStep(STEPS.SLOT);
    }
  };

  // ── Estimation de prix avec facteurs ──────────────────────────────────────
  const baseCategoryPrice = category?.base_price || 80;
  const nowHour    = new Date().getHours();
  const nowDay     = new Date().getDay();
  const isEvening  = nowHour >= 18 || nowHour < 7;
  const isWeekend  = nowDay === 0 || nowDay === 6;
  const hasTimeBonus = !isUrgent && (isEvening || isWeekend);
  const estimatedPrice = Math.round(baseCategoryPrice * (isUrgent ? 1.5 : 1) * (hasTimeBonus ? 1.2 : 1));

  const handleConfirm = async () => {
    setStep(STEPS.SEARCHING);
    const answersArray = questions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }));
    const firstName = user?.first_name || user?.full_name?.split(' ')[0] || '';
    const lastName = user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || '';

    const newRequest = await createMutation.mutateAsync({
      category_id: category?.id || categoryId,
      category_name: category?.name,
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
      estimated_price: estimatedPrice,
      tried_professionals: [],
    });

    setRequestId(newRequest.id);

    const matchingPros = await base44.entities.User.filter({
      user_type: 'professionnel',
      category_name: category.name,
      available: true,
      verification_status: 'verified',
    }, '-created_date', 100).catch(() => []);

    await Promise.all(matchingPros.map((pro) =>
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
    else navigate('/Home');
  };

  const isTransitioning = step === STEPS.SEARCHING || step === STEPS.CONFIRMED;
  const totalSteps = totalQuestions > 0 ? 3 : 2;
  const currentProgress = { [STEPS.ADDRESS]: 1, [STEPS.QUESTIONS]: 2, [STEPS.SLOT]: totalSteps }[step] || 1;

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ── Header ── */}
      {!isTransitioning && (
        <>
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-gray-900 truncate">{category.name}</h1>
              {isUrgent && (
                <span className="text-xs font-extrabold bg-red-500 text-white rounded-full px-2.5 py-0.5 shrink-0">
                  ⚡ SOS
                </span>
              )}
            </div>
          </div>

          {/* Step progress bar */}
          <div className="flex items-center gap-1.5 px-4 pb-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  flex: i + 1 <= currentProgress ? 2 : 1,
                  backgroundColor: i + 1 <= currentProgress ? '#6C5CE7' : '#E5E7EB',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Step content ── */}
      <div className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">

          {/* ADDRESS */}
          {step === STEPS.ADDRESS && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Où a lieu l'intervention ?</h2>
                <p className="text-gray-400 text-sm mt-1">Indiquez l'adresse complète</p>
              </div>

              {user?.address && !addressConfirmed ? (
                <div className="space-y-4">
                  <div className="bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#6C5CE7] mb-0.5">Adresse enregistrée</p>
                      <p className="text-sm font-semibold text-gray-800">{user.address}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 text-center">L'intervention aura-t-elle lieu ici ?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAddressConfirmed(true)}
                      className="h-13 py-3 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600"
                    >
                      Non, changer
                    </button>
                    <button
                      onClick={handleAddressNext}
                      className="h-13 py-3 rounded-2xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
                    >
                      Oui, confirmer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 h-14 border border-gray-100"
                    style={{ transition: 'border-color 0.2s' }}
                  >
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex : Rue de la Loi 16, 1000 Bruxelles"
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400 font-medium"
                    />
                  </div>
                  <button
                    onClick={handleAddressNext}
                    disabled={!address.trim()}
                    className="w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
                  >
                    Continuer <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* QUESTIONS */}
          {step === STEPS.QUESTIONS && (
            <motion.div
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div>
                <p className="text-xs font-extrabold text-[#6C5CE7] uppercase tracking-widest mb-1">
                  Question {questionIndex + 1} / {totalQuestions}
                </p>
                <h2 className="text-2xl font-extrabold text-gray-900">Précisez votre besoin</h2>
              </div>
              <QuestionStep
                question={questions[questionIndex]}
                answer={answers[questionIndex]}
                onChange={(val) => setAnswers({ ...answers, [questionIndex]: val })}
              />
              <button
                onClick={handleQuestionNext}
                disabled={!answers[questionIndex]}
                className="w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
              >
                {questionIndex < totalQuestions - 1 ? 'Question suivante' : 'Choisir une date'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* SLOT */}
          {step === STEPS.SLOT && (
            <motion.div
              key="slot"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Quand souhaitez-vous être reçu ?</h2>
                <p className="text-gray-400 text-sm mt-1">Facultatif — vous pouvez aussi envoyer sans date</p>
              </div>

              <SlotPicker
                proSlots={[]}
                selectedDate={scheduledDate}
                selectedTime={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
              />

              {preselectedPro && (
                <div className="bg-[#00B894]/10 border border-[#00B894]/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00B894]/20 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#00B894]">Professionnel pré-sélectionné</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {preselectedPro.full_name || preselectedPro.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Recap card */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Récapitulatif</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0">🛠</span>
                  <span className="text-sm font-bold text-gray-800">{category.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600">{address}</span>
                </div>
                {scheduledDate && (
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600">
                      {scheduledDate}{scheduledTime ? ` à ${scheduledTime}` : ''}
                    </span>
                  </div>
                )}

                {/* Price breakdown */}
                <div className="border-t border-gray-200 pt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Prix de base</span>
                    <span className="text-xs font-semibold text-gray-700">{baseCategoryPrice} €</span>
                  </div>
                  {isUrgent && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-500">⚡ Majoration urgence (+50%)</span>
                      <span className="text-xs font-semibold text-red-500">+{Math.round(baseCategoryPrice * 0.5)} €</span>
                    </div>
                  )}
                  {hasTimeBonus && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-600">🌙 Majoration {isWeekend ? 'week-end' : 'soirée'} (+20%)</span>
                      <span className="text-xs font-semibold text-amber-600">+{Math.round(baseCategoryPrice * 0.2)} €</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-900">Estimation totale</span>
                    <span className="text-base font-black" style={{ color: '#6C5CE7' }}>~{estimatedPrice} €</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Estimation indicative — le pro établit la facture finale</p>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={createMutation.isPending}
                className="w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
              >
                <CalendarDays className="w-5 h-5" /> Envoyer ma demande
              </button>

              <button
                onClick={handleConfirm}
                disabled={createMutation.isPending}
                className="w-full text-center text-sm text-gray-400 font-semibold py-2"
              >
                Envoyer sans date précise
              </button>
            </motion.div>
          )}

          {/* SEARCHING */}
          {step === STEPS.SEARCHING && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center px-6 space-y-8"
              style={{ minHeight: '80vh' }}
            >
              {/* Pulse rings */}
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute w-40 h-40 rounded-full opacity-10 animate-ping"
                  style={{ background: '#6C5CE7' }}
                />
                <div
                  className="absolute w-28 h-28 rounded-full opacity-15 animate-ping"
                  style={{ background: '#6C5CE7', animationDelay: '0.3s' }}
                />
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
                >
                  <Search className="w-9 h-9 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Recherche en cours</h2>
                <p className="text-gray-400 text-sm mt-2">
                  Nous contactons les professionnels<br />
                  <span className="font-semibold text-gray-600">{category.name}</span> disponibles près de vous
                </p>
              </div>

              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ backgroundColor: '#6C5CE7', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* CONFIRMED */}
          {step === STEPS.CONFIRMED && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
              style={{ minHeight: '100vh', paddingTop: 'env(safe-area-inset-top)' }}
            >
              {/* Hero */}
              <div className="text-center px-6 pt-16 pb-8">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, #00B894 0%, #00cec9 100%)' }}
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900">Demande envoyée !</h2>
                <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
                  Les <span className="font-semibold text-gray-600">{category.name}s</span> disponibles reçoivent votre demande maintenant
                </p>
              </div>

              {/* Progress */}
              <div className="px-4 mb-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <MissionProgress status="searching" />
                </div>
              </div>

              {/* Steps list */}
              <div className="px-4 space-y-3 flex-1">
                {[
                  { icon: '✅', title: 'Demande envoyée',      desc: 'Visible par tous les pros disponibles', done: true },
                  { icon: '🤝', title: 'Un pro accepte',        desc: 'Il vous contacte via le chat de mission' },
                  { icon: '📝', title: 'Signature du contrat',  desc: 'Contrat électronique créé et signé' },
                  { icon: '🏠', title: 'Intervention à domicile', desc: 'Le règlement se fait avec le pro' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-2xl ${item.done ? 'bg-[#00B894]/10 border border-[#00B894]/20' : 'bg-gray-50'}`}
                  >
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${item.done ? 'text-[#00B894]' : 'text-gray-800'}`}>{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div
                className="px-4 py-6 space-y-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
              >
                {requestId && (
                  <button
                    onClick={() => navigate(`/Chat?requestId=${requestId}`)}
                    className="w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}
                  >
                    <MessageCircle className="w-5 h-5" /> Aller au chat de la mission
                  </button>
                )}
                <button
                  onClick={() => navigate('/Home')}
                  className="w-full h-12 rounded-2xl text-gray-500 font-semibold text-sm bg-gray-50"
                >
                  Retour à l'accueil
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}