import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { User, Briefcase } from 'lucide-react';

export default function SelectUserType() {
  const navigate = useNavigate();

  const updateMutation = useMutation({
    mutationFn: (type) => base44.auth.updateMe({ user_type: type }),
    onSuccess: (_, type) => {
      if (type === 'particulier') navigate('/Home');
      else navigate('/ProDashboard');
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl font-black text-white">S</span>
        </div>
        <h1 className="text-2xl font-bold">Une dernière étape !</h1>
        <p className="text-muted-foreground mt-2">Comment souhaitez-vous utiliser ServiConnect ?</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => updateMutation.mutate('particulier')}
          disabled={updateMutation.isPending}
          className="w-full bg-card border-2 border-border hover:border-primary/40 rounded-2xl p-6 text-left transition-all active:scale-95 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Particulier</h2>
              <p className="text-sm text-muted-foreground">Je cherche un professionnel</p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => updateMutation.mutate('professionnel')}
          disabled={updateMutation.isPending}
          className="w-full bg-card border-2 border-border hover:border-accent/40 rounded-2xl p-6 text-left transition-all active:scale-95 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Professionnel</h2>
              <p className="text-sm text-muted-foreground">Je propose mes services</p>
            </div>
          </div>
        </motion.button>
      </div>

      {updateMutation.isPending && (
        <div className="mt-8">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}