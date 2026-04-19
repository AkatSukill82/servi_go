import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const LEGAL_FORMS = [
  { value: 'independant_pp', label: 'Indépendant personne physique' },
  { value: 'srl', label: 'SRL (Société à Responsabilité Limitée)' },
  { value: 'sa', label: 'SA (Société Anonyme)' },
  { value: 'scs', label: 'SCS (Société en Commandite Simple)' },
  { value: 'snc', label: 'SNC (Société en Nom Collectif)' },
  { value: 'autre', label: 'Autre' },
];

const NATIONALITIES = ['Belge', 'Française', 'Néerlandaise', 'Allemande', 'Luxembourgeoise', 'Italienne', 'Espagnole', 'Portugaise', 'Autre'];

export default function DAC7Form() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['dac7Profile', user?.email],
    queryFn: () => base44.entities.DAC7ProProfile.filter({ professional_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    address_street: '',
    address_postal_code: '',
    address_city: '',
    address_country: 'Belgique',
    tin_number: '',
    bce_number: '',
    vat_number: '',
    iban: '',
    bic: '',
    legal_form: '',
  });

  useEffect(() => {
    if (user || existingProfile) {
      setForm(f => ({
        ...f,
        first_name: existingProfile?.first_name || user?.first_name || '',
        last_name: existingProfile?.last_name || user?.last_name || '',
        date_of_birth: existingProfile?.date_of_birth || '',
        nationality: existingProfile?.nationality || '',
        address_street: existingProfile?.address_street || '',
        address_postal_code: existingProfile?.address_postal_code || '',
        address_city: existingProfile?.address_city || '',
        address_country: existingProfile?.address_country || 'Belgique',
        tin_number: existingProfile?.tin_number || '',
        bce_number: existingProfile?.bce_number || user?.bce_number || '',
        vat_number: existingProfile?.vat_number || '',
        iban: existingProfile?.iban || '',
        bic: existingProfile?.bic || '',
        legal_form: existingProfile?.legal_form || '',
      }));
    }
  }, [user, existingProfile]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.date_of_birth || !form.tin_number || !form.iban) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }
    setSaving(true);

    const data = {
      ...form,
      professional_email: user.email,
      professional_name: `${form.first_name} ${form.last_name}`.trim(),
      is_complete: !!(form.first_name && form.last_name && form.date_of_birth && form.tin_number && form.iban && form.bce_number),
      is_verified: false,
      data_collection_date: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (existingProfile?.id) {
      await base44.entities.DAC7ProProfile.update(existingProfile.id, data);
    } else {
      await base44.entities.DAC7ProProfile.create(data);
    }

    await base44.auth.updateMe({ dac7_completed: true });
    queryClient.invalidateQueries({ queryKey: ['dac7Profile', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    toast.success('Données DAC7 enregistrées ✓');
    navigate('/ProDashboard');
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background" style={{ minHeight: '100dvh', overflowY: 'auto' }}>
      <div className="px-5 py-8 w-full md:max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Données fiscales DAC7</h1>
            <p className="text-xs text-muted-foreground">Directive européenne 2021/514 — Obligatoire</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-800 leading-relaxed">
            La directive DAC7 oblige les plateformes numériques à collecter et transmettre ces données au SPF Finances belge. Ces informations sont strictement confidentielles.
          </p>
        </div>

        {/* Identity */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Identité officielle</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prénom <span className="text-red-500">*</span></Label>
              <Input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Jean" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom <span className="text-red-500">*</span></Label>
              <Input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Dupont" className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date de naissance <span className="text-red-500">*</span></Label>
            <Input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nationalité</Label>
            <Select value={form.nationality} onValueChange={v => update('nationality', v)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Adresse complète</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Rue et numéro</Label>
            <Input value={form.address_street} onChange={e => update('address_street', e.target.value)} placeholder="Rue de la Loi 16" className="h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Code postal</Label>
              <Input value={form.address_postal_code} onChange={e => update('address_postal_code', e.target.value)} placeholder="1000" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ville</Label>
              <Input value={form.address_city} onChange={e => update('address_city', e.target.value)} placeholder="Bruxelles" className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pays</Label>
            <Input value={form.address_country} onChange={e => update('address_country', e.target.value)} placeholder="Belgique" className="h-11 rounded-xl" />
          </div>
        </div>

        {/* Fiscal */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Identifiants fiscaux</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">NIF / Numéro national <span className="text-red-500">*</span></Label>
            <Input value={form.tin_number} onChange={e => update('tin_number', e.target.value)} placeholder="XX.XX.XX-XXX.XX" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Numéro BCE/KBO</Label>
            <Input value={form.bce_number} onChange={e => update('bce_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Numéro TVA</Label>
            <Input value={form.vat_number} onChange={e => update('vat_number', e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Forme juridique</Label>
            <Select value={form.legal_form} onValueChange={v => update('legal_form', v)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
              <SelectContent>
                {LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Banking */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Coordonnées bancaires</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">IBAN <span className="text-red-500">*</span></Label>
            <Input value={form.iban} onChange={e => update('iban', e.target.value)} placeholder="BE68 5390 0754 7034" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">BIC / SWIFT</Label>
            <Input value={form.bic} onChange={e => update('bic', e.target.value)} placeholder="GEBABEBB" className="h-11 rounded-xl" />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-semibold">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
          Enregistrer et accéder au dashboard
        </Button>

        <button onClick={() => navigate('/ProDashboard')} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 pb-8">
          Remplir plus tard
        </button>
      </div>
    </div>
  );
}