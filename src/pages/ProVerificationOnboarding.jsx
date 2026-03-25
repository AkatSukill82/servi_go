import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, Upload, FileCheck, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DOCS = [
  { key: 'id_card_url', label: "Carte d'identité", hint: "Recto-verso (JPG, PNG ou PDF)", icon: '🪪' },
  { key: 'insurance_url', label: "Attestation d'assurance RC", hint: "En cours de validité", icon: '📄' },
  { key: 'onss_url', label: "Attestation ONSS / Indépendant", hint: "Numéro BCE/KBO obligatoire", icon: '📋' },
];

export default function ProVerificationOnboarding() {
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState({});
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);

  const handleUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploaded(u => ({ ...u, [key]: file_url }));
    setUploading(u => ({ ...u, [key]: false }));
    toast.success('Document ajouté !');
  };

  const handleSubmit = async () => {
    const anyUploaded = Object.keys(uploaded).length > 0;
    if (!anyUploaded) {
      navigate('/ProDashboard');
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({
      ...uploaded,
      verification_status: 'pending',
    });
    setSaving(false);
    toast.success('Documents envoyés ! Vérification en cours (24-48h).');
    navigate('/ProDashboard');
  };

  const allUploaded = DOCS.every(d => uploaded[d.key]);
  const anyUploaded = Object.keys(uploaded).length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Vérifiez votre compte</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Uploadez vos documents pour obtenir le badge <strong>Pro Vérifié ✓</strong> et gagner la confiance des clients.
          </p>
        </div>

        {/* Documents */}
        <div className="space-y-3">
          {DOCS.map(({ key, label, hint, icon }) => {
            const isUploaded = !!uploaded[key];
            const isLoading = uploading[key];
            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  isUploaded ? 'bg-green-50 border-green-200' : 'bg-card border-border/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${isUploaded ? 'bg-green-100' : 'bg-muted'}`}>
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    : isUploaded
                    ? <FileCheck className="w-5 h-5 text-green-600" />
                    : icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{isUploaded ? '✓ Document envoyé' : hint}</p>
                </div>
                {!isUploaded && (
                  <label className="cursor-pointer shrink-0">
                    <span className="text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-1.5 transition-colors">
                      {isLoading ? '...' : 'Choisir'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => handleUpload(e, key)}
                      disabled={isLoading}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        {allUploaded && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-center text-yellow-800">
            🕐 Tous vos documents sont reçus. La vérification prend généralement 24-48h.
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-14 rounded-xl text-base"
          >
            {saving
              ? <Loader2 className="w-5 h-5 animate-spin mr-2" />
              : <ArrowRight className="w-5 h-5 mr-2" />}
            {anyUploaded ? 'Envoyer et continuer' : 'Continuer sans vérifier'}
          </Button>
          <button
            onClick={() => navigate('/ProDashboard')}
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-2"
          >
            Passer pour l'instant
          </button>
        </div>
      </motion.div>
    </div>
  );
}