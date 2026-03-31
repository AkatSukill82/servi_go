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
  Upload, Camera, Loader2, ShieldCheck, Star, Zap, FileText, Home
} from 'lucide-react';

const STEPS = ['Type', 'Infos', 'Identité', 'Confirmation'];

function ProgressBar({ step }) {
  const pct = Math.round(((step) / (STEPS.length - 1)) * 100);
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

function FieldValidation({ valid, message }) {
  if (!message && !valid) return null;
  return (
    <p className={`text-xs mt-1 flex items-center gap-1 ${valid ? 'text-[#1D9E75]' : 'text-red-500'}`}>
      {valid ? <CheckCircle className="w-3 h-3" /> : '⚠'} {message}
    </p>
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

      <Button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="w-full h-13 rounded-xl text-base bg-[#534AB7] hover:bg-[#4338A0] disabled:opacity-40"
      >
        Continuer <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}

// ─── STEP 1: Informations personnelles ────────────────────────────────────────
function StepPersonalInfo({ userType, initialData, onNext, onBack }) {
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
  const [geoLoading, setGeoLoading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    enabled: userType === 'professionnel',
  });

  const validate = {
    first_name: form.first_name.length >= 2,
    last_name: form.last_name.length >= 2,
    birth_date: (() => {
      if (!form.birth_date) return false;
      const parts = form.birth_date.split('/');
      if (parts.length !== 3) return false;
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (isNaN(d)) return false;
      const age = (new Date() - d) / (365.25 * 24 * 3600 * 1000);
      return age >= 18;
    })(),
    address: form.address.length >= 5,
    phone: /^(\+32|0)[0-9]{8,9}$/.test(form.phone.replace(/\s/g, '')),
    category_name: userType !== 'professionnel' || !!form.category_name,
    bce_number: userType !== 'professionnel' || /^(BE\s?)?0\d{3}\.\d{3}\.\d{3}$/.test(form.bce_number) || form.bce_number === '',
    pro_description: userType !== 'professionnel' || form.pro_description.length >= 50,
  };

  const isValid = Object.values(validate).every(Boolean);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const data = await res.json();
        if (data.display_name) setForm(f => ({ ...f, address: data.display_name }));
      } catch {}
      setGeoLoading(false);
    }, () => setGeoLoading(false));
  };

  const ageError = (() => {
    if (!form.birth_date) return null;
    const parts = form.birth_date.split('/');
    if (parts.length !== 3) return null;
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (isNaN(d)) return null;
    const age = (new Date() - d) / (365.25 * 24 * 3600 * 1000);
    return age < 18 ? 'Vous devez avoir au moins 18 ans pour vous inscrire' : null;
  })();

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
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Prénom *</Label>
            <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jean" className="h-11 rounded-xl" />
            {form.first_name && <FieldValidation valid={validate.first_name} message={validate.first_name ? 'Valide' : 'Min. 2 caractères'} />}
          </div>
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 block">Nom *</Label>
            <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Dupont" className="h-11 rounded-xl" />
            {form.last_name && <FieldValidation valid={validate.last_name} message={validate.last_name ? 'Valide' : 'Min. 2 caractères'} />}
          </div>
        </div>

        <div>
          <Label className="text-xs text-[#6B7280] mb-1 block">Date de naissance * (JJ/MM/AAAA)</Label>
          <Input value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} placeholder="Ex: 15/03/1990" className="h-11 rounded-xl" />
          {form.birth_date && <FieldValidation valid={validate.birth_date} message={ageError || (validate.birth_date ? 'Valide' : 'Format incorrect')} />}
        </div>

        <div>
          <Label className="text-xs text-[#6B7280] mb-1 block">Téléphone * (format belge)</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ex: +32 477 12 34 56" className="h-11 rounded-xl" />
          {form.phone && <FieldValidation valid={validate.phone} message={validate.phone ? 'Valide' : 'Format: +32 XXXXXXXXX'} />}
        </div>

        <div>
          <Label className="text-xs text-[#6B7280] mb-1 block">Adresse complète *</Label>
          <div className="relative">
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Ex: Rue de la Loi 16, 1000 Bruxelles" className="h-11 rounded-xl pr-10" />
            <button onClick={handleGeolocate} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#534AB7]" title="Géolocaliser">
              {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            </button>
          </div>
          {form.address && <FieldValidation valid={validate.address} message={validate.address ? 'Valide' : 'Adresse trop courte'} />}
        </div>

        {userType === 'professionnel' && (
          <>
            <div className="border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#534AB7] mb-3">Informations professionnelles</p>
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1 block">Catégorie de service *</Label>
              <Select value={form.category_name} onValueChange={val => setForm(f => ({ ...f, category_name: val }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisissez votre métier" /></SelectTrigger>
                <SelectContent side="bottom" className="bg-white border border-[#E5E7EB] shadow-lg z-[9999]">
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1 block">Numéro BCE/KBO</Label>
              <Input value={form.bce_number} onChange={e => setForm(f => ({ ...f, bce_number: e.target.value }))} placeholder="Ex: 0477.123.456" className="h-11 rounded-xl" />
              {form.bce_number && <FieldValidation valid={validate.bce_number} message={validate.bce_number ? 'Valide' : 'Format: 0XXX.XXX.XXX'} />}
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1 block">Description de vos services * <span className="text-[#9CA3AF]">({form.pro_description.length}/50 min)</span></Label>
              <Textarea
                value={form.pro_description}
                onChange={e => setForm(f => ({ ...f, pro_description: e.target.value }))}
                placeholder="Décrivez vos compétences, expériences et services proposés..."
                rows={4}
                className="rounded-xl resize-none"
              />
              {form.pro_description.length > 0 && <FieldValidation valid={validate.pro_description} message={validate.pro_description ? 'Valide' : `Encore ${50 - form.pro_description.length} caractères requis`} />}
            </div>
          </>
        )}

        <Button onClick={() => isValid && onNext(form)} disabled={!isValid} className="w-full h-13 rounded-xl text-base bg-[#534AB7] hover:bg-[#4338A0] disabled:opacity-40 mt-2">
          Continuer <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 2: Vérification d'identité ─────────────────────────────────────────
function UploadZone({ label, hint, value, onChange, required = true }) {
  const [preview, setPreview] = useState(value || null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPreview(file_url);
    onChange(file_url);
    setLoading(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#6B7280] block">
        {label} {required ? '*' : <span className="text-[#9CA3AF]">(optionnel)</span>}
      </Label>
      <label className={`flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${preview ? 'border-[#1D9E75] bg-[#E1F5EE]/30' : 'border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#534AB7]/50'}`}>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-[#534AB7]" />
        ) : preview ? (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="w-6 h-6 text-[#1D9E75]" />
            <span className="text-xs text-[#1D9E75] font-medium">Document uploadé ✓</span>
            <span className="text-[10px] text-[#6B7280]">Cliquez pour remplacer</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="w-6 h-6 text-[#9CA3AF]" />
            <span className="text-xs text-[#6B7280] font-medium">Cliquez pour uploader</span>
            {hint && <span className="text-[10px] text-[#9CA3AF] text-center px-4">{hint}</span>}
          </div>
        )}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}

function StepIdentity({ userType, userName, userEmail, onNext, onBack }) {
  const [docs, setDocs] = useState({ eid_front_url: '', eid_back_url: '', selfie_url: '', insurance_url: '', onss_url: '' });
  const [saving, setSaving] = useState(false);

  const requiredDone = docs.eid_front_url && docs.eid_back_url && docs.selfie_url && (userType !== 'professionnel' || docs.insurance_url);

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
            <UploadZone label="Attestation d'assurance professionnelle" hint="Document attestant que vous êtes assuré pour exercer votre activité" value={docs.insurance_url} onChange={v => setDocs(d => ({ ...d, insurance_url: v }))} />
            <UploadZone label="Attestation ONSS" hint="Preuve de votre statut d'indépendant" value={docs.onss_url} onChange={v => setDocs(d => ({ ...d, onss_url: v }))} required={false} />
          </>
        )}

        <Button onClick={handleSubmit} disabled={!requiredDone || saving} className="w-full h-13 rounded-xl text-base bg-[#534AB7] hover:bg-[#4338A0] disabled:opacity-40 mt-2">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</> : <>Soumettre mes documents <ChevronRight className="w-5 h-5 ml-1" /></>}
        </Button>
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
          <p className="font-semibold text-sm text-[#111827]">Email vérifié ✓</p>
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

      <Button
        onClick={() => navigate(userType === 'professionnel' ? '/ProDashboard' : '/Home')}
        className="w-full h-13 rounded-xl text-base bg-[#534AB7] hover:bg-[#4338A0]"
      >
        Découvrir ServiGo <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState(null);
  const [personalData, setPersonalData] = useState({});

  const location = useLocation();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Pre-select type if coming from Landing page
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
    setPersonalData(data);
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
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
  };

  const handleIdentityNext = () => {
    setStep(3);
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
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <StepIdentity
              userType={userType}
              userName={[personalData.first_name, personalData.last_name].filter(Boolean).join(' ')}
              userEmail={user?.email}
              onNext={handleIdentityNext}
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