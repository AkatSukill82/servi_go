import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { Loader2, Eye, EyeOff, ArrowLeft, ChevronRight, Check, Camera } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ─────────────────────────────────────────────────────────────────

const INDEPENDENCE_ITEMS = [
  { key: 'bce_confirmed', label: 'Je suis inscrit au BCE en tant qu\'indépendant', required: true },
  { key: 'free_pricing', label: 'Je fixe librement mes tarifs sur ServiGo', required: true },
  { key: 'free_schedule', label: 'Je définis librement mes horaires et disponibilités', required: true },
  { key: 'can_refuse', label: 'Je peux refuser toute mission sans pénalité', required: true },
  { key: 'own_tools', label: 'J\'utilise mon propre matériel et outils', required: false },
  { key: 'own_insurance', label: 'J\'ai ma propre assurance RC professionnelle', required: false },
  { key: 'multi_platform', label: 'Je peux travailler pour d\'autres plateformes', required: false },
  { key: 'no_exclusivity', label: 'Aucune exclusivité ne m\'est imposée', required: false },
];

const LEGAL_FORMS = [
  { value: 'independant_pp', label: 'Indépendant personne physique' },
  { value: 'srl', label: 'SRL' },
  { value: 'sa', label: 'SA' },
  { value: 'autre', label: 'Autre' },
];

const NATIONALITIES = ['Belge', 'Française', 'Néerlandaise', 'Allemande', 'Luxembourgeoise', 'Italienne', 'Espagnole', 'Portugaise', 'Autre'];

// ─── Shared UI Primitives ──────────────────────────────────────────────────────

