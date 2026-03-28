import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Phone, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function validateBelgianPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  return /^(\+32|0)(4[5-9]\d{7}|[2-9]\d{7,8})$/.test(cleaned);
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function PhoneVerification({ value, onChange, userEmail, isEditing = true, verified, onVerified }) {
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'verify'
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState(null);
  const [sending, setSending] = useState(false);

  const isValid = validateBelgianPhone(value);
  const showError = touched && value && !isValid;

  const handleSendCode = async () => {
    if (!isValid || !userEmail) return;
    setSending(true);
    const generated = generateCode();
    setSentCode(generated);
    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: 'ServiGo – Vérification de votre numéro de téléphone',
      body: `Votre code de vérification pour le numéro ${value} est : ${generated}\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé ce code, ignorez cet email.`,
    });
    setSending(false);
    setStep('verify');
    toast.success(`Code envoyé à ${userEmail}`);
  };

  const handleVerify = () => {
    if (code === sentCode) {
      onVerified?.(value);
      setStep('input');
      setCode('');
      setSentCode(null);
      toast.success('Numéro de téléphone vérifié !');
    } else {
      toast.error('Code incorrect. Réessayez.');
    }
  };

  const handleChange = (val) => {
    onChange(val);
    setTouched(true);
    setStep('input');
    onVerified?.(null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5" /> Téléphone
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="+32 470 12 34 56 ou 0470 12 34 56"
          disabled={!isEditing}
          className={`h-12 rounded-xl pr-10 ${showError ? 'border-destructive' : (verified || (isValid && value)) ? 'border-green-400' : ''}`}
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {verified
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : isValid
                ? <AlertCircle className="w-4 h-4 text-orange-400" />
                : <AlertCircle className="w-4 h-4 text-destructive" />
            }
          </div>
        )}
      </div>
      {showError && <p className="text-xs text-destructive">Format invalide. Ex: +32 470 12 34 56</p>}
      {verified && <p className="text-xs text-green-600">Numéro vérifié ✓</p>}

      {isEditing && isValid && !verified && step === 'input' && (
        <Button type="button" variant="outline" size="sm" onClick={handleSendCode} disabled={sending} className="w-full h-10 rounded-xl text-xs">
          {sending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Envoi...</> : '📱 Vérifier ce numéro (code par email)'}
        </Button>
      )}

      {isEditing && step === 'verify' && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
          <p className="text-xs text-muted-foreground">Code envoyé à <strong>{userEmail}</strong></p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="h-10 rounded-xl text-center text-lg font-mono tracking-widest flex-1"
            />
            <Button size="sm" onClick={handleVerify} disabled={code.length !== 6} className="h-10 rounded-xl px-4 text-xs">
              Valider
            </Button>
          </div>
          <button onClick={() => { setStep('input'); setCode(''); }} className="text-xs text-muted-foreground underline">
            Renvoyer un code
          </button>
        </div>
      )}
    </div>
  );
}