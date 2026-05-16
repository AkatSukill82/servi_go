import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Loader2, Upload, CheckCircle, X, AlertCircle } from 'lucide-react';

function UploadZone({ label, hint, value, onChange, required = true }) {
  const [preview, setPreview] = useState(value || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) return 'Format non accepté. Utilisez JPG, PNG ou PDF.';
    if (file.size > 5 * 1024 * 1024) return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 5MB.`;
    return null;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const isImage = file.type.startsWith('image/');
    setPreview(isImage ? URL.createObjectURL(file) : file_url);
    onChange(file_url);
    setLoading(false);
  };

  const handleRemove = () => { setPreview(null); onChange(''); };

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#111827]">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-[#9CA3AF] font-normal">(optionnel)</span>}
      </label>
      {preview && value ? (
        <div className="relative w-full h-28 rounded-xl border border-[#1D9E75] bg-[#E1F5EE]/30 overflow-hidden flex items-center justify-center">
          {preview.startsWith('blob:') || preview.startsWith('http') ? (
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <CheckCircle className="w-6 h-6 text-[#1D9E75]" />
              <span className="text-xs text-[#1D9E75] font-medium">Document uploadé ✓</span>
            </div>
          )}
          <button onClick={handleRemove} className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors border-border bg-muted/30 hover:border-[#534AB7]/50">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#534AB7]" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-6 h-6 text-[#9CA3AF]" />
              <span className="text-xs text-[#6B7280] font-medium">Cliquez pour uploader</span>
              {hint && <span className="text-[10px] text-[#9CA3AF] text-center px-4">{hint}</span>}
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} />
        </label>
      )}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

export default function StepIdentity({ userType, userName, userEmail, onNext, onBack }) {
  const [docs, setDocs] = useState({ eid_front_url: '', eid_back_url: '', selfie_url: '', insurance_url: '', onss_url: '' });
  const [saving, setSaving] = useState(false);

  const requiredDone = docs.eid_front_url && docs.eid_back_url && docs.selfie_url &&
    (userType !== 'professionnel' || docs.insurance_url);

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.IdentityVerification.create({
      user_email: userEmail,
      user_name: userName,
      user_type: userType,
      status: 'pending_review',
      ...docs,
    });
    await base44.auth.updateMe({ eid_status: 'pending' });

    if (userType === 'professionnel') {
      await base44.entities.ProSubscription.create({
        professional_email: userEmail,
        professional_name: userName,
        plan: 'monthly',
        price: 10,
        status: 'pending_payment',
        payment_method: 'stripe',
        auto_renew: true,
        missions_received: 0,
      }).catch(() => {});

      const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      await Promise.all(DAYS.map((day, i) =>
        base44.entities.ProAvailability.create({
          professional_email: userEmail,
          day_of_week: i,
          day_label: day,
          is_day_off: i >= 5,
          slots: i < 5 ? [{ start: '08:00', end: '18:00', available: true }] : [],
        }).catch(() => {})
      ));
    }

    setSaving(false);
    onNext();
  };

  return (
    <div className="w-full md:max-w-lg mx-auto px-5 pb-10">
      <div className="mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-xl font-bold text-[#111827]">Vérification d'identité</h2>
        <p className="text-sm text-[#6B7280] mt-1">Obligatoire pour tous les membres</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-1">🔒 Pourquoi cette étape ?</p>
        <p className="text-xs text-blue-700 dark:text-blue-400">Pour la sécurité de tous, ServiGo vérifie l'identité de chaque membre. Cela protège les clients contre les arnaques et les professionnels contre les faux clients.</p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-[#111827]">Carte d'identité belge (eID)</p>
        <UploadZone label="Recto de votre eID" hint="Tous les champs doivent être lisibles" value={docs.eid_front_url} onChange={v => setDocs(d => ({ ...d, eid_front_url: v }))} />
        <UploadZone label="Verso de votre eID" hint="Côté avec la puce et le code-barres" value={docs.eid_back_url} onChange={v => setDocs(d => ({ ...d, eid_back_url: v }))} />
        <UploadZone label="Selfie avec votre eID" hint="Tenez votre carte à côté de votre visage, les deux visibles et nets" value={docs.selfie_url} onChange={v => setDocs(d => ({ ...d, selfie_url: v }))} />

        {userType === 'professionnel' && (
          <>
            <p className="text-sm font-semibold text-[#111827] pt-2">Documents professionnels</p>
            <UploadZone label="Attestation d'assurance professionnelle" hint="Document attestant que vous êtes assuré pour exercer" value={docs.insurance_url} onChange={v => setDocs(d => ({ ...d, insurance_url: v }))} />
            <UploadZone label="Attestation ONSS" hint="Preuve de votre statut d'indépendant" value={docs.onss_url} onChange={v => setDocs(d => ({ ...d, onss_url: v }))} required={false} />
          </>
        )}

        <button onClick={handleSubmit} disabled={!requiredDone || saving}
          className={`w-full h-12 rounded-xl text-base font-semibold transition-colors mt-2 ${
            requiredDone && !saving ? 'text-white cursor-pointer' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
          }`}
          style={requiredDone && !saving ? { backgroundColor: '#FF6B35' } : {}}>
          {saving ? <><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Envoi en cours...</> : <>Soumettre mes documents <ChevronRight className="inline w-5 h-5 ml-1" /></>}
        </button>
      </div>
    </div>
  );
}
