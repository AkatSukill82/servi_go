import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { StyledInput, PasswordStrength } from './shared';

export default function StepCreateAccount({ userType, onNext, onBack }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Remplis tous les champs'); return; }
    if (form.password.length < 8) { toast.error('Mot de passe : 8 caractères minimum'); return; }
    setLoading(true);
    try {
      await base44.auth.register(form.email.trim(), form.password, { user_type: userType });
      onNext({ email: form.email });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        toast.error('Un compte existe déjà avec cet email');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full md:max-w-lg mx-auto px-5 pb-10 space-y-5">
      <div>
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-xl font-bold text-[#111827]">Créer votre compte</h2>
        <p className="text-sm text-[#6B7280] mt-1">
          {userType === 'professionnel' ? 'Professionnel — accès aux missions' : 'Particulier — accès aux services'}
        </p>
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[#111827] mb-1">Email <span className="text-red-500">*</span></label>
        <StyledInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@email.com" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[#111827] mb-1">Mot de passe <span className="text-red-500">*</span></label>
        <StyledInput
          type={showPass ? 'text' : 'password'}
          value={form.password}
          onChange={e => set('password', e.target.value)}
          placeholder="8 caractères minimum"
          suffix={
            <button type="button" onClick={() => setShowPass(s => !s)} className="text-[#9CA3AF]">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <PasswordStrength password={form.password} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full h-12 rounded-xl text-base font-semibold text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#6C5CE7' }}>
        {loading ? <Loader2 className="inline w-4 h-4 mr-2 animate-spin" /> : null}
        Créer mon compte <ChevronRight className="inline w-5 h-5 ml-1" />
      </button>
    </form>
  );
}