/** Underline field — Uber/Heetch style */
function Field({ label, children }) {
  return (
    <div className="border-b border-gray-200 pb-3 focus-within:border-gray-900 transition-colors">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', inputMode, rightEl }) {
  return (
    <div className="relative flex items-center">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        className="w-full text-[17px] text-gray-900 placeholder:text-gray-300 bg-transparent outline-none py-1 pr-8"
        style={{ fontSize: 17 }}
      />
      {rightEl && <div className="absolute right-0">{rightEl}</div>}
    </div>
  );
}

/** Full-width primary CTA */
function CTA({ label, onClick, type = 'button', loading = false, accent = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`w-full h-14 rounded-2xl font-semibold text-[16px] flex items-center justify-center transition-opacity active:opacity-80 disabled:opacity-50 ${
        accent
          ? 'bg-[#FF6B35] text-white'
          : 'bg-gray-900 text-white'
      }`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </button>
  );
}

/** Minimal step indicator — just a thin progress line + "1 / 4" */
function StepBar({ current, total }) {
  return (
    <div className="mb-8">
      <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-2 text-right">{current} / {total}</p>
    </div>
  );
}

// ─── Screen: Type Selection ────────────────────────────────────────────────────

function ScreenTypeSelection({ onSelect }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center pt-16 pb-10">
        <div className="w-14 h-14 rounded-3xl bg-[#FF6B35] flex items-center justify-center mb-8">
          <ServiGoIcon size={30} white />
        </div>
        <h1 className="text-[34px] font-bold text-gray-900 leading-[1.15] tracking-tight">
          Bienvenue<br />sur ServiGo
        </h1>
        <p className="text-[16px] text-gray-400 mt-3 leading-relaxed">
          La plateforme d'artisans de confiance en Belgique.
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-3 pb-6">
        <button
          onClick={() => onSelect('particulier')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
          <span className="text-2xl">🏠</span>
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-gray-900">Je suis particulier</p>
            <p className="text-[13px] text-gray-400 mt-0.5">Trouver un pro — gratuit</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>

        <button
          onClick={() => onSelect('professionnel')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
          <span className="text-2xl">🔧</span>
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-gray-900">Je suis professionnel</p>
            <p className="text-[13px] text-gray-400 mt-0.5">Recevoir des missions — 10€/mois</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>
      </div>

      <p className="text-center text-[13px] text-gray-400 pb-6">
        Déjà un compte ?{' '}
        <button onClick={() => navigate('/se-connecter')} className="text-gray-900 font-semibold">
          Se connecter
        </button>
      </p>
    </div>
  );
}

// ─── Screen: Particulier Signup ───────────────────────────────────────────────

function ScreenParticulier({ onBack }) {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (form.password.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return; }
    if (!cgu) { toast.error('Acceptez les CGU pour continuer'); return; }
    setLoading(true);
    try {
      await base44.auth.register(form.email.trim(), form.password, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        phone: form.phone.trim(),
        user_type: 'particulier',
      });
      navigate('/Home', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      toast.error(msg.toLowerCase().includes('already') ? 'Email déjà utilisé' : 'Erreur — réessayez');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="pt-2 pb-8">
        <p className="text-[13px] text-gray-400 mb-1">Particulier · Accès gratuit</p>
        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Créer un compte</h2>
      </div>

      <div className="space-y-6 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom">
            <TextInput value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jean" />
          </Field>
          <Field label="Nom">
            <TextInput value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Dupont" />
          </Field>
        </div>
        <Field label="Email">
          <TextInput value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@email.com" type="email" inputMode="email" />
        </Field>
        <Field label="Téléphone">
          <TextInput value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 470 12 34 56" type="tel" inputMode="tel" />
        </Field>
        <Field label="Mot de passe">
          <TextInput
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="6 caractères minimum"
            type={showPass ? 'text' : 'password'}
            rightEl={
              <button type="button" onClick={() => setShowPass(s => !s)} className="p-1">
                {showPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            }
          />
        </Field>
      </div>

      <div className="mt-8 space-y-5">
        <button onClick={() => setCgu(v => !v)} className="flex items-start gap-3 text-left w-full">
          <div className={`w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${cgu ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
            {cgu && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <span className="text-[13px] text-gray-500 leading-relaxed">
            J'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline">CGU</a> et la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline">Politique de confidentialité</a>
          </span>
        </button>
        <CTA label="Créer mon compte" onClick={handleSubmit} loading={loading} accent />
      </div>
    </div>
  );
}

// ─── Pro: Step 1 — Coordonnées ─────────────────────────────────────────────────

function ProStep1({ data, onChange, onNext }) {
  const [showPass, setShowPass] = useState(false);
  const validate = () => {
    if (!data.first_name || !data.last_name || !data.email || !data.password) { toast.error('Champs requis manquants'); return false; }
    if (data.password.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return false; }
    return true;
  };
  return (
    <div className="flex flex-col min-h-full">
      <div className="pb-8">
        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Vos coordonnées</h2>
      </div>
      <div className="space-y-6 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom">
            <TextInput value={data.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="Jean" />
          </Field>
          <Field label="Nom">
            <TextInput value={data.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Dupont" />
          </Field>
        </div>
        <Field label="Email">
          <TextInput value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="jean@email.com" type="email" inputMode="email" />
        </Field>
        <Field label="Téléphone">
          <TextInput value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+32 470 12 34 56" type="tel" inputMode="tel" />
        </Field>
        <Field label="Mot de passe">
          <TextInput
            value={data.password}
            onChange={e => onChange('password', e.target.value)}
            placeholder="6 caractères minimum"
            type={showPass ? 'text' : 'password'}
            rightEl={
              <button type="button" onClick={() => setShowPass(s => !s)} className="p-1">
                {showPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            }
          />
        </Field>
      </div>
      <div className="mt-8">
        <CTA label="Continuer" onClick={() => validate() && onNext()} />
      </div>
    </div>
  );
}

// ─── Pro: Step 2 — Activité ────────────────────────────────────────────────────

function ProStep2({ data, onChange, onNext }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000,
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange('photo_url', file_url);
    } catch { toast.error('Erreur upload photo'); }
  };

  const validate = () => {
    if (!data.bce_number || !data.category_name) { toast.error('BCE et catégorie requis'); return false; }
    return true;
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="pb-8">
        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Votre activité</h2>
      </div>

      <div className="space-y-6 flex-1">
        {/* Photo upload — minimal touch target */}
        <label className="flex items-center gap-4 cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {data.photo_url
              ? <img src={data.photo_url} alt="" className="w-full h-full object-cover" />
              : <Camera className="w-6 h-6 text-gray-400" />}
          </div>
          <div>
            <p className="text-[15px] font-medium text-gray-900">Photo de profil</p>
            <p className="text-[13px] text-gray-400">{data.photo_url ? 'Changer' : 'Ajouter une photo'}</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>

        <Field label="Numéro BCE / KBO">
          <TextInput value={data.bce_number} onChange={e => onChange('bce_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" />
        </Field>
        <Field label="Numéro TVA (optionnel)">
          <TextInput value={data.vat_number} onChange={e => onChange('vat_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" />
        </Field>
        <Field label="Métier">
          <Select value={data.category_name} onValueChange={v => onChange('category_name', v)}>
            <SelectTrigger className="border-0 p-0 h-auto shadow-none text-[17px] text-gray-900 focus:ring-0 bg-transparent">
              <SelectValue placeholder="Choisissez votre métier" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Adresse professionnelle">
          <TextInput value={data.address} onChange={e => onChange('address', e.target.value)} placeholder="Rue de la Loi 16, 1000 Bruxelles" />
        </Field>
        <Field label="Description (optionnel)">
          <textarea
            value={data.description}
            onChange={e => onChange('description', e.target.value)}
            placeholder="Vos compétences, expériences..."
            rows={3}
            className="w-full text-[17px] text-gray-900 placeholder:text-gray-300 bg-transparent outline-none py-1 resize-none"
            style={{ fontSize: 17 }}
          />
        </Field>
      </div>
      <div className="mt-8">
        <CTA label="Continuer" onClick={() => validate() && onNext()} />
      </div>
    </div>
  );
}

// ─── Pro: Step 3 — Charte d'indépendance ──────────────────────────────────────

function ProStep3({ data, onChange, onNext }) {
  const checks = data.independence_checks || {};
  const setCheck = (key, val) => onChange('independence_checks', { ...checks, [key]: val });
  const allRequired = INDEPENDENCE_ITEMS.filter(i => i.required).every(i => checks[i.key]);

  const validate = () => {
    if (!allRequired) { toast.error('Cochez les cases obligatoires'); return false; }
    if (!data.insurance_company || !data.insurance_policy) { toast.error('Assurance RC Pro requise'); return false; }
    return true;
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="pb-6">
        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Charte d'indépendance</h2>
        <p className="text-[14px] text-gray-400 mt-1">Déclaration annuelle obligatoire</p>
      </div>

      <div className="space-y-1 flex-1">
        {INDEPENDENCE_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setCheck(item.key, !checks[item.key])}
            className="w-full flex items-start gap-4 py-3.5 text-left active:bg-gray-50 rounded-xl transition-colors"
          >
            <div className={`w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${checks[item.key] ? 'bg-gray-900 border-gray-900' : 'border-gray-200'}`}>
              {checks[item.key] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[15px] text-gray-700 leading-snug flex-1">
              {item.label}
              {item.required && <span className="text-[#FF6B35] ml-1">·</span>}
            </span>
          </button>
        ))}

        <div className="pt-4 border-t border-gray-100 mt-2 space-y-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Assurance RC Pro</p>
          <Field label="Assureur">
            <TextInput value={data.insurance_company || ''} onChange={e => onChange('insurance_company', e.target.value)} placeholder="AXA, Allianz, AG…" />
          </Field>
          <Field label="Numéro de police">
            <TextInput value={data.insurance_policy || ''} onChange={e => onChange('insurance_policy', e.target.value)} placeholder="RC-2024-XXXXXX" />
          </Field>
        </div>
      </div>

      <div className="mt-8">
        <CTA label="Je confirme" onClick={() => validate() && onNext()} />
      </div>
    </div>
  );
}

// ─── Pro: Step 4 — DAC7 ────────────────────────────────────────────────────────

function ProStep4({ data, onChange, onSubmit, loading }) {
  const validate = () => {
    if (!data.date_of_birth || !data.tin_number || !data.iban) { toast.error('Date de naissance, NIF et IBAN requis'); return false; }
    return true;
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="pb-2">
        <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Données fiscales</h2>
        <p className="text-[14px] text-gray-400 mt-1">Directive européenne DAC7</p>
      </div>

      <div className="space-y-5 flex-1 mt-6">
        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Identité</p>
        <Field label="Date de naissance">
          <input
            type="date"
            value={data.date_of_birth || ''}
            onChange={e => onChange('date_of_birth', e.target.value)}
            className="w-full text-[17px] text-gray-900 bg-transparent outline-none py-1"
            style={{ fontSize: 17 }}
          />
        </Field>
        <Field label="Nationalité">
          <Select value={data.nationality || ''} onValueChange={v => onChange('nationality', v)}>
            <SelectTrigger className="border-0 p-0 h-auto shadow-none text-[17px] text-gray-900 focus:ring-0 bg-transparent">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium pt-2">Adresse</p>
        <Field label="Rue et numéro">
          <TextInput value={data.address_street || ''} onChange={e => onChange('address_street', e.target.value)} placeholder="Rue de la Loi 16" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code postal">
            <TextInput value={data.address_postal_code || ''} onChange={e => onChange('address_postal_code', e.target.value)} placeholder="1000" />
          </Field>
          <Field label="Ville">
            <TextInput value={data.address_city || ''} onChange={e => onChange('address_city', e.target.value)} placeholder="Bruxelles" />
          </Field>
        </div>

        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium pt-2">Fiscal</p>
        <Field label="NIF / Numéro national">
          <TextInput value={data.tin_number || ''} onChange={e => onChange('tin_number', e.target.value)} placeholder="XX.XX.XX-XXX.XX" />
        </Field>
        <Field label="Forme juridique">
          <Select value={data.legal_form || ''} onValueChange={v => onChange('legal_form', v)}>
            <SelectTrigger className="border-0 p-0 h-auto shadow-none text-[17px] text-gray-900 focus:ring-0 bg-transparent">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>{LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium pt-2">Banque</p>
        <Field label="IBAN">
          <TextInput value={data.iban || ''} onChange={e => onChange('iban', e.target.value)} placeholder="BE68 5390 0754 7034" />
        </Field>
        <Field label="BIC / SWIFT (optionnel)">
          <TextInput value={data.bic || ''} onChange={e => onChange('bic', e.target.value)} placeholder="GEBABEBB" />
        </Field>
      </div>

      <div className="mt-8">
        <CTA label="Finaliser l'inscription" onClick={() => validate() && onSubmit()} loading={loading} accent />
      </div>
    </div>
  );
}

// ─── Pro Signup (multi-step) ───────────────────────────────────────────────────

function ProSignup({ onBack }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [proData, setProData] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    bce_number: '', vat_number: '', category_name: '', address: '', description: '', photo_url: '',
    insurance_company: '', insurance_policy: '', independence_checks: {},
    date_of_birth: '', nationality: '', address_street: '', address_postal_code: '', address_city: '',
    tin_number: '', legal_form: '', iban: '', bic: '',
  });

  const set = (key, val) => setProData(d => ({ ...d, [key]: val }));

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      await base44.auth.register(proData.email.trim(), proData.password, {
        first_name: proData.first_name.trim(),
        last_name: proData.last_name.trim(),
        full_name: `${proData.first_name.trim()} ${proData.last_name.trim()}`,
        phone: proData.phone.trim(),
        address: proData.address.trim(),
        photo_url: proData.photo_url || '',
        user_type: 'professionnel',
        category_name: proData.category_name,
        bce_number: proData.bce_number.trim(),
        vat_number: proData.vat_number.trim(),
        pro_description: proData.description.trim(),
        available: true,
        independence_charter_signed: true,
        independence_charter_date: new Date().toISOString().split('T')[0],
        dac7_completed: true,
      });

      const user = await base44.auth.me();
      const today = new Date().toISOString().split('T')[0];
      const renewal = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
      const checks = proData.independence_checks || {};

      await base44.entities.ProIndependenceDeclaration.create({
        professional_email: user.email,
        professional_name: `${proData.first_name} ${proData.last_name}`.trim(),
        bce_number: proData.bce_number.trim(),
        vat_number: proData.vat_number.trim(),
        insurance_company: proData.insurance_company.trim(),
        insurance_policy_number: proData.insurance_policy.trim(),
        confirms_independent_status: !!checks.bce_confirmed,
        confirms_free_pricing: !!checks.free_pricing,
        confirms_free_schedule: !!checks.free_schedule,
        confirms_free_refusal: !!checks.can_refuse,
        confirms_own_tools: !!checks.own_tools,
        confirms_own_insurance: !!checks.own_insurance,
        confirms_multi_platform: !!checks.multi_platform,
        confirms_no_exclusivity: !!checks.no_exclusivity,
        accepted_at: today,
        renewal_required_date: renewal,
        declaration_version: '1.0',
        is_active: true,
      });

      await base44.entities.DAC7ProProfile.create({
        professional_email: user.email,
        professional_name: `${proData.first_name} ${proData.last_name}`.trim(),
        first_name: proData.first_name.trim(),
        last_name: proData.last_name.trim(),
        date_of_birth: proData.date_of_birth,
        nationality: proData.nationality,
        address_street: proData.address_street,
        address_postal_code: proData.address_postal_code,
        address_city: proData.address_city,
        address_country: 'Belgique',
        tin_number: proData.tin_number,
        bce_number: proData.bce_number.trim(),
        vat_number: proData.vat_number.trim(),
        iban: proData.iban,
        bic: proData.bic,
        legal_form: proData.legal_form,
        is_complete: !!(proData.date_of_birth && proData.tin_number && proData.iban),
        is_verified: false,
        data_collection_date: today,
        last_updated: today,
      });

      try {
        await base44.entities.Professional.create({
          name: `${proData.first_name} ${proData.last_name}`.trim(),
          email: user.email,
          phone: proData.phone?.trim() || '',
          address: proData.address?.trim() || '',
          photo_url: proData.photo_url || '',
          category_name: proData.category_name,
          pro_description: proData.description?.trim() || '',
          available: true,
          verification_status: 'pending',
        });
      } catch (e) {
        console.warn('Professional profile (non-blocking):', e.message);
      }

      navigate('/ProDashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      toast.error(msg.toLowerCase().includes('already') ? 'Email déjà utilisé' : 'Erreur — réessayez');
      if (msg.toLowerCase().includes('already')) setStep(1);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <StepBar current={step} total={4} />
      {step === 1 && <ProStep1 data={proData} onChange={set} onNext={() => setStep(2)} />}
      {step === 2 && <ProStep2 data={proData} onChange={set} onNext={() => setStep(3)} />}
      {step === 3 && <ProStep3 data={proData} onChange={set} onNext={() => setStep(4)} />}
      {step === 4 && <ProStep4 data={proData} onChange={set} onSubmit={handleFinalSubmit} loading={loading} />}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateAccount() {
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
        else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
        else navigate('/Home', { replace: true });
      }
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Back button — floats top-left when inside a step */}
      {userType !== null && (
        <div className="absolute top-0 left-0 z-10 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingLeft: 24 }}>
          <button
            onClick={() => setUserType(null)}
            className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-6 w-full max-w-md mx-auto flex flex-col"
          style={{
            minHeight: '100%',
            paddingTop: userType === null
              ? 'max(env(safe-area-inset-top), 64px)'
              : 'max(env(safe-area-inset-top), 72px)',
            paddingBottom: 32,
          }}
        >
          {userType === null && <ScreenTypeSelection onSelect={setUserType} />}
          {userType === 'particulier' && <ScreenParticulier onBack={() => setUserType(null)} />}
          {userType === 'professionnel' && <ProSignup onBack={() => setUserType(null)} />}
        </div>
      </div>

      {/* Legal footer */}
      <div className="text-center pb-safe shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <p className="text-[12px] text-gray-300">
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">CGU</a>
          {' · '}
          <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">Confidentialité</a>
        </p>
      </div>
    </div>
  );
}