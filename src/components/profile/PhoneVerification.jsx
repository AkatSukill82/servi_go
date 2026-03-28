import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Phone } from 'lucide-react';

// Validation format belge: +32 4xx xx xx xx ou 04xx xx xx xx ou +32 2/3/4/9 etc.
function validateBelgianPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  return /^(\+32|0)(4[5-9]\d{7}|[2-9]\d{7,8})$/.test(cleaned);
}

export default function PhoneVerification({ value, onChange }) {
  const [touched, setTouched] = useState(false);
  const isValid = validateBelgianPhone(value);
  const showError = touched && value && !isValid;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5" /> Téléphone
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={e => { onChange(e.target.value); setTouched(true); }}
          onBlur={() => setTouched(true)}
          placeholder="+32 470 12 34 56 ou 0470 12 34 56"
          className={`h-12 rounded-xl pr-10 ${showError ? 'border-destructive focus-visible:ring-destructive' : isValid && value ? 'border-green-400' : ''}`}
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <AlertCircle className="w-4 h-4 text-destructive" />
            }
          </div>
        )}
      </div>
      {showError && (
        <p className="text-xs text-destructive">Format invalide. Ex: +32 470 12 34 56 ou 0470 12 34 56</p>
      )}
      {isValid && value && touched && (
        <p className="text-xs text-green-600">Numéro valide ✓</p>
      )}
    </div>
  );
}