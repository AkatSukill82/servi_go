import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, ShieldCheck, ArrowRight, Loader2, User, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function EidVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // 'upload' | 'scanning' | 'done'
  const [extracted, setExtracted] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('scanning');

    // Upload the image
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // AI extraction from eID
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyse cette carte d'identité belge (eID) et extrais les informations suivantes. 
Retourne UNIQUEMENT un JSON avec ces champs (laisse vide "" si non visible):
- full_name: prénom et nom complet de la personne
- address: adresse complète (rue, numéro, ville, code postal)
- birth_date: date de naissance au format YYYY-MM-DD
- national_number: numéro national belge (format: XX.XX.XX-XXX.XX)
- card_number: numéro de la carte eID`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          full_name: { type: 'string' },
          address: { type: 'string' },
          birth_date: { type: 'string' },
          national_number: { type: 'string' },
          card_number: { type: 'string' },
        },
      },
    });

    // Save to user profile
    const updates = {
      eid_photo_url: file_url,
      eid_status: 'verified',
    };
    if (result.address) updates.address = result.address;
    if (result.birth_date) updates.birth_date = result.birth_date;
    if (result.national_number) updates.national_number = result.national_number;

    await base44.auth.updateMe(updates);
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });

    setExtracted(result);
    setStep('done');
    toast.success('Carte eID scannée et profil mis à jour !');
  };

  if (step === 'scanning') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
          <p className="text-sm text-muted-foreground">Notre IA lit votre carte eID et remplit votre profil automatiquement.</p>
        </div>
      </div>
    );
  }

  if (step === 'done' && extracted) {
    return (
      <div className="min-h-screen bg-background flex flex-col px-5 pt-14 pb-10">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-green-700">Identité vérifiée !</h1>
          <p className="text-sm text-muted-foreground mt-2">Votre profil a été mis à jour automatiquement.</p>
        </motion.div>

        <div className="space-y-3 mb-8">
          {extracted.full_name && (
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <User className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Nom complet</p>
                <p className="font-semibold">{extracted.full_name}</p>
              </div>
            </div>
          )}
          {extracted.address && (
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Adresse</p>
                <p className="font-semibold">{extracted.address}</p>
              </div>
            </div>
          )}
          {extracted.birth_date && (
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date de naissance</p>
                <p className="font-semibold">{extracted.birth_date}</p>
              </div>
            </div>
          )}
          {extracted.national_number && (
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Numéro national</p>
                <p className="font-semibold font-mono">{extracted.national_number}</p>
              </div>
            </div>
          )}
        </div>

        <Button onClick={() => navigate(-1)} className="w-full h-14 rounded-xl text-base">
          Retour au profil <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-14 pb-10">
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 text-sm text-muted-foreground">
        ← Retour
      </button>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Scanner votre eID</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Prenez en photo votre carte d'identité belge. Les informations seront extraites automatiquement et ajoutées à votre profil.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3 mb-8">
        {[
          { icon: '📸', title: 'Photographiez le recto de votre eID', desc: 'Assurez-vous que la carte est bien lisible et éclairée' },
          { icon: '🤖', title: 'Extraction automatique', desc: 'Notre IA lit le nom, l\'adresse, la date de naissance...' },
          { icon: '✅', title: 'Profil mis à jour instantanément', desc: 'Plus besoin de saisir vos infos manuellement' },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-4 bg-card border border-border rounded-2xl p-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <label className="block">
          <div className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-base font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Camera className="w-5 h-5" /> Scanner ma carte eID
          </div>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
        </label>
        <p className="text-center text-xs text-muted-foreground mt-3">Formats acceptés : JPG, PNG</p>
      </motion.div>
    </div>
  );
}