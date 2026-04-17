import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, ShieldCheck, ArrowRight, Loader2, Upload, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function UploadZone({ label, icon: Icon, value, onChange, loading, accept = "image/*,application/pdf", capture }) {
  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${value ? 'border-green-300 bg-green-50' : 'border-dashed border-border bg-muted/30'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${value ? 'bg-green-100' : 'bg-muted'}`}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : value ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Icon className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {value ? (
            <p className="text-xs text-green-600 mt-0.5">✓ Téléversé</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou PDF</p>
          )}
        </div>
        {!value && (
          <label className="shrink-0 cursor-pointer">
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary text-white rounded-xl">
              <Upload className="w-3.5 h-3.5" /> Choisir
            </div>
            <input
              type="file"
              accept={accept}
              capture={capture}
              className="hidden"
              onChange={onChange}
            />
          </label>
        )}
        {value && (
          <button onClick={() => onChange(null)} className="text-xs text-muted-foreground underline shrink-0">Changer</button>
        )}
      </div>
    </div>
  );
}

export default function EidVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingVerif } = useQuery({
    queryKey: ['identityVerif', user?.email],
    queryFn: () => base44.entities.IdentityVerification.filter({ user_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const [files, setFiles] = useState({ eid_front: null, eid_back: null, selfie: null, insurance: null });
  const [uploading, setUploading] = useState({});
  const [urls, setUrls] = useState({ eid_front_url: '', eid_back_url: '', selfie_url: '', insurance_url: '' });
  const [submitting, setSubmitting] = useState(false);

  const isPro = user?.user_type === 'professionnel';

  const handleUpload = async (e, field, urlField) => {
    if (e === null) {
      setUrls(u => ({ ...u, [urlField]: '' }));
      setFiles(f => ({ ...f, [field]: null }));
      return;
    }
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrls(u => ({ ...u, [urlField]: file_url }));
    setFiles(f => ({ ...f, [field]: file }));
    setUploading(u => ({ ...u, [field]: false }));
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!urls.eid_front_url || !urls.eid_back_url || !urls.selfie_url) {
      toast.error('Veuillez uploader le recto, verso de votre eID et un selfie');
      return;
    }
    if (isPro && !urls.insurance_url) {
      toast.error("Votre attestation d'assurance RC Pro est obligatoire");
      return;
    }
    setSubmitting(true);
    await base44.entities.IdentityVerification.create({
      user_email: user.email,
      user_name: user.full_name,
      user_type: user.user_type || 'particulier',
      status: 'pending_review',
      eid_front_url: urls.eid_front_url,
      eid_back_url: urls.eid_back_url,
      selfie_url: urls.selfie_url,
      insurance_url: urls.insurance_url || null,
    });
    await base44.auth.updateMe({ eid_status: 'pending_review' });
    // Notify admin
    await base44.entities.Notification.create({
      recipient_email: 'support@servigo.be',
      recipient_type: 'admin',
      type: 'new_mission',
      title: '🪪 Nouvelle vérification d\'identité',
      body: `${user.full_name || user.email} (${user.user_type}) a soumis ses documents eID.`,
      action_url: '/AdminVerification',
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['identityVerif', user.email] });
    setSubmitting(false);
    toast.success('Dossier soumis ! Vérification sous 24h.');
  };

  const statusBadge = {
    pending_review: (
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <Clock className="w-6 h-6 text-orange-600 shrink-0" />
        <div>
          <p className="font-semibold text-orange-800">Dossier en cours de vérification</p>
          <p className="text-sm text-orange-600 mt-0.5">Notre équipe examine vos documents (délai : 24h ouvrées)</p>
        </div>
      </div>
    ),
    approved: (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
        <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Identité vérifiée ✓</p>
          <p className="text-sm text-green-600 mt-0.5">Votre compte est certifié ServiGo</p>
        </div>
      </div>
    ),
    rejected: (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Vérification refusée</p>
          <p className="text-sm text-red-600 mt-0.5">{existingVerif?.rejection_reason || 'Documents incomplets ou illisibles. Veuillez soumettre à nouveau.'}</p>
        </div>
      </div>
    ),
  };

  const needsResubmit = !existingVerif || existingVerif?.status === 'rejected';

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="px-5 pt-6 pb-10 w-full md:max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          ← Retour
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Vérification d'identité</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isPro ? "Obligatoire pour recevoir le badge Pro Vérifié ✓ et des missions" : "Vérifiez votre identité pour accéder à toutes les fonctionnalités"}
          </p>
        </motion.div>

        {/* Status banner if already submitted */}
        {existingVerif && <div className="mb-6">{statusBadge[existingVerif.status]}</div>}

        {/* Upload form */}
        {needsResubmit && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents requis</h2>

            <UploadZone
              label="Recto de la carte eID"
              icon={Camera}
              value={files.eid_front}
              onChange={(e) => handleUpload(e, 'eid_front', 'eid_front_url')}
              loading={uploading.eid_front}
              capture="environment"
            />
            <UploadZone
              label="Verso de la carte eID"
              icon={Camera}
              value={files.eid_back}
              onChange={(e) => handleUpload(e, 'eid_back', 'eid_back_url')}
              loading={uploading.eid_back}
              capture="environment"
            />
            <UploadZone
              label="Selfie avec votre carte eID"
              icon={Camera}
              value={files.selfie}
              onChange={(e) => handleUpload(e, 'selfie', 'selfie_url')}
              loading={uploading.selfie}
              capture="user"
            />
            {isPro && (
              <UploadZone
                label="Attestation d'assurance RC Pro"
                icon={Upload}
                value={files.insurance}
                onChange={(e) => handleUpload(e, 'insurance', 'insurance_url')}
                loading={uploading.insurance}
                accept="image/*,application/pdf"
              />
            )}

            <div className="bg-muted/40 rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
              <p>🔒 Vos documents sont chiffrés et stockés de manière sécurisée</p>
              <p>⏱ La vérification prend moins de 24h ouvrées</p>
              <p>✉️ Vous recevrez un email de confirmation</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !urls.eid_front_url || !urls.eid_back_url || !urls.selfie_url || (isPro && !urls.insurance_url)}
              className="w-full h-14 rounded-2xl text-base font-bold"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
              {submitting ? 'Envoi en cours...' : 'Soumettre mon dossier'}
            </Button>
          </motion.div>
        )}

        {existingVerif?.status === 'approved' && (
          <Button onClick={() => navigate(-1)} className="w-full h-14 rounded-2xl text-base mt-4">
            Retour au profil <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}