import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Mail, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function EmailVerification({ currentEmail, contactEmail, onChange, onVerified, verified, isEditing = true }) {
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState(null);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState('input');
  const [touched, setTouched] = useState(false);

  const isValid = validateEmail(contactEmail);
  const isChanged = contactEmail !== currentEmail;
  const showError = touched && contactEmail && !isValid;

  const handleSendCode = async () => {
    if (!isValid) return;
    setSending(true);
    const generated = generateCode();
    setSentCode(generated);
    await base44.integrations.Core.SendEmail({
      to: contactEmail,
      subject: 'ServiGo – Code de vérification email',
      body: `Votre code de vérification ServiGo est : ${generated}\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé ce code, ignorez cet email.`,
    });
    setSending(false);
    setStep('verify');
    toast.success(`Code envoyé à ${contactEmail}`);
  };

  const handleVerify = () => {
    if (code === sentCode) {
      onVerified(contactEmail);
      setStep('input');
      setCode('');
      setSentCode(null);
      toast.success('Email vérifié et mis à jour !');
    } else {
      toast.error('Code incorrect. Réessayez.');
    }
  };

  const handleChange = (val) => {
    onChange(val);
    setTouched(true);
    setStep('input');
    onVerified(null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5" /> Email de contact
      </Label>
      <div className="relative">
        <Input
          type="email"
          value={contactEmail}
          onChange={e => handleChange(e.target.value)}
          placeholder="votre@email.com"
          disabled={!isEditing}
          className={`h-12 rounded-xl pr-10 ${showError ? 'border-destructive' : verified ? 'border-green-400' : ''}`}
        />
        {contactEmail && (
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
      {showError && <p className="text-xs text-destructive">Format d'email invalide.</p>}
      {verified && <p className="text-xs text-green-600">Email vérifié ✓</p>}

      {isEditing && isValid && isChanged && !verified && step === 'input' && (
        <Button type="button" variant="outline" size="sm" onClick={handleSendCode} disabled={sending} className="w-full h-10 rounded-xl text-xs">
          {sending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Envoi...</> : '📧 Vérifier cet email'}
        </Button>
      )}

      {isEditing && step === 'verify' && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
          <p className="text-xs text-muted-foreground">Entrez le code reçu à <strong>{contactEmail}</strong></p>
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