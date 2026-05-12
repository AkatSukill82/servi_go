import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, ShieldCheck, ArrowRight, Loader2, Upload, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
            : hasError ? <XCircle className="w-5 h-5 text-red-500" />
            : value ? <CheckCircle className="w-5 h-5 text-green-600" />
            : <Icon className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {value
            ? <p className="text-xs text-green-600 mt-0.5">✓ Téléversé</p>
            : <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou PDF</p>
          }
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
      {hasError && errorReason && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2.5">
          <p className="text-xs text-red-700 font-medium">❌ {errorReason}</p>
        </div>
      )}
    </div>
  );
}

function AnalyzingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center space-y-6"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute inset-0 rounded-3xl border-4 border-primary/20 animate-ping" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Notre IA vérifie vos documents. Cela prend généralement <strong>15 à 30 secondes</strong>.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {['Recto eID', 'Verso eID', 'Selfie', 'Documents pro'].map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
            <span>Vérification : {step}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function EidVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingVerif, refetch: refetchVerif } = useQuery({
    queryKey: ['identityVerif', user?.email],
    queryFn: () => base44.entities.IdentityVerification.filter({ user_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [urls, setUrls] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // aiResult holds the fresh result returned directly from the function call
  const [aiResult, setAiResult] = useState(null);

  const isPro = user?.user_type === 'professionnel';

  // Le statut de la DB (post-refetch) a toujours priorité — aiResult enrichit les détails par document
  const activeVerif = aiResult ? { ...aiResult, ...existingVerif } : existingVerif;

  // Build map field → AI doc result
  const aiResults = {};
  const docResults = activeVerif?.ai_document_results || [];
  for (const doc of docResults) {
    if (doc.field) aiResults[doc.field] = doc;
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

  const getEffectiveUrl = (field) => {
    if (urls[field]) return urls[field];
    if (activeVerif?.[field]) {
      const result = aiResults[field];
      if (!result || result.valid) return activeVerif[field];
    }
    return '';
  };

  const getFieldValue = (field) => files[field] || (getEffectiveUrl(field) ? true : null);

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

    // Create or update the IdentityVerification record
    let verifId;
    if (existingVerif && (existingVerif.status === 'rejected' || existingVerif.status === 'pending_review')) {
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
      verifId = existingVerif.id;
    } else {
      const created = await base44.entities.IdentityVerification.create({
        user_email: user.email,
        user_name: user.full_name,
        user_type: user.user_type || 'particulier',
        status: 'pending_review',
        eid_front_url: front,
        eid_back_url: back,
        selfie_url: selfie,
        insurance_url: insurance || null,
      });
      verifId = created.id;
    }

    setSubmitting(false);
    setAnalyzing(true);

    // Call the AI verification function directly and wait for the result
    const response = await base44.functions.invoke('verifyIdentityDocuments', { verificationId: verifId });
    const fnResult = response.data;

    setAnalyzing(false);

    // Refresh the verif record from DB to get the updated status
    await refetchVerif();
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });

    // Store the per-doc AI results locally so we can show them immediately
    if (fnResult?.aiDocumentResults) {
      setAiResult({
        status: fnResult.decision === 'approved' ? 'approved' : fnResult.decision === 'rejected' ? 'rejected' : 'pending_review',
        ai_document_results: fnResult.aiDocumentResults,
        ai_summary: fnResult.summary,
        eid_front_url: front,
        eid_back_url: back,
        selfie_url: selfie,
        insurance_url: insurance || null,
      });
    }

    // Reset uploaded files so the state is clean for re-submission
    setUrls({});
    setFiles({});
  };

  const DOCS = [
    { field: 'eid_front_url', label: 'Recto de la carte eID', icon: Camera, capture: 'environment' },
    { field: 'eid_back_url', label: 'Verso de la carte eID', icon: Camera, capture: 'environment' },
    { field: 'selfie_url', label: 'Selfie avec votre carte eID', icon: Camera, capture: 'user' },
    ...(isPro ? [{ field: 'insurance_url', label: "Attestation d'assurance RC Pro", icon: Upload, accept: 'image/*,application/pdf' }] : []),
  ];

  const currentStatus = activeVerif?.status;
  const hasDocResults = docResults.length > 0;
  const invalidDocs = docResults.filter(d => !d.valid);
  const validDocs = docResults.filter(d => d.valid);
  const isApproved = currentStatus === 'approved';
  const isRejected = currentStatus === 'rejected';
  const showForm = !isApproved && !analyzing;

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

        <AnimatePresence mode="wait">

          {/* Analyzing screen */}
          {analyzing && <AnalyzingScreen key="analyzing" />}

          {/* Results + form */}
          {!analyzing && (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* ── APPROVED ── */}
              {isApproved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Identité vérifiée ✓</p>
                    <p className="text-sm text-green-600 mt-0.5">{activeVerif?.ai_summary || 'Votre compte est certifié ServiGo'}</p>
                  </div>
                </div>
              )}

              {/* ── REJECTED: show per-doc results ── */}
              {isRejected && hasDocResults && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="font-semibold text-red-800 mb-1">📋 Résultat de l'analyse</p>
                    <p className="text-sm text-red-700">{activeVerif?.ai_summary}</p>
                  </div>

                  {/* Valid docs */}
                  {validDocs.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-green-800 uppercase tracking-wide">✅ Documents acceptés — rien à faire</p>
                      {validDocs.map(doc => (
                        <div key={doc.field} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800">{doc.label}</p>
                            <p className="text-xs text-green-600">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Invalid docs */}
                  {invalidDocs.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-red-800 uppercase tracking-wide">❌ Documents à renvoyer</p>
                      {invalidDocs.map(doc => (
                        <div key={doc.field} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">{doc.label}</p>
                            <p className="text-xs text-red-600">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── UPLOAD FORM ── */}
              {showForm && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {isRejected ? 'Corriger et renvoyer vos documents' : 'Documents requis'}
                  </h2>

                  {DOCS.map(({ field, label, icon, capture, accept }) => {
                    const aiDoc = aiResults[field];
                    const hasNewUpload = !!urls[field];
                    const showError = aiDoc && !aiDoc.valid && !hasNewUpload;
                    const showValidNote = aiDoc && aiDoc.valid && !hasNewUpload;

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
                        {showValidNote && (
                          <p className="text-xs text-green-600 mt-1 pl-1">✓ Accepté — conservé automatiquement</p>
                        )}
                      </div>
                    );
                  })}

                  <div className="bg-muted/40 rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
                    <p>🔒 Vos documents sont chiffrés et stockés de manière sécurisée</p>
                    <p>⚡ Résultat instantané par notre IA</p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || Object.values(uploading).some(Boolean)}
                    className="w-full h-14 rounded-2xl text-base font-bold"
                  >
                    {submitting
                      ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Envoi en cours...</>
                      : <><ShieldCheck className="w-5 h-5 mr-2" />{isRejected ? 'Renvoyer les corrections' : 'Soumettre mon dossier'}</>
                    }
                  </Button>
                </div>
              )}

              {isApproved && (
                <Button onClick={() => navigate(-1)} className="w-full h-14 rounded-2xl text-base mt-2">
                  Retour au profil <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}