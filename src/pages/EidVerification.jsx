import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, Clock, ShieldCheck, Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function EidVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ eid_photo_url: file_url, eid_status: 'pending' });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setUploading(false);
    setUploaded(true);
    toast.success('Carte eID envoyée ! Vérification en cours.');
  };

  const eidStatus = user?.eid_status;
  const isPending = eidStatus === 'pending' || uploaded;
  const isVerified = eidStatus === 'verified';
  const isRejected = eidStatus === 'rejected';

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-14 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vérification d'identité</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Pour utiliser ServiGo, vous devez vérifier votre identité en scannant votre carte d'identité belge (eID).
        </p>
      </motion.div>

      {/* Steps */}
      {!isPending && !isVerified && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 mb-8">
          {[
            { icon: '📸', title: 'Prenez en photo votre eID', desc: 'Recto de votre carte d\'identité belge, bien lisible' },
            { icon: '🔒', title: 'Traitement sécurisé', desc: 'Vos données sont protégées et uniquement utilisées pour la vérification' },
            { icon: '✅', title: 'Validation sous 24h', desc: 'Vous recevrez une confirmation par email' },
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
      )}

      {/* Status: verified */}
      {isVerified && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-8">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-xl font-bold text-green-700">Identité vérifiée !</h2>
          <p className="text-sm text-muted-foreground text-center">Votre compte est validé. Vous pouvez maintenant faire des demandes de service.</p>
          <Button onClick={() => navigate('/Home')} className="w-full h-14 rounded-xl text-base mt-4">
            Accéder à l'accueil <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Status: pending */}
      {isPending && !isVerified && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">Vérification en cours</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Votre carte eID a bien été reçue. Notre équipe va la vérifier sous 24h. Vous recevrez un email de confirmation.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full text-center">
            <p className="text-xs text-yellow-700">En attendant la validation, vous ne pouvez pas encore faire de demande de mission.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/Home')} className="w-full h-12 rounded-xl mt-2">
            Retour à l'accueil
          </Button>
        </motion.div>
      )}

      {/* Status: rejected */}
      {isRejected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-red-700">Document refusé</p>
          <p className="text-xs text-red-600 mt-1">Votre document a été refusé. Veuillez en soumettre un nouveau (lisible, sans flou).</p>
        </motion.div>
      )}

      {/* Upload button */}
      {!isPending && !isVerified && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label className="block">
            <div className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-base font-semibold cursor-pointer transition-colors ${uploading ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {uploading ? (
                <><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Envoi en cours...</>
              ) : (
                <><Camera className="w-5 h-5" /> Scanner ma carte eID</>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <p className="text-center text-xs text-muted-foreground mt-3">Formats acceptés : JPG, PNG — Taille max 10 MB</p>
        </motion.div>
      )}
    </div>
  );
}