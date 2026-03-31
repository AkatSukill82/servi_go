import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  User, Briefcase, MapPin, CheckCircle, ChevronRight, ChevronLeft,
  Upload, Loader2, ShieldCheck, Home, X, AlertCircle
} from 'lucide-react';

const STEPS = ['Type', 'Infos', 'Identité', 'Confirmation'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAdult(str) {
  if (!str || str.length < 10) return false;
  const parts = str.split('/');
  if (parts.length !== 3) return false;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900) return false;
  const birth = new Date(year, month - 1, day);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

function isValidPhone(p) {
  return /^(\+32|0032|0)[0-9\s]{8,11}$/.test(p.trim());
}

function isValidBce(v) {
  return v === '' || /^0[0-9]{3}\.[0-9]{3}\.[0-9]{3}$/.test(v.trim());
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  return (
    <div className="w-full max-w-lg mx-auto px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#6B7280] font-medium">Étape {step + 1} sur {STEPS.length}</span>
        <span className="text-xs font-semibold text-[#534AB7]">{STEPS[step]}</span>
      </div>
      <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#534AB7] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Field component with validation ─────────────────────────────────────────
function Field({ label, required, error, touched, valid, children }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {touched && error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
      {touched && !error && valid && (
        <p className="text-xs text-[#1D9E75] mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 shrink-0" /> Valide
        </p>
      )}
    </div>
  );
}

function StyledInput({ value, onChange, onBlur, placeholder, type = 'text', suffix, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full h-11 px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] text-base ${suffix ? 'pr-10' : ''} ${className}`}
        style={{ fontSize: 16 }}
        {...props}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  );
}

// ─── STEP 0: Type de compte ───────────────────────────────────────────────────
function StepTypeChoice({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const cards = [
    {
      type: 'particulier',
      icon: Home,
      title: 'Je cherche un professionnel',
      subtitle: 'Trouvez un expert près de chez vous, gratuitement',
      badge: '100% gratuit',
      badgeColor: 'bg-[#E1F5EE] text-[#085041]',
      points: ['Accès illimité aux pros', 'Contrats sécurisés', 'Paiement direct au pro'],
    },
    {
      type: 'professionnel',
      icon: Briefcase,
      title: 'Je propose mes services',
      subtitle: 'Recevez des missions dans votre domaine',
      badge: '10 € / mois',
      badgeColor: 'bg-[#EEEDFE] text-[#534AB7]',
      points: ['Missions géolocalisées', 'Badge vérifié', 'Contrats protégés'],
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-5 pb-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#534AB7] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <h1 className="text-2xl font-bold text-[#111827]">Bienvenue sur ServiGo</h1>
        <p className="text-[#6B7280] mt-1 text-sm">Trouvez le bon professionnel, partout en Belgique</p>
      </div>

      <div className="space-y-3 mb-6">
        {cards.map(({ type, icon: Icon, title, subtitle, badge, badgeColor, points }) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              selected === type
                ? 'border-[#534AB7] bg-[#EEEDFE]/40 shadow-md'
                : 'border-[#E5E7EB] bg-white hover:border-[#534AB7]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selected === type ? 'bg-[#534AB7]' : 'bg-[#F3F4F6]'}`}>
                <Icon className={`w-6 h-6 ${selected === type ? 'text-white' : 'text-[#6B7280]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[#111827]">{title}</p>
                  {selected === type && <CheckCircle className="w-4 h-4 text-[#534AB7] shrink-0" />}
                </div>
                <p className="text-sm text-[#6B7280] mb-2">{subtitle}</p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                <ul className="mt-2 space-y-0.5">
                  {points.map(p => (
                    <li key={p} className="text-xs text-[#6B7280] flex items-center gap-1.5">
                      <span className="text-[#1D9E75]">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!selected && (
        <p className="text-center text-xs text-red-500 mb-2">Veuillez sélectionner un type de compte</p>
      )}
      <button
        onClick={() => {
          if (!selected) return;
          onSelect(selected);
        }}
        className={`w-full h-12 rounded-xl text-base font-semibold transition-colors ${
          selected
            ? 'bg-[#534AB7] hover:bg-[#4338A0] text-white'
            : 'bg-[#E5E7EB] text-[#9CA3AF]'
        }`}
      >
        Continuer <ChevronRight className="inline w-5 h-5 ml-1" />
      </button>
    </div>
  );
}

// ─── STEP 1: Informations personnelles ────────────────────────────────────────
function StepPersonalInfo({ userType, initialData, onNext, onBack, isSaving = false }) {
  const [form, setForm] = useState({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    birth_date: initialData.birth_date || '',
    address: initialData.address || '',
    phone: initialData.phone || '',
    category_name: initialData.category_name || '',
    bce_number: initialData.bce_number || '',
    pro_description: initialData.pro_description || '',
  });

  const [touched, setTouched] = useState({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    enabled: userType === 'professionnel',
  });

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }));
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const errors = {
    first_name: form.first_name.length < 2 ? 'Minimum 2 caractères' : '',
    last_name: form.last_name.length < 2 ? 'Minimum 2 caractères' : '',
    birth_date: !isAdult(form.birth_date) ? (form.birth_date.length > 0 ? 'Vous devez avoir au moins 18 ans (format JJ/MM/AAAA)' : 'Champ requis') : '',
    address: form.address.length < 5 ? 'Adresse trop courte' : '',
    phone: !isValidPhone(form.phone) ? 'Format invalide (ex: 0477 12 34 56 ou +32477123456)' : '',
    ...(userType === 'professionnel' ? {
      category_name: !form.category_name ? 'Veuillez choisir votre métier' : '',
      bce_number: !isValidBce(form.bce_number) ? 'Format invalide (ex: 0477.123.456)' : '',
      pro_description: form.pro_description.length < 50 ? `Encore ${50 - form.pro_description.length} caractères requis` : '',
    } : {}),
  };

  const baseValid = !errors.first_name && !errors.last_name && !errors.birth_date && !errors.address && !errors.phone;
  const proValid = userType !== 'professionnel' || (!errors.category_name && !errors.bce_number && !errors.pro_description);
  const canProceed = baseValid && proValid;

  const handleGeolocate = () => {
    if (!navigator.geolocation) { setGeoError("Géolocalisation non supportée"); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          set('address', data.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`);
          touch('address');
        } catch { setGeoError("Erreur lors de la récupération de l'adresse"); }
        setGeoLoading(false);
      },
      () => { setGeoError("Permission refusée. Saisissez votre adresse manuellement."); setGeoLoading(false); }
    );
  };

  const handleSubmit = () => {
    // Touch all fields to show errors
    const allFields = ['first_name', 'last_name', 'birth_date', 'address', 'phone',
      ...(userType === 'professionnel' ? ['category_name', 'bce_number', 'pro_description'] : [])];
    setTouched(Object.fromEntries(allFields.map(f => [f, true])));
    if (canProceed) onNext(form);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-5 pb-10">
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-xl font-bold text-[#111827]">Vos informations</h2>
        <p className="text-sm text-[#6B7280] mt-1">Dites-nous en plus sur vous</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" required touched={touched.first_name} error={errors.first_name} valid={!errors.first_name}>
            <StyledInput
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              onBlur={() => touch('first_name')}
              placeholder="Jean"
              className={touched.first_name ? (errors.first_name ? 'border-red-400' : 'border-[#1D9E75]') : ''}
            />
          </Field>
          <Field label="Nom" required touched={touched.last_name} error={errors.last_name} valid={!errors.last_name}>
            <StyledInput
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              onBlur={() => touch('last_name')}
              placeholder="Dupont"
              className={touched.last_name ? (errors.last_name ? 'border-red-400' : 'border-[#1D9E75]') : ''}
            />
          </Field>
        </div>

        <Field label="Date de naissance (JJ/MM/AAAA)" required touched={touched.birth_date} error={errors.birth_date} valid={!errors.birth_date}>
          <StyledInput
            value={form.birth_date}
            onChange={e => set('birth_date', e.target.value)}
            onBlur={() => touch('birth_date')}
            placeholder="15/03/1990"
            className={touched.birth_date ? (errors.birth_date ? 'border-red-400' : 'border-[#1D9E75]') : ''}
          />
        </Field>

        <Field label="Téléphone (format belge)" required touched={touched.phone} error={errors.phone} valid={!errors.phone}>
          <StyledInput
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            onBlur={() => touch('phone')}
            placeholder="0477 12 34 56"
            type="tel"
            className={touched.phone ? (errors.phone ? 'border-red-400' : 'border-[#1D9E75]') : ''}
          />
        </Field>

        <Field label="Adresse complète" required touched={touched.address} error={errors.address || geoError} valid={!errors.address && !geoError && !!form.address}>
          <StyledInput
            value={form.address}
            onChange={e => set('address', e.target.value)}
            onBlur={() => touch('address')}
            placeholder="Rue de la Loi 16, 1000 Bruxelles"
            className={touched.address ? (errors.address ? 'border-red-400' : 'border-[#1D9E75]') : ''}
            suffix={
              <button type="button" onClick={handleGeolocate} className="text-[#534AB7]" title="Géolocaliser">
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </button>
            }
          />
        </Field>

        {userType === 'professionnel' && (
          <>
            <div className="border-t border-[#E5E7EB] pt-2">
              <p className="text-sm font-semibold text-[#534AB7]">Informations professionnelles</p>
            </div>

            <Field label="Catégorie de service" required touched={touched.category_name} error={errors.category_name} valid={!errors.category_name && !!form.category_name}>
              <select
                value={form.category_name}
                onChange={e => { set('category_name', e.target.value); touch('category_name'); }}
                onBlur={() => touch('category_name')}
                className={`w-full h-11 px-3.5 border rounded-lg text-[#111827] bg-white focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] text-base ${
                  touched.category_name ? (errors.category_name ? 'border-red-400' : 'border-[#1D9E75]') : 'border-[#E5E7EB]'
                }`}
                style={{ fontSize: 16 }}
              >
                <option value="">Choisissez votre métier</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Numéro BCE/KBO" touched={touched.bce_number} error={errors.bce_number} valid={!errors.bce_number && !!form.bce_number}>
              <StyledInput
                value={form.bce_number}
                onChange={e => set('bce_number', e.target.value)}
                onBlur={() => touch('bce_number')}
                placeholder="0477.123.456"
                className={touched.bce_number && form.bce_number ? (errors.bce_number ? 'border-red-400' : 'border-[#1D9E75]') : ''}
              />
            </Field>

            <Field label={`Description de vos services (${form.pro_description.length}/50 min)`} required touched={touched.pro_description} error={errors.pro_description} valid={!errors.pro_description && form.pro_description.length >= 50}>
              <textarea
                value={form.pro_description}
                onChange={e => set('pro_description', e.target.value)}
                onBlur={() => touch('pro_description')}
                placeholder="Décrivez vos compétences, expériences et services proposés..."
                rows={4}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] resize-none text-base ${
                  touched.pro_description ? (errors.pro_description ? 'border-red-400' : 'border-[#1D9E75]') : 'border-[#E5E7EB]'
                }`}
                style={{ fontSize: 16 }}
              />
            </Field>
          </>
        )}

        {!canProceed && Object.values(touched).some(Boolean) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-0.5">
              {Object.entries(errors).filter(([,v]) => v && touched[Object.keys(errors).find(k => errors[k] === v)]).map(([key, msg]) => msg ? <p key={key}>• {msg}</p> : null)}
            </div>
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full h-12 rounded-xl text-base font-semibold transition-colors mt-2 bg-[#534AB7] hover:bg-[#4338A0] text-white cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : <>Continuer <ChevronRight className="inline w-5 h-5 ml-1" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: Vérification d'identité ─────────────────────────────────────────
function UploadZone({ label, hint, value, onChange, required = true }) {
  const [preview, setPreview] = useState(value || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) return 'Format non accepté. Utilisez JPG, PNG ou PDF.';
    if (file.size > 5 * 1024 * 1024) return `Fichier trop volumineux (${(file.size/1024/1024).toFixed(1)}MB). Maximum 5MB.`;
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
        <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#534AB7]/50">
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

function StepIdentity({ userType, userName, userEmail, onNext, onBack }) {
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
    setSaving(false);
    onNext();
  };

  return (
    <div className="w-full max-w-lg mx-auto px-5 pb-10">
      <div className="mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-xl font-bold text-[#111827]">Vérification d'identité</h2>
        <p className="text-sm text-[#6B7280] mt-1">Obligatoire pour tous les membres</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <p className="text-sm text-blue-800 font-semibold mb-1">🔒 Pourquoi cette étape ?</p>
        <p className="text-xs text-blue-700">Pour la sécurité de tous, ServiGo vérifie l'identité de chaque membre. Cela protège les clients contre les arnaques et les professionnels contre les faux clients.</p>
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

        <button
          onClick={handleSubmit}
          disabled={!requiredDone || saving}
          className={`w-full h-12 rounded-xl text-base font-semibold transition-colors mt-2 ${
            requiredDone && !saving
              ? 'bg-[#534AB7] hover:bg-[#4338A0] text-white cursor-pointer'
              : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
          }`}
        >
          {saving ? <><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Envoi en cours...</> : <>Soumettre mes documents <ChevronRight className="inline w-5 h-5 ml-1" /></>}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 3: Confirmation ─────────────────────────────────────────────────────
function StepConfirmation({ userType, firstName, navigate }) {
  return (
    <div className="w-full max-w-lg mx-auto px-5 pb-10 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="w-24 h-24 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-6 mt-4">
        <CheckCircle className="w-12 h-12 text-[#1D9E75]" strokeWidth={1.5} />
      </motion.div>

      <h1 className="text-2xl font-bold text-[#111827] mb-2">Bienvenue, {firstName || 'chez ServiGo'} !</h1>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-6 text-left shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#1D9E75]" />
          <p className="font-semibold text-sm text-[#111827]">Compte créé ✓</p>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#F59E0B] flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-[#F59E0B] rounded-full" />
          </div>
          <p className="font-semibold text-sm text-[#111827]">Vérification d'identité en cours</p>
        </div>
        <p className="text-xs text-[#6B7280] bg-[#F9FAFB] rounded-xl p-3">
          {userType === 'particulier'
            ? 'Vos documents sont en cours de vérification (24h max). En attendant, vous pouvez découvrir les professionnels disponibles près de chez vous.'
            : 'Vos documents sont en cours de vérification (24h max). Une fois approuvé, vous pourrez vous abonner et commencer à recevoir des missions.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {(userType === 'particulier'
          ? [{ icon: '🔍', text: 'Trouvez des pros' }, { icon: '📋', text: 'Contrats signés' }, { icon: '⭐', text: 'Avis vérifiés' }]
          : [{ icon: '📩', text: 'Missions reçues' }, { icon: '✅', text: 'Badge vérifié' }, { icon: '💰', text: '0% commission' }]
        ).map(({ icon, text }) => (
          <div key={text} className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <span className="text-2xl block mb-1">{icon}</span>
            <p className="text-xs font-medium text-[#6B7280]">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(userType === 'professionnel' ? '/ProDashboard' : '/Home')}
        className="w-full h-12 rounded-xl text-base font-semibold bg-[#534AB7] hover:bg-[#4338A0] text-white transition-colors"
      >
        Découvrir ServiGo <ChevronRight className="inline w-5 h-5 ml-1" />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState(null);
  const [personalData, setPersonalData] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const preselected = location.state?.preselectedType;
    if (preselected) {
      setUserType(preselected);
      setStep(1);
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  const handleTypeSelect = (type) => {
    setUserType(type);
    setStep(1);
  };

  const handlePersonalNext = async (data) => {
    setSaving(true);
    setPersonalData(data);
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
    try {
      await saveMutation.mutateAsync({
        user_type: userType,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        birth_date: data.birth_date,
        address: data.address,
        phone: data.phone,
        ...(userType === 'professionnel' ? {
          category_name: data.category_name,
          bce_number: data.bce_number,
          pro_description: data.pro_description,
        } : {}),
      });
      setStep(2);
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde. Vérifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#F7F6F3] overflow-y-auto" style={{ height: '100dvh' }}>
      <ProgressBar step={step} />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <StepTypeChoice onSelect={handleTypeSelect} />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <StepPersonalInfo
              userType={userType}
              initialData={{ ...personalData, ...user }}
              onNext={handlePersonalNext}
              onBack={() => setStep(0)}
              isSaving={saving}
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <StepIdentity
              userType={userType}
              userName={[personalData.first_name, personalData.last_name].filter(Boolean).join(' ')}
              userEmail={user?.email}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <StepConfirmation
              userType={userType}
              firstName={personalData.first_name || user?.first_name}
              navigate={navigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}