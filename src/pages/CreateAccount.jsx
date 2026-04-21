import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import {
  Loader2, Eye, EyeOff, ArrowLeft, ArrowRight,
  Shield, CheckCircle, Home, Wrench, Camera
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDEPENDENCE_ITEMS = [
  { key: 'bce_confirmed', label: 'Je suis inscrit au BCE en tant qu\'indépendant', required: true },
  { key: 'free_pricing', label: 'Je fixe librement mes tarifs sur ServiGo', required: true },
  { key: 'free_schedule', label: 'Je définis librement mes horaires et disponibilités', required: true },
  { key: 'can_refuse', label: 'Je peux refuser toute mission sans pénalité', required: true },
  { key: 'own_tools', label: 'J\'utilise mon propre matériel et outils', required: false },
  { key: 'own_insurance', label: 'J\'ai ma propre assurance RC professionnelle', required: false },
  { key: 'multi_platform', label: 'Je peux travailler pour d\'autres plateformes ou clients directs', required: false },
  { key: 'no_exclusivity', label: 'Aucune exclusivité ne m\'est imposée par ServiGo', required: false },
  { key: 'own_clients', label: 'Je peux démarcher mes propres clients en dehors de ServiGo', required: false },
];

const LEGAL_FORMS = [
  { value: 'independant_pp', label: 'Indépendant personne physique' },
  { value: 'srl', label: 'SRL' },
  { value: 'sa', label: 'SA' },
  { value: 'autre', label: 'Autre' },
];

const NATIONALITIES = ['Belge', 'Française', 'Néerlandaise', 'Allemande', 'Luxembourgeoise', 'Italienne', 'Espagnole', 'Portugaise', 'Autre'];
const PRO_STEPS = ['Infos', 'Activité', 'Charte', 'DAC7'];

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total, labels }) {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-3">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
              i < current - 1
                ? 'bg-gray-900 text-white'
                : i === current - 1
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {i < current - 1 ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] text-gray-400 mt-1 text-center leading-tight hidden sm:block">{label}</span>
          </div>
        ))}
      </div>
      <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step: Type Selection ─────────────────────────────────────────────────────

