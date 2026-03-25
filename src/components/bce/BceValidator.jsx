import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/hooks/useI18n';

function normalizeBce(raw) {
  // Accept: BE0123456789, BE 0123.456.789, 0123456789, etc.
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `BE ${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`;
  }
  return null;
}

export default function BceValidator({ value, onChange, className = '' }) {
  const { t } = useI18n();
  const [status, setStatus] = useState('idle'); // idle | checking | valid | invalid | error
  const [companyData, setCompanyData] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const normalized = normalizeBce(value || '');
    if (!normalized) {
      setStatus('idle');
      setCompanyData(null);
      return;
    }
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('checkBce', { bce_number: normalized });
        const data = res.data;
        if (data?.valid) {
          setStatus('valid');
          setCompanyData(data.company);
        } else {
          setStatus('invalid');
          setCompanyData(null);
        }
      } catch {
        setStatus('error');
        setCompanyData(null);
      }
    }, 700);
  }, [value]);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-semibold block">
        {t('bce_label')} <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('bce_placeholder')}
          className="w-full h-12 rounded-xl border border-border bg-card px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          {status === 'invalid' && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('bce_hint')}</p>

      {status === 'valid' && companyData && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-green-800">{t('bce_valid')}</p>
          {companyData.name && <p className="text-sm font-bold text-green-900">{companyData.name}</p>}
          {companyData.status && (
            <p className="text-xs text-green-700">
              Statut légal : <span className="font-semibold">{companyData.status}</span>
            </p>
          )}
          {companyData.address && (
            <p className="text-xs text-green-700">📍 {companyData.address}</p>
          )}
          {companyData.activity && (
            <p className="text-xs text-green-700">💼 {companyData.activity}</p>
          )}
        </div>
      )}

      {status === 'invalid' && (
        <p className="text-xs text-destructive">{t('bce_invalid')}</p>
      )}
    </div>
  );
}