import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, ShieldCheck, ArrowRight, Loader2, Upload, Clock, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Maps field name → display label
const FIELD_LABELS = {
  eid_front_url: 'Recto de la carte eID',
  eid_back_url: 'Verso de la carte eID',
  selfie_url: 'Selfie avec votre carte eID',
  insurance_url: "Attestation d'assurance RC Pro",
  onss_url: 'Attestation ONSS / Indépendant',
};

function UploadZone({ label, icon: Icon, value, onChange, loading, accept = "image/*,application/pdf", capture, error, errorReason }) {
  const hasError = !!error;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      hasError ? 'border-red-400' :
      value ? 'border-green-300 bg-green-50' :
      'border-dashed border-border bg-muted/30'
    }`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          hasError ? 'bg-red-100' : value ? 'bg-green-100' : 'bg-muted'
        }`}>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            : hasError
            ? <XCircle className="w-5 h-5 text-red-500" />
            : value
            ? <CheckCircle className="w-5 h-5 text-green-600" />
            : <Icon className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {value ? (
            <p className="text-xs text-green-600 mt-0.5">✓ Téléversé</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou PDF</p>
          )}
        </div>
        <label className="shrink-0 cursor-pointer">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl ${
            hasError ? 'bg-red-600 text-white' : 'bg-primary text-white'
          }`}>
            <Upload className="w-3.5 h-3.5" /> {value || hasError ? 'Changer' : 'Choisir'}
          </div>
          <input type="file" accept={accept} capture={capture} className="hidden" onChange={onChange} />
        </label>
      </div>
      {/* Red banner with error reason */}
      {hasError && errorReason && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2.5">
          <p className="text-xs text-red-700 font-medium">❌ Refusé : {errorReason}</p>
        </div>
      )}
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
    refetchInterval: 5000, // poll to get AI results
  });

  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [urls, setUrls] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isPro = user?.user_type === 'professionnel';

  // Build a map of field → AI result for rejected docs
  const aiResults = {};
  if (existingVerif?.ai_document_results) {
    for (const doc of existingVerif.ai_document_results) {
      if (doc.field) aiResults[doc.field] = doc;
    }
  }

  const handleUpload = async (e, field) => {
    if (e === null) {
      setUrls(u => ({ ...u, [field]: '' }));
      setFiles(f => ({ ...f, [field]: null }));
      return;
    }
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrls(u => ({ ...u, [field]: file_url }));
    setFiles(f => ({ ...f, [field]: file }));
    setUploading(u => ({ ...u, [field]: false }));
    if (e.target) e.target.value = '';
  };

  // For a rejected verif, pre-populate valid docs and let user re-upload invalid ones
  const getEffectiveUrl = (field) => {
    // If user just uploaded a new file, use that
    if (urls[field]) return urls[field];
    // If previous verif has this doc and it was valid (or no AI result), keep it
    if (existingVerif?.[field]) {
      const result = aiResults[field];
      if (!result || result.valid) return existingVerif[field];
    }
    return '';
  };

  const getFieldValue = (field) => files[field] || (getEffectiveUrl(field) ? true : null);
  const isFieldError = (field) => {
    if (!existingVerif?.ai_document_results) return false;
    const result = aiResults[field];
    // Only show error if no new file was uploaded for this field
    return result && !result.valid && !urls[field];
  };

  const handleSubmit = async () => {
    const front = getEffectiveUrl('eid_front_url');
    const back = getEffectiveUrl('eid_back_url');
    const selfie = getEffectiveUrl('selfie_url');
    const insurance = getEffectiveUrl('insurance_url');

    if (!front || !back || !selfie) {
      toast.error('Veuillez fournir le recto, verso de votre eID et un selfie');
      return;
    }
    if (isPro && !insurance) {
      toast.error("Votre attestation d'assurance RC Pro est obligatoire");
      return;
    }

    setSubmitting(true);

    // If there's an existing rejected verif, update it; otherwise create a new one
    if (existingVerif && existingVerif.status === 'rejected') {
      await base44.entities.IdentityVerification.update(existingVerif.id, {
        status: 'pending_review',
        eid_front_url: front,
        eid_back_url: back,
        selfie_url: selfie,
        insurance_url: insurance || null,
        rejection_reason: null,
        ai_document_results: null,
        ai_summary: null,
        reviewed_by: null,
        reviewed_date: null,
      });
    } else {
      await base44.entities.IdentityVerification.create({
        user_email: user.email,
        user_name: user.full_name,
        user_type: user.user_type || 'particulier',
        status: 'pending_review',
        eid_front_url: front,
        eid_back_url: back,
        selfie_url: selfie,
        insurance_url: insurance || null,
      });
    }

    await base44.auth.updateMe({ eid_status: 'pending_review' }).catch(() => {});

    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['identityVerif', user.email] });
    setSubmitting(false);
    toast.success('Dossier soumis ! Vérification en cours.');
  };

  const isRejected = existingVerif?.status === 'rejected';
  const isPending = existingVerif?.status === 'pending_review';
  const isApproved = existingVerif?.status === 'approved';
  const hasAiResults = existingVerif?.ai_document_results?.length > 0;
  const needsResubmit = !existingVerif || isRejected;

  // All required fields list
  const DOCS = [
    { field: 'eid_front_url', label: 'Recto de la carte eID', icon: Camera, capture: 'environment' },
    { field: 'eid_back_url', label: 'Verso de la carte eID', icon: Camera, capture: 'environment' },
    { field: 'selfie_url', label: 'Selfie avec votre carte eID', icon: Camera, capture: 'user' },
    ...(isPro ? [
      { field: 'insurance_url', label: "Attestation d'assurance RC Pro", icon: Upload, accept: 'image/*,application/pdf' },
    ] : []),
  ];

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

        {/* Status banners */}
        {isPending && !hasAiResults && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
            <Clock className="w-6 h-6 text-orange-600 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800">Dossier en cours de vérification</p>
              <p className="text-sm text-orange-600 mt-0.5">Notre IA analyse vos documents...</p>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Identité vérifiée ✓</p>
              <p className="text-sm text-green-600 mt-0.5">Votre compte est certifié ServiGo</p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Documents à corriger</p>
              <p className="text-sm text-red-600 mt-0.5">
                {existingVerif?.ai_summary || existingVerif?.rejection_reason || 'Veuillez re-soumettre les documents indiqués ci-dessous.'}
              </p>
            </div>
          </div>
        )}

        {/* Upload form */}
        {(needsResubmit || (!isApproved && !isPending)) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isRejected ? 'Corriger vos documents' : 'Documents requis'}
            </h2>

            {DOCS.map(({ field, label, icon, capture, accept }) => {
              const aiDoc = aiResults[field];
              const hasNewUpload = !!urls[field];
              const showError = aiDoc && !aiDoc.valid && !hasNewUpload;
              const showValid = aiDoc && aiDoc.valid && !hasNewUpload;

              return (
                <div key={field}>
                  <UploadZone
                    label={label}
                    icon={icon}
                    value={getFieldValue(field)}
                    onChange={(e) => handleUpload(e, field)}
                    loading={uploading[field]}
                    accept={accept}
                    capture={capture}
                    error={showError}
                    errorReason={showError ? aiDoc.reason : null}
                  />
                  {showValid && !hasNewUpload && (
                    <p className="text-xs text-green-600 mt-1 pl-1">✓ Ce document a été accepté — vous pouvez le laisser tel quel</p>
                  )}
                </div>
              );
            })}

            <div className="bg-muted/40 rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
              <p>🔒 Vos documents sont chiffrés et stockés de manière sécurisée</p>
              <p>⚡ La vérification est automatique via notre IA</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 rounded-2xl text-base font-bold"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
              {submitting ? 'Envoi en cours...' : isRejected ? 'Soumettre les corrections' : 'Soumettre mon dossier'}
            </Button>
          </motion.div>
        )}

        {isApproved && (
          <Button onClick={() => navigate(-1)} className="w-full h-14 rounded-2xl text-base mt-4">
            Retour au profil <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}