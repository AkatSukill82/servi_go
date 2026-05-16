import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ServiGoLogo from '@/components/brand/ServiGoLogo';

import StepTypeChoice from '@/components/register/StepTypeChoice';
import StepCreateAccount from '@/components/register/StepCreateAccount';
import StepPersonalInfo from '@/components/register/StepPersonalInfo';
import StepIdentity from '@/components/register/StepIdentity';
import StepConfirmation from '@/components/register/StepConfirmation';

const SLIDE = { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.25 } };

// Steps: 0=TypeChoice, 1=CreateAccount, 2=PersonalInfo, 3=Identity, 4=Confirmation
export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState(null);
  const [personalData, setPersonalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      const user = await base44.auth.me();
      if (user?.role === 'admin') { setCurrentUser(user); setIsAuthenticated(true); return; }
      if (user?.user_type === 'professionnel') { navigate('/ProDashboard', { replace: true }); return; }
      if (user?.user_type === 'particulier') { navigate('/Home', { replace: true }); return; }
      setCurrentUser(user);
      setIsAuthenticated(true);
      setStep(2);
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
    onError: (err) => {
      console.error('[Register] Update error:', err.message);
      toast.error('Erreur lors de la sauvegarde. Vérifiez votre connexion.');
    },
  });

  const handlePersonalNext = async (data) => {
    setSaving(true);
    setPersonalData(data);
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
    const toISODate = (ddmmyyyy) => {
      if (!ddmmyyyy) return '';
      const parts = ddmmyyyy.split('/');
      if (parts.length !== 3) return ddmmyyyy;
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };
    try {
      // Validation
      if (!data.first_name || !data.last_name) {
        throw new Error('Nom et prénom requis');
      }
      if (userType === 'professionnel' && !data.bce_number) {
        throw new Error('Numéro BCE requis pour les professionnels');
      }
      await saveMutation.mutateAsync({
        user_type: userType,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        birth_date: toISODate(data.birth_date),
        ...(userType === 'professionnel' ? {
          category_name: data.category_name,
          bce_number: data.bce_number,
          pro_description: data.pro_description,
        } : {}),
      });
      setStep(3);
    } catch (err) {
      console.error('[Register] handlePersonalNext error:', err.message);
      toast.error(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background overflow-y-auto" style={{ height: '100dvh' }}>
      <div className="w-full md:max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
        <ServiGoLogo size="sm" />
        {!isAuthenticated && (
          <button
            onClick={() => base44.auth.redirectToLogin('/Home')}
            className="text-sm font-semibold text-[#534AB7] border border-[#534AB7]/30 px-4 py-2 rounded-xl hover:bg-[#534AB7]/5 transition-colors"
          >
            Se connecter
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" {...SLIDE}>
            <StepTypeChoice onSelect={(type) => { setUserType(type); setStep(1); }} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="step1" {...SLIDE}>
            <StepCreateAccount userType={userType} onNext={async ({ email }) => {
              const user = await base44.auth.me();
              setCurrentUser(user);
              setIsAuthenticated(true);
              setStep(2);
            }} onBack={() => setStep(0)} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" {...SLIDE}>
            <StepPersonalInfo
              userType={userType}
              initialData={{ ...personalData, ...currentUser }}
              onNext={handlePersonalNext}
              onBack={() => isAuthenticated && !userType ? null : setStep(isAuthenticated ? 0 : 1)}
              isSaving={saving}
            />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3" {...SLIDE}>
            <StepIdentity
              userType={userType}
              userName={[personalData.first_name, personalData.last_name].filter(Boolean).join(' ')}
              userEmail={currentUser?.email}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          </motion.div>
        )}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <StepConfirmation
              userType={userType}
              firstName={personalData.first_name || currentUser?.first_name}
              userEmail={currentUser?.email}
              userName={[personalData.first_name, personalData.last_name].filter(Boolean).join(' ') || currentUser?.full_name}
              navigate={navigate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center py-4 text-xs text-muted-foreground">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
        {" · "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
        {" · "}
        <span>© 2026 ServiGo</span>
      </div>
    </div>
  );
}