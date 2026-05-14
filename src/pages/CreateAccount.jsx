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
import EidWelcomeSplash from '@/components/onboarding/EidWelcomeSplash';

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
    <div className="w-full mb-5">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < current - 1
                ? 'bg-[#1A365D] border-[#1A365D] text-white'
                : i === current - 1
                ? 'bg-[#1A365D] border-[#1A365D] text-white'
                : 'bg-white border-[#CBD5E0] text-[#A0AEC0]'
            }`}>
              {i < current - 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-[9px] text-[#718096] mt-1 text-center leading-tight hidden sm:block">{label}</span>
          </div>
        ))}
      </div>
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1A365D] rounded-full transition-all duration-500"
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#1A365D]">Vous êtes ?</h2>
        <p className="text-sm text-[#718096] mt-2">Choisissez votre profil pour commencer</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => onSelect('particulier')}
          className="w-full bg-white rounded-2xl border-2 border-[#E2E8F0] hover:border-[#FF6B35] hover:shadow-lg transition-all duration-200 p-5 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0EB] flex items-center justify-center shrink-0 group-hover:bg-[#FF6B35] transition-colors">
              <Home className="w-7 h-7 text-[#FF6B35] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1A365D] text-lg">Particulier</p>
              <p className="text-sm text-[#718096]">Je cherche un professionnel</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#CBD5E0] group-hover:text-[#FF6B35] transition-colors shrink-0" />
          </div>
        </button>

        <button
          onClick={() => onSelect('professionnel')}
          className="w-full bg-white rounded-2xl border-2 border-[#E2E8F0] hover:border-[#1A365D] hover:shadow-lg transition-all duration-200 p-5 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A365D] flex items-center justify-center shrink-0 group-hover:bg-[#0F2444] transition-colors">
              <Wrench className="w-7 h-7 text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1A365D] text-lg">Professionnel</p>
              <p className="text-sm text-[#718096]">Je propose mes services</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#CBD5E0] group-hover:text-[#1A365D] transition-colors shrink-0" />
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-[#718096]">
        Déjà un compte ?{' '}
        <button onClick={() => navigate('/se-connecter')} className="text-[#1A365D] font-bold hover:underline">
          Se connecter
        </button>
      </p>
    </div>
  );
}

// ─── Particulier Signup ───────────────────────────────────────────────────────

function ParticulierSignup({ onBack, onRegistered }) {
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
      onRegistered('particulier');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#718096] hover:text-[#1A365D]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div>
        <h2 className="text-xl font-black text-[#1A365D]">Créer mon compte</h2>
        <p className="text-sm text-[#718096]">Particulier — accès aux services à domicile</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prénom <span className="text-red-500">*</span></Label>
          <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jean" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nom <span className="text-red-500">*</span></Label>
          <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Dupont" className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@email.com" className="h-11 rounded-xl" inputMode="email" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Téléphone</Label>
        <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+32 470 12 34 56" className="h-11 rounded-xl" inputMode="tel" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Adresse</Label>
        <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rue de la Loi 16, 1000 Bruxelles" className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Mot de passe <span className="text-red-500">*</span></Label>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="6 caractères minimum" className="h-11 rounded-xl pr-10" />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CBD5E0]">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <div onClick={() => setCguAccepted(v => !v)} className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${cguAccepted ? 'bg-[#1A365D] border-[#1A365D]' : 'border-[#CBD5E0]'}`}>
          {cguAccepted && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        <span className="text-xs text-[#718096] leading-relaxed">
          J'accepte les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-[#1A365D] underline">CGU</a> et la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-[#1A365D] underline">Politique de confidentialité</a>
        </span>
      </label>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#FF6B35] hover:bg-[#E55A25] text-white font-bold text-base">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte'}
      </Button>
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
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#718096] hover:text-[#1A365D]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div>
        <h2 className="text-xl font-black text-[#1A365D]">Informations de base</h2>
        <p className="text-sm text-[#718096]">Étape 1 — Vos coordonnées</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prénom <span className="text-red-500">*</span></Label>
          <Input value={data.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="Jean" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nom <span className="text-red-500">*</span></Label>
          <Input value={data.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Dupont" className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
        <Input type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="jean@email.com" className="h-11 rounded-xl" inputMode="email" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Téléphone</Label>
        <Input type="tel" value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+32 470 12 34 56" className="h-11 rounded-xl" inputMode="tel" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Mot de passe <span className="text-red-500">*</span></Label>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} value={data.password} onChange={e => onChange('password', e.target.value)} placeholder="6 caractères minimum" className="h-11 rounded-xl pr-10" />
          <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CBD5E0]">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button onClick={() => validate() && onNext()} className="w-full h-12 rounded-xl bg-[#1A365D] hover:bg-[#2D4A7A] text-white font-bold">
        Continuer <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
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
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#718096] hover:text-[#1A365D]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div>
        <h2 className="text-xl font-black text-[#1A365D]">Informations professionnelles</h2>
        <p className="text-sm text-[#718096]">Étape 2 — Votre activité</p>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F7FAFC] border-2 border-dashed border-[#CBD5E0] flex items-center justify-center overflow-hidden shrink-0">
          {data.photo_url ? <img src={data.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-[#CBD5E0]" />}
        </div>
        <label className="flex-1">
          <div className="text-xs font-semibold text-[#1A365D] px-3 py-2 rounded-xl border border-[#1A365D] text-center cursor-pointer hover:bg-[#1A365D] hover:text-white transition-colors">
            {data.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Numéro BCE/KBO <span className="text-red-500">*</span></Label>
        <Input value={data.bce_number} onChange={e => onChange('bce_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Numéro TVA</Label>
        <Input value={data.vat_number} onChange={e => onChange('vat_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Catégorie de service <span className="text-red-500">*</span></Label>
        <Select value={data.category_name} onValueChange={v => onChange('category_name', v)}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisissez votre métier" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Adresse professionnelle</Label>
        <Input value={data.address} onChange={e => onChange('address', e.target.value)} placeholder="Rue de la Loi 16, 1000 Bruxelles" className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description de vos services</Label>
        <Textarea value={data.description} onChange={e => onChange('description', e.target.value)} placeholder="Décrivez vos compétences..." className="rounded-xl resize-none" rows={3} />
      </div>
      <Button onClick={() => validate() && onNext()} className="w-full h-12 rounded-xl bg-[#1A365D] hover:bg-[#2D4A7A] text-white font-bold">
        Continuer <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
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
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#718096] hover:text-[#1A365D]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div>
        <h2 className="text-xl font-black text-[#1A365D]">Charte d'indépendance</h2>
        <p className="text-sm text-[#718096]">Étape 3 — Déclaration obligatoire ServiGo</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-800 leading-relaxed">En tant que professionnel indépendant sur ServiGo, vous devez confirmer votre statut. Renouvelable annuellement.</p>
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-[#1A365D]" /> Confirmations</h3>
        {INDEPENDENCE_ITEMS.map(item => (
          <label key={item.key} className="flex items-start gap-3 cursor-pointer">
            <div onClick={() => setCheck(item.key, !checks[item.key])} className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${checks[item.key] ? 'bg-[#1A365D] border-[#1A365D]' : 'border-[#CBD5E0]'}`}>
              {checks[item.key] && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm leading-relaxed text-[#4A5568]">{item.label}{item.required && <span className="text-red-500 ml-1">*</span>}</span>
          </label>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm">Assurance RC Pro <span className="text-red-500">*</span></h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Nom de l'assureur</Label>
          <Input value={data.insurance_company || ''} onChange={e => onChange('insurance_company', e.target.value)} placeholder="Ex: AXA, Allianz..." className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Numéro de police</Label>
          <Input value={data.insurance_policy || ''} onChange={e => onChange('insurance_policy', e.target.value)} placeholder="Ex: RC-2024-XXXXXX" className="h-11 rounded-xl" />
        </div>
      </div>
      <Button onClick={() => validate() && onNext()} className="w-full h-12 rounded-xl bg-[#1A365D] hover:bg-[#2D4A7A] text-white font-bold">
        Je confirme mon statut <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
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
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#718096] hover:text-[#1A365D]">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div>
        <h2 className="text-xl font-black text-[#1A365D]">Données fiscales DAC7</h2>
        <p className="text-sm text-[#718096]">Étape 4 — Directive européenne obligatoire</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-800">La directive DAC7 oblige les plateformes à collecter ces données pour le SPF Finances belge.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm">Identité officielle</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Date de naissance <span className="text-red-500">*</span></Label>
          <Input type="date" value={data.date_of_birth || ''} onChange={e => onChange('date_of_birth', e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nationalité</Label>
          <Select value={data.nationality || ''} onValueChange={v => onChange('nationality', v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
            <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm">Adresse complète</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Rue et numéro</Label>
          <Input value={data.address_street || ''} onChange={e => onChange('address_street', e.target.value)} placeholder="Rue de la Loi 16" className="h-11 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Code postal</Label>
            <Input value={data.address_postal_code || ''} onChange={e => onChange('address_postal_code', e.target.value)} placeholder="1000" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ville</Label>
            <Input value={data.address_city || ''} onChange={e => onChange('address_city', e.target.value)} placeholder="Bruxelles" className="h-11 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm">Identifiants fiscaux</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">NIF / Numéro national <span className="text-red-500">*</span></Label>
          <Input value={data.tin_number || ''} onChange={e => onChange('tin_number', e.target.value)} placeholder="XX.XX.XX-XXX.XX" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Forme juridique</Label>
          <Select value={data.legal_form || ''} onValueChange={v => onChange('legal_form', v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
            <SelectContent>{LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
        <h3 className="font-semibold text-sm">Coordonnées bancaires</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">IBAN <span className="text-red-500">*</span></Label>
          <Input value={data.iban || ''} onChange={e => onChange('iban', e.target.value)} placeholder="BE68 5390 0754 7034" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">BIC / SWIFT</Label>
          <Input value={data.bic || ''} onChange={e => onChange('bic', e.target.value)} placeholder="GEBABEBB" className="h-11 rounded-xl" />
        </div>
      </div>

      <Button onClick={() => validate() && onSubmit()} disabled={loading} className="w-full h-12 rounded-xl bg-[#1A365D] hover:bg-[#2D4A7A] text-white font-bold">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finaliser mon inscription <CheckCircle className="w-4 h-4 ml-2" /></>}
      </Button>
    </div>
  );
}

// ─── Pro Signup (multi-step) ──────────────────────────────────────────────────

function ProSignup({ onBack, onRegistered }) {
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
      onRegistered('professionnel');
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
  const [showEidSplash, setShowEidSplash] = useState(false);
  const [registeredUserType, setRegisteredUserType] = useState(null);
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

  const handleSplashDismiss = () => {
    setShowEidSplash(false);
    if (registeredUserType === 'professionnel') navigate('/ProDashboard', { replace: true });
    else navigate('/Home', { replace: true });
  };

  if (showEidSplash) {
    return (
      <EidWelcomeSplash
        userType={registeredUserType}
        onDismiss={handleSplashDismiss}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F7FAFC] flex flex-col">
      {/* Header */}
      <div className="px-5 pb-5 text-center shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)', background: 'linear-gradient(135deg, #6C5CE7, #a78bfa)' }}>
        <div className="flex justify-center mb-3">
          <ServiGoIcon size={40} white />
        </div>
        <h1 className="text-white font-black text-lg">ServiGo</h1>
        <p className="text-white/60 text-xs mt-0.5">Créer un compte</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 w-full max-w-md mx-auto">
          {userType === null && <StepTypeSelection onSelect={setUserType} />}
          {userType === 'particulier' && <ParticulierSignup onBack={() => setUserType(null)} onRegistered={(type) => { setRegisteredUserType(type); setShowEidSplash(true); }} />}
          {userType === 'professionnel' && <ProSignup onBack={() => setUserType(null)} onRegistered={(type) => { setRegisteredUserType(type); setShowEidSplash(true); }} />}
        </div>
      </div>

      <div className="text-center py-3 text-xs text-[#A0AEC0] shrink-0 border-t border-[#E2E8F0]">
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#718096]">CGU</a>
        {' · '}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#718096]">Confidentialité</a>
        {' · '}
        <span>© 2026 ServiGo</span>
      </div>
    </div>
  );
}