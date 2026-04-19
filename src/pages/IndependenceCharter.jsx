import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, Shield, FileText } from 'lucide-react';
import { toast } from 'sonner';

const MANDATORY_ITEMS = [
  { key: 'bce_confirmed', label: 'Je confirme être inscrit au BCE en tant qu\'indépendant', required: true },
  { key: 'free_pricing', label: 'Je fixe librement mes tarifs sur ServiGo', required: true },
  { key: 'free_schedule', label: 'Je définis librement mes horaires et disponibilités', required: true },
  { key: 'can_refuse', label: 'Je peux refuser toute mission sans pénalité', required: true },
  { key: 'own_tools', label: 'J\'utilise mon propre matériel et outils', required: false },
  { key: 'own_insurance', label: 'J\'ai ma propre assurance RC professionnelle', required: false },
  { key: 'multi_platform', label: 'Je peux travailler pour d\'autres plateformes ou clients directs', required: false },
  { key: 'no_exclusivity', label: 'Aucune exclusivité ne m\'est imposée par ServiGo', required: false },
  { key: 'own_clients', label: 'Je peux démarcher mes propres clients en dehors de ServiGo', required: false },
];

export default function IndependenceCharter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState({});
  const [bceNumber, setBceNumber] = useState('');
  const [tvaNumber, setTvaNumber] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const mandatoryChecked = MANDATORY_ITEMS.filter(i => i.required).every(i => checks[i.key]);

  const handleSign = async () => {
    if (!mandatoryChecked) {
      toast.error('Veuillez cocher toutes les cases obligatoires (*)');
      return;
    }
    if (!bceNumber.trim()) {
      toast.error('Le numéro BCE est obligatoire');
      return;
    }

    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const renewalDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    await base44.entities.ProIndependenceDeclaration.create({
      professional_email: user.email,
      professional_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      bce_number: bceNumber.trim(),
      vat_number: tvaNumber.trim(),
      insurance_company: insurerName.trim(),
      insurance_policy_number: policyNumber.trim(),
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
      renewal_required_date: renewalDate,
      declaration_version: '1.0',
      is_active: true,
    });

    await base44.auth.updateMe({
      independence_charter_signed: true,
      independence_charter_date: today,
      bce_number: bceNumber.trim(),
    });

    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['independenceDeclaration'] });
    toast.success('Charte signée avec succès ✓');
    navigate('/DAC7Form');
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ minHeight: '100dvh' }}>
      <div className="flex-1 overflow-y-auto px-5 py-8">
        <div className="w-full md:max-w-lg mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Charte d'indépendance</h1>
              <p className="text-xs text-muted-foreground">ServiGo — Déclaration obligatoire</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs text-blue-800 leading-relaxed">
              En tant que professionnel indépendant sur ServiGo, vous devez confirmer votre statut avant de pouvoir accepter des missions. Cette déclaration est renouvelable annuellement.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Confirmations requises
            </h3>
            {MANDATORY_ITEMS.map(item => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setChecks(c => ({ ...c, [item.key]: !c[item.key] }))}
                  className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${
                    checks[item.key]
                      ? 'bg-primary border-primary'
                      : 'border-border group-hover:border-primary/50'
                  }`}
                >
                  {checks[item.key] && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={`text-sm leading-relaxed ${checks[item.key] ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                  {item.required && <span className="text-red-500 ml-1">*</span>}
                </span>
              </label>
            ))}
          </div>

          {/* Additional fields */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold text-sm">Informations complémentaires</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Numéro BCE/KBO <span className="text-red-500">*</span></Label>
              <Input value={bceNumber} onChange={e => setBceNumber(e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Numéro TVA</Label>
              <Input value={tvaNumber} onChange={e => setTvaNumber(e.target.value)} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom de l'assureur RC Pro</Label>
              <Input value={insurerName} onChange={e => setInsurerName(e.target.value)} placeholder="Ex: AXA, Allianz, AG Insurance..." className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Numéro de police d'assurance</Label>
              <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Ex: RC-2024-XXXXXX" className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Note légale :</strong> En signant cette charte, vous confirmez exercer en tant qu'indépendant conforme au droit belge. Cette déclaration sera archivée avec la date et votre IP pour des raisons légales (conformité DAC7 / droit social).
            </p>
          </div>

          <Button
            onClick={handleSign}
            disabled={saving || !mandatoryChecked || !bceNumber.trim()}
            className="w-full h-12 rounded-xl font-semibold text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Je signe et confirme mon statut d'indépendant
          </Button>

          <p className="text-center text-xs text-muted-foreground pb-6">
            * Champs obligatoires — Renouvellement annuel automatique
          </p>
        </div>
      </div>
    </div>
  );
}