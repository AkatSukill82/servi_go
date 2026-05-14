import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Splash affiché une seule fois juste après l'inscription.
 * Invite l'utilisateur à compléter la vérification eID depuis son profil.
 * Props:
 *   - userType: 'particulier' | 'professionnel'
 *   - onDismiss: callback appelé quand l'utilisateur clique sur "Continuer sans"
 */
export default function EidWelcomeSplash({ userType, onDismiss }) {
  const navigate = useNavigate();
  const isPro = userType === 'professionnel';

  const handleVerify = () => {
    navigate(isPro ? '/ProProfile' : '/Profile');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Gradient top */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)', boxShadow: '0 12px 40px rgba(108,92,231,0.35)' }}
        >
          <ShieldCheck className="w-14 h-14 text-white" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-black text-gray-900">
            Bienvenue sur ServiGo ! 🎉
          </h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            Votre compte est créé. Pour{' '}
            <strong className="text-gray-700">
              {isPro ? 'recevoir des missions' : 'faire vos premières demandes'}
            </strong>
            , vous devez vérifier votre identité avec votre carte eID.
          </p>
        </motion.div>

        {/* Étapes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="w-full max-w-sm space-y-2.5"
        >
          {[
            { done: true,  label: 'Compte créé avec succès' },
            { done: false, label: 'Vérification eID (carte d\'identité)' },
            { done: false, label: isPro ? 'Recevoir vos premières missions' : 'Faire votre première demande' },
          ].map((step, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${step.done ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                {step.done
                  ? <CheckCircle className="w-4 h-4 text-white" />
                  : <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                }
              </div>
              <p className={`text-sm font-medium ${step.done ? 'text-emerald-800' : 'text-gray-700'}`}>{step.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="px-6 pb-6 space-y-3"
      >
        <button
          onClick={handleVerify}
          className="w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)', boxShadow: '0 4px 20px rgba(108,92,231,0.4)' }}
        >
          Vérifier mon identité <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={onDismiss}
          className="w-full text-center text-sm text-gray-400 font-medium py-2"
        >
          Continuer, je le ferai plus tard
        </button>
      </motion.div>
    </div>
  );
}