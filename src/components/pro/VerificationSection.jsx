import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, ShieldAlert, Upload, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const DOCS = [
  { key: 'id_card_url', label: "Carte d'identité", hint: "Recto-verso" },
  { key: 'insurance_url', label: "Attestation d'assurance RC", hint: "En cours de validité" },
  { key: 'onss_url', label: "Attestation ONSS / Indépendant", hint: "Ou numéro BCE" },
];

export default function VerificationSection({ user, onUpdate }) {
  const [uploading, setUploading] = useState({});

  const handleUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ [key]: file_url, verification_status: 'pending' });
    onUpdate();
    setUploading(u => ({ ...u, [key]: false }));
    toast.success('Document envoyé ! Vérification en cours.');
  };

  const allUploaded = DOCS.every(d => user?.[d.key]);
  const status = user?.verification_status;

  const statusConfig = {
    verified: { label: 'Pro Vérifié ✓', color: 'bg-green-100 text-green-700 border-green-200', icon: ShieldCheck, iconColor: 'text-green-600' },
    pending: { label: 'Vérification en cours...', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: ShieldAlert, iconColor: 'text-yellow-500' },
    rejected: { label: 'Documents refusés', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, iconColor: 'text-red-500' },
  }[status] || null;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-600" /> Vérification du compte
        </h3>
        {statusConfig && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig.color} flex items-center gap-1`}>
            <statusConfig.icon className={`w-3.5 h-3.5 ${statusConfig.iconColor}`} />
            {statusConfig.label}
          </span>
        )}
      </div>

      {status === 'verified' ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
          <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Votre compte est vérifié !</p>
            <p className="text-xs text-green-600">Votre badge "Pro Vérifié" est visible par tous les clients.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Uploadez ces 3 documents pour obtenir le badge <strong>Pro Vérifié ✓</strong> et gagner la confiance des clients.
          </p>
          <div className="space-y-3">
            {DOCS.map(({ key, label, hint }) => {
              const uploaded = !!user?.[key];
              const loading = uploading[key];
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-100' : 'bg-muted'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : uploaded ? <FileCheck className="w-4 h-4 text-green-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{uploaded ? '✓ Document envoyé' : hint}</p>
                  </div>
                  {!uploaded && (
                    <label className="cursor-pointer shrink-0">
                      <span className="text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-1.5 transition-colors">
                        {loading ? 'Upload...' : 'Choisir'}
                      </span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleUpload(e, key)} disabled={loading} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {allUploaded && status === 'pending' && (
            <p className="text-xs text-center text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              🕐 Tous vos documents sont reçus. La vérification prend généralement 24-48h.
            </p>
          )}
        </>
      )}
    </div>
  );
}