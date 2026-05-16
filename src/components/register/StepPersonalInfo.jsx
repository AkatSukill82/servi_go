import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Field, StyledInput, isAdult, isValidPhone, isValidBce } from './shared';

export default function StepPersonalInfo({ userType, initialData, onNext, onBack, isSaving = false }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    birth_date: initialData.birth_date || '',
    address: initialData.address || '',
    phone: initialData.phone || '',
    category_name: initialData.category_name || '',
    bce_number: initialData.bce_number || '',
    pro_description: initialData.pro_description || '',
  });
  const [touched, setTouched] = useState({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    enabled: userType === 'professionnel',
  });

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }));
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const errors = {
    first_name: form.first_name.length < 2 ? 'Minimum 2 caractères' : '',
    last_name: form.last_name.length < 2 ? 'Minimum 2 caractères' : '',
    birth_date: !isAdult(form.birth_date) ? (form.birth_date.length > 0 ? 'Vous devez avoir au moins 18 ans (format JJ/MM/AAAA)' : 'Champ requis') : '',
    address: form.address.length < 5 ? 'Adresse trop courte' : '',
    phone: !isValidPhone(form.phone) ? 'Format invalide (ex: 0477 12 34 56 ou +32477123456)' : '',
    ...(userType === 'professionnel' ? {
      category_name: !form.category_name ? 'Veuillez choisir votre métier' : '',
      bce_number: !isValidBce(form.bce_number) ? 'Format invalide (ex: 0477.123.456)' : '',
      pro_description: form.pro_description.length < 50 ? `Encore ${50 - form.pro_description.length} caractères requis` : '',
    } : {}),
  };

  const baseValid = !errors.first_name && !errors.last_name && !errors.birth_date && !errors.address && !errors.phone;
  const proValid = userType !== 'professionnel' || (!errors.category_name && !errors.bce_number && !errors.pro_description);
  const canProceed = baseValid && proValid;

  const handleGeolocate = () => {
    if (!navigator.geolocation) { setGeoError("Géolocalisation non supportée"); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          set('address', data.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`);
          touch('address');
        } catch { setGeoError("Erreur lors de la récupération de l'adresse"); }
        setGeoLoading(false);
      },
      () => { setGeoError("Permission refusée. Saisissez votre adresse manuellement."); setGeoLoading(false); }
    );
  };

  const handleSubmit = () => {
    const allFields = ['first_name', 'last_name', 'birth_date', 'address', 'phone',
      ...(userType === 'professionnel' ? ['category_name', 'bce_number', 'pro_description'] : [])];
    setTouched(Object.fromEntries(allFields.map(f => [f, true])));
    if (canProceed) onNext(form);
  };

  return (
    <div className="w-full md:max-w-lg mx-auto px-5 pb-10">
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-xl font-bold text-[#111827]">Vos informations</h2>
        <p className="text-sm text-[#6B7280] mt-1">Dites-nous en plus sur vous</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" required touched={touched.first_name} error={errors.first_name} valid={!errors.first_name}>
            <StyledInput value={form.first_name} onChange={e => set('first_name', e.target.value)} onBlur={() => touch('first_name')} placeholder="Jean"
              className={touched.first_name ? (errors.first_name ? 'border-red-400' : 'border-[#1D9E75]') : ''} />
          </Field>
          <Field label="Nom" required touched={touched.last_name} error={errors.last_name} valid={!errors.last_name}>
            <StyledInput value={form.last_name} onChange={e => set('last_name', e.target.value)} onBlur={() => touch('last_name')} placeholder="Dupont"
              className={touched.last_name ? (errors.last_name ? 'border-red-400' : 'border-[#1D9E75]') : ''} />
          </Field>
        </div>

        <Field label="Date de naissance (JJ/MM/AAAA)" required touched={touched.birth_date} error={errors.birth_date} valid={!errors.birth_date}>
          <StyledInput value={form.birth_date} onChange={e => set('birth_date', e.target.value)} onBlur={() => touch('birth_date')} placeholder="15/03/1990"
            className={touched.birth_date ? (errors.birth_date ? 'border-red-400' : 'border-[#1D9E75]') : ''} />
        </Field>

        <Field label="Téléphone (format belge)" required touched={touched.phone} error={errors.phone} valid={!errors.phone}>
          <StyledInput value={form.phone} onChange={e => set('phone', e.target.value)} onBlur={() => touch('phone')} placeholder="0477 12 34 56" type="tel"
            className={touched.phone ? (errors.phone ? 'border-red-400' : 'border-[#1D9E75]') : ''} />
        </Field>

        <Field label="Adresse complète" required touched={touched.address} error={errors.address || geoError} valid={!errors.address && !geoError && !!form.address}>
          <StyledInput value={form.address} onChange={e => set('address', e.target.value)} onBlur={() => touch('address')} placeholder="Rue de la Loi 16, 1000 Bruxelles"
            className={touched.address ? (errors.address ? 'border-red-400' : 'border-[#1D9E75]') : ''}
            suffix={
              <button type="button" onClick={handleGeolocate} className="text-[#534AB7]" title="Géolocaliser">
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </button>
            }
          />
        </Field>

        {userType === 'professionnel' && (
          <>
            <div className="border-t border-[#E5E7EB] pt-2">
              <p className="text-sm font-semibold text-[#534AB7]">Informations professionnelles</p>
            </div>
            <Field label="Catégorie de service" required touched={touched.category_name} error={errors.category_name} valid={!errors.category_name && !!form.category_name}>
              <select value={form.category_name} onChange={e => { set('category_name', e.target.value); touch('category_name'); }} onBlur={() => touch('category_name')}
                className={`w-full h-11 px-3.5 border rounded-lg text-foreground bg-background focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] text-base ${
                  touched.category_name ? (errors.category_name ? 'border-red-400' : 'border-[#1D9E75]') : 'border-border'
                }`} style={{ fontSize: 16 }}>
                <option value="">Choisissez votre métier</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Numéro BCE/KBO" touched={touched.bce_number} error={errors.bce_number} valid={!errors.bce_number && !!form.bce_number}>
              <StyledInput value={form.bce_number} onChange={e => set('bce_number', e.target.value)} onBlur={() => touch('bce_number')} placeholder="0477.123.456"
                className={touched.bce_number && form.bce_number ? (errors.bce_number ? 'border-red-400' : 'border-[#1D9E75]') : ''} />
            </Field>
            <Field label={`Description de vos services (${form.pro_description.length}/50 min)`} required touched={touched.pro_description} error={errors.pro_description} valid={!errors.pro_description && form.pro_description.length >= 50}>
              <textarea value={form.pro_description} onChange={e => set('pro_description', e.target.value)} onBlur={() => touch('pro_description')}
                placeholder="Décrivez vos compétences, expériences et services proposés..." rows={4}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:border-[#534AB7] focus:ring-1 focus:ring-[#534AB7] resize-none text-base ${
                  touched.pro_description ? (errors.pro_description ? 'border-red-400' : 'border-[#1D9E75]') : 'border-border'
                }`} style={{ fontSize: 16 }} />
            </Field>
          </>
        )}

        {!canProceed && Object.values(touched).some(Boolean) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-400 space-y-0.5">
              {Object.entries(errors).filter(([, v]) => v && touched[Object.keys(errors).find(k => errors[k] === v)]).map(([key, msg]) => msg ? <p key={key}>• {msg}</p> : null)}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
          <input type="checkbox" id="terms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#534AB7] shrink-0 cursor-pointer" />
          <label htmlFor="terms" className="text-xs text-[#374151] leading-relaxed cursor-pointer">
            J'accepte les{' '}
            <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-[#534AB7] underline font-semibold">Conditions Générales d'Utilisation</a>
            {' '}et la{' '}
            <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-[#534AB7] underline font-semibold">Politique de Confidentialité</a>
            {' '}de ServiGo
          </label>
        </div>

        <button onClick={handleSubmit} disabled={isSaving || !termsAccepted}
          className="w-full h-12 rounded-xl text-base font-semibold transition-colors mt-2 text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#FF6B35' }}>
          {isSaving ? <><Loader2 className="inline w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : <>Continuer <ChevronRight className="inline w-5 h-5 ml-1" /></>}
        </button>
      </div>
    </div>
  );
}