function StepTypeSelection({ onSelect }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 pb-8">
      {/* Logo + Title */}
      <div className="pt-4 pb-2">
        <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-6">
          <ServiGoIcon size={28} white />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Bienvenue sur<br />ServiGo</h1>
        <p className="text-gray-500 mt-2 text-base">Votre plateforme d'artisans de confiance en Belgique.</p>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        <button
          onClick={() => onSelect('particulier')}
          className="w-full bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all rounded-2xl p-5 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Je suis particulier</p>
              <p className="text-sm text-gray-500 mt-0.5">Trouver un pro à domicile</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </button>

        <button
          onClick={() => onSelect('professionnel')}
          className="w-full bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all rounded-2xl p-5 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-900/5 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Je suis professionnel</p>
              <p className="text-sm text-gray-500 mt-0.5">Recevoir des missions · 10€/mois</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </button>
      </div>

      {/* Login */}
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/se-connecter')} className="text-gray-900 font-semibold underline underline-offset-2">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Particulier Signup ───────────────────────────────────────────────────────

function ParticulierSignup({ onBack }) {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', address: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }
    if (form.password.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return; }
    if (!cguAccepted) { toast.error('Veuillez accepter les CGU'); return; }
    setLoading(true);
    try {
      await base44.auth.register(form.email.trim(), form.password, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        phone: form.phone.trim(),
        address: form.address.trim(),
        user_type: 'particulier',
      });
      toast.success('Compte créé avec succès ! Bienvenue 🎉');
      navigate('/Home', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        toast.error('Un compte existe déjà avec cet email');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="pt-2 pb-2">
        <h2 className="text-2xl font-bold text-gray-900">Créer un compte</h2>
        <p className="text-gray-500 text-sm mt-1">Particulier · Accès gratuit</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Prénom *</label>
          <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jean" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nom *</label>
          <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Dupont" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Email *</label>
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@email.com" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" inputMode="email" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Téléphone</label>
        <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 470 12 34 56" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" inputMode="tel" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Adresse</label>
        <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rue de la Loi 16, 1000 Bruxelles" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Mot de passe *</label>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="6 caractères minimum" className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white pr-10" />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <div onClick={() => setCguAccepted(v => !v)} className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${cguAccepted ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
          {cguAccepted && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        <span className="text-xs text-gray-500 leading-relaxed">
          J'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline underline-offset-2">CGU</a> et la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline underline-offset-2">Politique de confidentialité</a>
        </span>
      </label>

      <button type="submit" disabled={loading} className="w-full h-13 rounded-2xl bg-[#FF6B35] text-white font-semibold text-base transition-opacity disabled:opacity-60 flex items-center justify-center gap-2" style={{ height: 52 }}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte'}
      </button>
    </form>
  );
}

// ─── Pro Step 1: Basic Info ───────────────────────────────────────────────────

function ProStep1({ data, onChange, onNext, onBack }) {
  const [showPass, setShowPass] = useState(false);
  const validate = () => {
    if (!data.first_name || !data.last_name || !data.email || !data.password) { toast.error('Champs obligatoires manquants (*)'); return false; }
    if (data.password.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return false; }
    return true;
  };
  return (
    <div className="space-y-5 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Étape 1 / 4</p>
        <h2 className="text-2xl font-bold text-gray-900">Vos coordonnées</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Prénom *</label>
          <Input value={data.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="Jean" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nom *</label>
          <Input value={data.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Dupont" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Email *</label>
        <Input type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="jean@email.com" className="h-12 rounded-xl border-gray-200 bg-gray-50" inputMode="email" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Téléphone</label>
        <Input type="tel" value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+32 470 12 34 56" className="h-12 rounded-xl border-gray-200 bg-gray-50" inputMode="tel" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Mot de passe *</label>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} value={data.password} onChange={e => onChange('password', e.target.value)} placeholder="6 caractères minimum" className="h-12 rounded-xl border-gray-200 bg-gray-50 pr-10" />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button onClick={() => validate() && onNext()} className="w-full rounded-2xl bg-gray-900 text-white font-semibold text-base flex items-center justify-center gap-2" style={{ height: 52 }}>
        Continuer <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Pro Step 2: Pro Info ─────────────────────────────────────────────────────

function ProStep2({ data, onChange, onNext, onBack }) {
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
      toast.success('Photo uploadée !');
    } catch { toast.error('Erreur upload photo'); }
  };

  const validate = () => {
    if (!data.bce_number || !data.category_name) { toast.error('Numéro BCE et catégorie obligatoires'); return false; }
    return true;
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Étape 2 / 4</p>
        <h2 className="text-2xl font-bold text-gray-900">Votre activité</h2>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
          {data.photo_url ? <img src={data.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-gray-400" />}
        </div>
        <label className="flex-1 cursor-pointer">
          <div className="text-xs font-medium text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
            {data.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Numéro BCE/KBO *</label>
        <Input value={data.bce_number} onChange={e => onChange('bce_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Numéro TVA</label>
        <Input value={data.vat_number} onChange={e => onChange('vat_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Catégorie de service *</label>
        <Select value={data.category_name} onValueChange={v => onChange('category_name', v)}>
          <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Choisissez votre métier" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Adresse professionnelle</label>
        <Input value={data.address} onChange={e => onChange('address', e.target.value)} placeholder="Rue de la Loi 16, 1000 Bruxelles" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Description de vos services</label>
        <Textarea value={data.description} onChange={e => onChange('description', e.target.value)} placeholder="Décrivez vos compétences..." className="rounded-xl resize-none border-gray-200 bg-gray-50" rows={3} />
      </div>
      <button onClick={() => validate() && onNext()} className="w-full rounded-2xl bg-gray-900 text-white font-semibold text-base flex items-center justify-center gap-2" style={{ height: 52 }}>
        Continuer <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Pro Step 3: Independence Charter ────────────────────────────────────────

function ProStep3({ data, onChange, onNext, onBack }) {
  const checks = data.independence_checks || {};
  const setCheck = (key, val) => onChange('independence_checks', { ...checks, [key]: val });
  const allMandatoryChecked = INDEPENDENCE_ITEMS.filter(i => i.required).every(i => checks[i.key]);

  const validate = () => {
    if (!allMandatoryChecked) { toast.error('Veuillez cocher toutes les cases obligatoires (*)'); return false; }
    if (!data.insurance_company || !data.insurance_policy) { toast.error('Informations d\'assurance RC Pro obligatoires'); return false; }
    return true;
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Étape 3 / 4</p>
        <h2 className="text-2xl font-bold text-gray-900">Charte d'indépendance</h2>
        <p className="text-gray-500 text-sm mt-1">Déclaration obligatoire, renouvelable annuellement.</p>
      </div>

      <div className="space-y-2">
        {INDEPENDENCE_ITEMS.map(item => (
          <label key={item.key} onClick={() => setCheck(item.key, !checks[item.key])} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <div className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${checks[item.key] ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
              {checks[item.key] && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm leading-relaxed text-gray-700">{item.label}{item.required && <span className="text-[#FF6B35] ml-1">*</span>}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assurance RC Pro *</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nom de l'assureur</label>
          <Input value={data.insurance_company || ''} onChange={e => onChange('insurance_company', e.target.value)} placeholder="AXA, Allianz..." className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Numéro de police</label>
          <Input value={data.insurance_policy || ''} onChange={e => onChange('insurance_policy', e.target.value)} placeholder="RC-2024-XXXXXX" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
      </div>

      <button onClick={() => validate() && onNext()} className="w-full rounded-2xl bg-gray-900 text-white font-semibold text-base flex items-center justify-center gap-2" style={{ height: 52 }}>
        Je confirme <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Pro Step 4: DAC7 ─────────────────────────────────────────────────────────

function ProStep4({ data, onChange, onSubmit, onBack, loading }) {
  const validate = () => {
    if (!data.date_of_birth || !data.tin_number || !data.iban) { toast.error('Date de naissance, NIF et IBAN obligatoires (*)'); return false; }
    return true;
  };
  return (
    <div className="space-y-5 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Étape 4 / 4</p>
        <h2 className="text-2xl font-bold text-gray-900">Données fiscales</h2>
        <p className="text-gray-500 text-sm mt-1">Requis par la directive européenne DAC7.</p>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identité</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Date de naissance *</label>
          <Input type="date" value={data.date_of_birth || ''} onChange={e => onChange('date_of_birth', e.target.value)} className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nationalité</label>
          <Select value={data.nationality || ''} onValueChange={v => onChange('nationality', v)}>
            <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
            <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Adresse</p>
        <Input value={data.address_street || ''} onChange={e => onChange('address_street', e.target.value)} placeholder="Rue et numéro" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={data.address_postal_code || ''} onChange={e => onChange('address_postal_code', e.target.value)} placeholder="Code postal" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
          <Input value={data.address_city || ''} onChange={e => onChange('address_city', e.target.value)} placeholder="Ville" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fiscal</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">NIF / Numéro national *</label>
          <Input value={data.tin_number || ''} onChange={e => onChange('tin_number', e.target.value)} placeholder="XX.XX.XX-XXX.XX" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Forme juridique</label>
          <Select value={data.legal_form || ''} onValueChange={v => onChange('legal_form', v)}>
            <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
            <SelectContent>{LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Banque</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">IBAN *</label>
          <Input value={data.iban || ''} onChange={e => onChange('iban', e.target.value)} placeholder="BE68 5390 0754 7034" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
        </div>
        <Input value={data.bic || ''} onChange={e => onChange('bic', e.target.value)} placeholder="BIC / SWIFT" className="h-12 rounded-xl border-gray-200 bg-gray-50" />
      </div>

      <button onClick={() => validate() && onSubmit()} disabled={loading} className="w-full rounded-2xl bg-[#FF6B35] text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60" style={{ height: 52 }}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finaliser l'inscription <CheckCircle className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

// ─── Pro Signup (multi-step) ──────────────────────────────────────────────────

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
      // 1. Register account
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

      // 2. Get user
      const user = await base44.auth.me();
      const today = new Date().toISOString().split('T')[0];
      const renewal = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
      const checks = proData.independence_checks || {};

      // 3. Save Independence Declaration
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
        confirms_own_clients: !!checks.own_clients,
        accepted_at: today,
        renewal_required_date: renewal,
        declaration_version: '1.0',
        is_active: true,
      });

      // 4. Save DAC7
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

      // Create Professional entity profile
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
        console.warn('Professional profile creation failed (non-blocking):', e.message);
      }

      toast.success('Compte professionnel créé avec succès ! 🎉');
      navigate('/ProDashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        toast.error('Un compte existe déjà avec cet email');
        setStep(1);
      } else {
        toast.error('Erreur lors de la création du compte. Réessayez.');
      }
      setLoading(false);
    }
  };

  return (
    <div>
      <ProgressBar current={step} total={4} labels={PRO_STEPS} />
      {step === 1 && <ProStep1 data={proData} onChange={set} onNext={() => setStep(2)} onBack={onBack} />}
      {step === 2 && <ProStep2 data={proData} onChange={set} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <ProStep3 data={proData} onChange={set} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <ProStep4 data={proData} onChange={set} onSubmit={handleFinalSubmit} onBack={() => setStep(3)} loading={loading} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Minimal top bar */}
      <div className="shrink-0 flex items-center justify-center pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)', paddingBottom: 0 }}>
        {userType !== null && (
          <div className="absolute left-4" style={{ top: 'max(env(safe-area-inset-top), 20px)' }}>
            <button onClick={() => setUserType(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 w-full max-w-sm mx-auto" style={{ paddingTop: userType === null ? 'max(env(safe-area-inset-top), 60px)' : '16px' }}>
          {userType === null && <StepTypeSelection onSelect={setUserType} />}
          {userType === 'particulier' && <ParticulierSignup onBack={() => setUserType(null)} />}
          {userType === 'professionnel' && <ProSignup onBack={() => setUserType(null)} />}
        </div>
      </div>

      <div className="text-center py-4 text-xs text-gray-400 shrink-0">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">CGU</a>
        {' · '}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">Confidentialité</a>
      </div>
    </div>
  );
}