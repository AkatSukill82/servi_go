import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const STEPS = ['Type', 'Compte', 'Infos', 'Identité', 'Confirmation'];

export function isAdult(str) {
  if (!str || str.length < 10) return false;
  const parts = str.split('/');
  if (parts.length !== 3) return false;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900) return false;
  const birth = new Date(year, month - 1, day);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

export function isValidPhone(p) {
  return /^(\+32|0032|0)[0-9\s]{8,11}$/.test(p.trim());
}

export function isValidBce(v) {
  return v === '' || /^0[0-9]{3}\.[0-9]{3}\.[0-9]{3}$/.test(v.trim());
}

export function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ caractères', ok: password.length >= 8 },
    { label: 'Majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Chiffre', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#EF4444', '#F97316', '#22C55E'];
  const labels = ['Faible', 'Moyen', 'Fort'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : '#E5E7EB' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] font-medium flex items-center gap-0.5 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className="text-[10px] font-bold shrink-0" style={{ color: colors[score - 1] }}>{labels[score - 1]}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ step }) {
  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  return (
    <div className="w-full md:max-w-lg mx-auto px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#6B7280] font-medium">Étape {step + 1} sur {STEPS.length}</span>
        <span className="text-xs font-semibold text-[#534AB7]">{STEPS[step]}</span>
      </div>
      <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: '#FF6B35' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function Field({ label, required, error, touched, valid, children }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {touched && error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
      {touched && !error && valid && (
        <p className="text-xs text-[#1D9E75] mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 shrink-0" /> Valide
        </p>
      )}
    </div>
  );
}

export function StyledInput({ value, onChange, onBlur, placeholder, type = 'text', suffix, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full h-11 px-3.5 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] text-base ${suffix ? 'pr-10' : ''} ${className}`}
        style={{ fontSize: 16 }}
        {...props}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  );
}
