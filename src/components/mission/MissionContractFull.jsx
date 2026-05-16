import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock, Trash2, PenLine, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onSign, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: (s.clientX - r.left) * (canvas.width / r.width), y: (s.clientY - r.top) * (canvas.height / r.height) };
  };
  const start = (e) => { drawing.current = true; last.current = pos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const p = pos(e, canvas);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; };
  const clear = () => canvasRef.current.getContext('2d').clearRect(0, 0, 700, 200);
  const confirm = () => {
    const canvas = canvasRef.current;
    const data = canvas.getContext('2d').getImageData(0, 0, 700, 200).data;
    if (!data.some((v, i) => i % 4 === 3 && v > 0)) { toast.error('Veuillez signer avant de confirmer'); return; }
    onSign(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center sm:justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1a1a2e]">Signature électronique</h3>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500">Signez dans le cadre avec votre doigt ou la souris</p>
        <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
          <canvas ref={canvasRef} width={700} height={200} className="w-full" style={{ touchAction: 'none' }}
            onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 flex items-center justify-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Effacer
          </button>
          <button onClick={confirm} className="flex-1 h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: '#1a1a2e' }}>
            <PenLine className="w-4 h-4" /> Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: '#e94560' }}>
        {number}
      </div>
      <h2 className="text-base font-bold text-[#1a1a2e] uppercase tracking-wide">{title}</h2>
    </div>
  );
}

// ─── Photo upload zone ────────────────────────────────────────────────────────
function PhotoZone({ label, photos = [], onAdd, readOnly }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onAdd(file_url);
    setUploading(false);
  };
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <img key={i} src={url} alt={`photo ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
        ))}
        {!readOnly && (
          <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            {uploading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <><Camera className="w-5 h-5 text-gray-400 mb-1" /><span className="text-[10px] text-gray-400">Ajouter</span></>}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MissionContractFull({ contract, userEmail, userType, onContractUpdate }) {
  const queryClient = useQueryClient();
  const [showSign, setShowSign] = useState(false);
  const [withdrawalWaived, setWithdrawalWaived] = useState(contract.withdrawal_right_waived || false);

  const isCust = userType === 'particulier';
  const mySigned = !!(isCust ? contract.signature_customer : contract.signature_pro);
  const otherSigned = !!(isCust ? contract.signature_pro : contract.signature_customer);
  const bothSigned = !!(contract.signature_customer && contract.signature_pro);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const updateMut = useMutation({
    mutationFn: (data) => base44.entities.MissionContract.update(contract.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contract.request_id] });
      onContractUpdate?.();
    },
  });

  const signMutation = useMutation({
    mutationFn: async (dataUrl) => {
      const field = isCust ? 'signature_customer' : 'signature_pro';
      const dateField = isCust ? 'signature_customer_date' : 'signature_pro_date';
      const ipField = isCust ? 'customer_ip' : 'pro_ip';
      const otherAlreadySigned = isCust ? contract.signature_pro : contract.signature_customer;
      const newStatus = otherAlreadySigned ? 'signed_both' : (isCust ? 'signed_customer' : 'sent_to_customer');
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: async () => ({ ip: null }) }));
      const { ip } = await ipRes.json().catch(() => ({ ip: null }));
      await base44.entities.MissionContract.update(contract.id, {
        [field]: dataUrl,
        [dateField]: new Date().toISOString(),
        [ipField]: ip,
        status: newStatus,
        withdrawal_right_waived: withdrawalWaived,
      });
      if (newStatus === 'signed_both') {
        await base44.entities.ServiceRequestV2.update(contract.request_id, { status: 'contract_signed' });
        const notifBase = { type: 'contract_signed', title: 'Contrat signé par les deux parties !', body: 'La mission peut maintenant commencer.', request_id: contract.request_id, action_url: `/Chat?requestId=${contract.request_id}` };
        await Promise.all([
          base44.entities.Notification.create({ ...notifBase, recipient_email: contract.professional_email, recipient_type: 'professionnel' }),
          base44.entities.Notification.create({ ...notifBase, recipient_email: contract.customer_email, recipient_type: 'particulier' }),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contract.request_id] });
      queryClient.invalidateQueries({ queryKey: ['request', contract.request_id] });
      toast.success('Contrat signé avec succès !');
      setShowSign(false);
    },
  });

  const confirmCompletionMut = useMutation({
    mutationFn: async () => {
      const field = isCust ? 'completion_confirmed_customer' : 'completion_confirmed_pro';
      const update = { [field]: true };
      const otherConfirmed = isCust ? contract.completion_confirmed_pro : contract.completion_confirmed_customer;
      if (otherConfirmed) { update.status = 'completed'; update.completion_date = new Date().toISOString(); }
      await base44.entities.MissionContract.update(contract.id, update);
      if (otherConfirmed) {
        await base44.entities.ServiceRequestV2.update(contract.request_id, { status: 'completed' });
        toast.success('Mission terminée ! 🎉');
      } else {
        toast.success('Confirmation enregistrée. En attente de l\'autre partie.');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract', contract.request_id] }),
  });

  const dateDisplay = contract.scheduled_date ? (() => {
    try { return format(new Date(contract.scheduled_date), 'dd MMMM yyyy', { locale: fr }); } catch { return contract.scheduled_date; }
  })() : '—';

  const contractDateDisplay = contract.created_date ? (() => {
    try { return format(new Date(contract.created_date), 'dd MMMM yyyy', { locale: fr }); } catch { return contract.created_date; }
  })() : format(new Date(), 'dd MMMM yyyy', { locale: fr });

  return (
    <div className="bg-white text-[#1a1a2e]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <span className="text-white font-black text-lg">ServiGo</span>
            </div>
            <p className="text-white font-bold text-base">Contrat de Mission</p>
            <p className="text-white/60 text-xs mt-0.5">Engagement mutuel entre le client et le professionnel</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/40 text-[10px] uppercase tracking-wide">Contrat</p>
            <p className="text-white font-mono text-xs font-bold">{contract.contract_number}</p>
            <p className="text-white/50 text-[10px] mt-0.5">{contractDateDisplay}</p>
          </div>
        </div>
        <div className="mt-4 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #e94560, #ff6b35, #2ecc71)' }} />
      </div>

      <div className="p-4 md:p-6 space-y-8">

        {/* ─── SECTION 1: PARTIES ───────────────────────────────────────────── */}
        <section>
          <SectionTitle number="1" title="Parties Contractantes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Client */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #3498db' }}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-[#3498db] uppercase tracking-wide">Le Client</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Identité vérifiée
                </span>
              </div>
              <div className="px-4 py-3 space-y-1 text-xs text-gray-600">
                <p className="font-bold text-[#1a1a2e] text-sm">{contract.customer_name || '—'}</p>
                {contract.customer_address && <p>📍 {contract.customer_address}</p>}
                {contract.customer_email && <p>✉️ {contract.customer_email}</p>}
                {contract.customer_phone && <p>📞 {contract.customer_phone}</p>}
              </div>
            </div>
            {/* Pro */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderLeft: '4px solid #e94560' }}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-[#e94560] uppercase tracking-wide">Le Professionnel</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Pro vérifié
                </span>
              </div>
              <div className="px-4 py-3 space-y-1 text-xs text-gray-600">
                <p className="font-bold text-[#1a1a2e] text-sm">{contract.professional_name || '—'}</p>
                {contract.professional_bce && <p>🏢 BCE : {contract.professional_bce}</p>}
                {contract.category_name && <p>🔧 Métier : {contract.category_name}</p>}
                <p>🛡️ Assurance RC Pro : Attestation vérifiée</p>
                {contract.professional_email && <p>✉️ {contract.professional_email}</p>}
                {contract.professional_phone && <p>📞 {contract.professional_phone}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: LA MISSION ────────────────────────────────────────── */}
        <section>
          <SectionTitle number="2" title="La Mission" />
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{contract.category_name}</p>
            <p className="text-sm text-[#1a1a2e] leading-relaxed">{contract.service_description || 'Description non spécifiée.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Date d'intervention", value: dateDisplay, icon: '📅' },
              { label: "Heure prévue", value: contract.scheduled_time || '—', icon: '🕐' },
              { label: "Lieu", value: contract.customer_address || '—', icon: '📍' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-xs font-semibold text-[#1a1a2e] flex items-start gap-1.5"><span>{item.icon}</span><span>{item.value}</span></p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION 3: ENGAGEMENTS MUTUELS ──────────────────────────────── */}
        <section>
          <SectionTitle number="3" title="Engagements Mutuels" />
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">En signant ce contrat, chaque partie s'engage à respecter ses obligations pour garantir le bon déroulement de la mission.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Client */}
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#ebf5fb', borderColor: '#aed6f1' }}>
              <p className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#2471a3' }}>
                <span className="text-lg">👤</span> Le Client s'engage à :
              </p>
              <ul className="space-y-2">
                {[
                  "Régler le montant convenu sur place avec le professionnel, après son évaluation et votre accord, une fois la mission réalisée",
                  "Garantir l'accès au lieu d'intervention à la date et heure prévues",
                  "Fournir des informations exactes sur le problème à résoudre",
                  "Traiter le professionnel avec respect et courtoisie",
                  "Confirmer la bonne réalisation de la mission dans l'application",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#2471a3' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Pro */}
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#fdedec', borderColor: '#f5b7b1' }}>
              <p className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#c0392b' }}>
                <span className="text-lg">🛠</span> Le Professionnel s'engage à :
              </p>
              <ul className="space-y-2">
                {[
                  "Exécuter la mission dans les règles de l'art et selon les normes en vigueur",
                  "Se présenter à la date et heure convenues",
                  "Disposer des compétences et qualifications requises pour cette intervention",
                  "Être couvert par une assurance RC professionnelle valide",
                  "Informer le client de toute difficulté ou changement en cours de mission",
                  "Prendre des photos avant et après l'intervention",
                  "Confirmer la réalisation de la mission dans l'application",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#c0392b' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: CONDITIONS PARTICULIÈRES ─────────────────────────── */}
        {contract.special_conditions && (
          <section>
            <SectionTitle number="4" title="Conditions Particulières" />
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed italic">"{contract.special_conditions}"</p>
            </div>
          </section>
        )}

        {/* ─── SECTION 5: CLAUSES LÉGALES ──────────────────────────────────── */}
        <section>
          <SectionTitle number="5" title="Clauses Légales" />
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs text-gray-600 leading-relaxed">
            {[
              { art: "Art. 1 — Objet", text: "Le présent contrat formalise l'engagement mutuel entre le Client et le Professionnel via la plateforme ServiGo pour la réalisation d'une prestation de service à domicile." },
              { art: "Art. 2 — Rôle de ServiGo", text: "ServiGo agit en qualité d'intermédiaire de mise en relation uniquement et n'est pas partie au contrat. Le paiement s'effectue directement entre le Client et le Professionnel selon les modalités convenues." },
              { art: "Art. 3 — Qualifications", text: "Le Professionnel déclare être dûment inscrit à la BCE (Banque-Carrefour des Entreprises), disposer des compétences requises par la réglementation belge et être couvert par une assurance RC professionnelle valide." },
              { art: "Art. 4 — Engagement de paiement", text: "Aucun prix n'est fixé à l'avance. Le Professionnel évalue le travail sur place et soumet un devis verbal ou écrit avant de commencer. Le Client s'engage à régler le montant convenu sur place avec le Professionnel après réalisation de la mission. Tout défaut de paiement pourra entraîner la suspension du compte sur la Plateforme." },
              { art: "Art. 5 — Engagement de qualité", text: "Le Professionnel s'engage à exécuter la prestation dans les règles de l'art et à assumer l'entière responsabilité de la qualité de son travail." },
              { art: "Art. 7 — Annulation", text: "Annulation plus de 24h avant la mission : gratuite. Annulation en deçà de 24h : des frais de déplacement peuvent être dus au Professionnel selon la politique convenue." },
              { art: "Art. 8 — Litiges", text: "En cas de litige, les parties s'engagent à rechercher une solution amiable via le service de médiation ServiGo. Plateforme de règlement en ligne des litiges ODR : https://ec.europa.eu/consumers/odr" },
              { art: "Art. 9 — Droit applicable", text: "Le présent contrat est régi par le droit belge. En cas de litige non résolu, les tribunaux de l'arrondissement judiciaire de Bruxelles sont compétents." },
              { art: "Art. 10 — Protection des données", text: "Le traitement des données personnelles est régi par le RGPD (Règlement UE 2016/679) et la Politique de Confidentialité de ServiGo, disponible sur www.servigo.be/confidentialite." },
              { art: "Art. 11 — CGU / CGV", text: `En signant ce contrat, chaque partie confirme avoir accepté les Conditions Générales d'Utilisation et les Conditions Générales de Vente de ServiGo (Version ${contract.terms_version || 'v1.0'}) lors de son inscription.` },
            ].map((clause, i) => (
              <div key={i}>
                <p className="font-semibold text-[#1a1a2e] mb-0.5">{clause.art}</p>
                <p>{clause.text}</p>
                {i < 10 && <div className="border-b border-gray-200 mt-3" />}
              </div>
            ))}
            {/* Art. 6 highlighted */}
            <div>
              <p className="font-semibold text-[#1a1a2e] mb-0.5">Art. 6 — Droit de rétractation</p>
              <p className="rounded-lg px-2 py-1 inline leading-relaxed" style={{ backgroundColor: '#fef9c3' }}>
                Conformément à l'Art. VI.47 du Code de droit économique belge (CDE), le Client dispose d'un délai de 14 jours calendriers pour exercer son droit de rétractation, sans motif. Ce droit ne s'applique pas si l'exécution a commencé avec accord exprès du Client (voir Section 6 ci-dessous).
              </p>
            </div>
          </div>
        </section>

        {/* ─── SECTION 6: DROIT DE RÉTRACTATION ───────────────────────────── */}
        <section>
          <SectionTitle number="6" title="Droit de Rétractation" />
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: '#e8f4fd', borderColor: '#aed6f1' }}>
            <p className="text-xs font-bold text-[#1a6fa8]">Votre droit (Art. VI.47–53 Code de droit économique)</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              Vous disposez d'un délai de <strong>14 jours calendriers</strong> à compter de la signature du présent contrat pour vous rétracter sans motif et sans frais. Pour exercer ce droit, contactez ServiGo à <strong>contact@servigo.be</strong>.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={withdrawalWaived}
                onChange={e => {
                  setWithdrawalWaived(e.target.checked);
                  if (!bothSigned) updateMut.mutate({ withdrawal_right_waived: e.target.checked });
                }}
                disabled={bothSigned}
                className="mt-0.5 w-4 h-4 rounded shrink-0"
                style={{ accentColor: '#1a6fa8' }}
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Je demande expressément que l'exécution du service commence avant la fin du délai de rétractation, et je reconnais perdre mon droit de rétractation une fois le service pleinement exécuté (Art. VI.53 CDE).
              </span>
            </label>
          </div>
        </section>

        {/* ─── SECTION 7: PHOTOS ───────────────────────────────────────────── */}
        <section>
          <SectionTitle number="7" title="Photos Avant / Après" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <PhotoZone
                label="📷 Avant intervention"
                photos={contract.photos_before || []}
                onAdd={(url) => updateMut.mutate({ photos_before: [...(contract.photos_before || []), url] })}
                readOnly={isCust}
              />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <PhotoZone
                label="✅ Après intervention"
                photos={contract.photos_after || []}
                onAdd={(url) => updateMut.mutate({ photos_after: [...(contract.photos_after || []), url] })}
                readOnly={isCust}
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION 8: SIGNATURES ───────────────────────────────────────── */}
        <section>
          <SectionTitle number="8" title="Signatures" />
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">En signant, chaque partie confirme avoir lu et accepté les engagements ci-dessus.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Client signature */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#f0f8ff' }}>
                <p className="text-xs font-bold" style={{ color: '#2471a3' }}>👤 Le Client</p>
                {contract.signature_customer
                  ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé</span>
                  : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"><Clock className="w-3 h-3 inline mr-0.5" /> En attente</span>}
              </div>
              <div className="p-3">
                {contract.signature_customer ? (
                  <div className="space-y-2">
                    <img src={contract.signature_customer} alt="Signature client" className="w-full h-20 object-contain border border-gray-100 rounded-lg bg-gray-50" />
                    <p className="text-[10px] text-gray-400">{contract.signature_customer_date ? format(new Date(contract.signature_customer_date), 'dd/MM/yyyy HH:mm') : ''}{contract.customer_ip ? ` — IP: ${contract.customer_ip}` : ''}</p>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    {isCust && !mySigned ? (
                      <button onClick={() => setShowSign(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white" style={{ backgroundColor: '#3498db' }}>
                        <PenLine className="w-3.5 h-3.5" /> Signer
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400">En attente</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Pro signature */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#fdf2f2' }}>
                <p className="text-xs font-bold" style={{ color: '#c0392b' }}>🛠 Le Professionnel</p>
                {contract.signature_pro
                  ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé</span>
                  : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"><Clock className="w-3 h-3 inline mr-0.5" /> En attente</span>}
              </div>
              <div className="p-3">
                {contract.signature_pro ? (
                  <div className="space-y-2">
                    <img src={contract.signature_pro} alt="Signature pro" className="w-full h-20 object-contain border border-gray-100 rounded-lg bg-gray-50" />
                    <p className="text-[10px] text-gray-400">{contract.signature_pro_date ? format(new Date(contract.signature_pro_date), 'dd/MM/yyyy HH:mm') : ''}{contract.pro_ip ? ` — IP: ${contract.pro_ip}` : ''}</p>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    {!isCust && !mySigned ? (
                      <button onClick={() => setShowSign(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white" style={{ backgroundColor: '#e94560' }}>
                        <PenLine className="w-3.5 h-3.5" /> Signer
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400">En attente</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {bothSigned && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm font-bold text-green-700">Contrat signé par les deux parties ✅ — La mission peut commencer !</p>
            </div>
          )}
        </section>

        {/* ─── SECTION 9: CONFIRMATION FIN DE MISSION ──────────────────────── */}
        {bothSigned && (
          <section>
            <SectionTitle number="9" title="Confirmation de Fin de Mission" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Client', confirmed: contract.completion_confirmed_customer, canConfirm: isCust, color: '#3498db', bg: '#ebf5fb' },
                { label: 'Professionnel', confirmed: contract.completion_confirmed_pro, canConfirm: !isCust, color: '#e94560', bg: '#fdedec' },
              ].map((party) => (
                <div key={party.label} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: party.bg }}>
                    <p className="text-xs font-bold" style={{ color: party.color }}>{party.label}</p>
                    {party.confirmed
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmé</span>
                      : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">En attente</span>}
                  </div>
                  <div className="p-3">
                    {party.confirmed ? (
                      <p className="text-xs text-green-700 font-medium text-center py-2">✅ Mission confirmée</p>
                    ) : party.canConfirm ? (
                      <button
                        onClick={() => confirmCompletionMut.mutate()}
                        disabled={confirmCompletionMut.isPending}
                        className="w-full h-9 rounded-lg text-white text-xs font-semibold"
                        style={{ backgroundColor: party.color }}
                      >
                        {confirmCompletionMut.isPending ? '...' : 'Confirmer la fin de mission'}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">En attente de confirmation</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {contract.completion_confirmed_customer && contract.completion_confirmed_pro && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-700">Mission complétée avec succès 🎉</p>
              </div>
            )}
          </section>
        )}

        {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 space-y-1.5">
          <p>ServiGo — SRL en cours de constitution — BCE : en cours d'immatriculation</p>
          <p>
            <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Mentions légales</a>
            {" | "}
            <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">CGU</a>
            {" | "}
            <a href="/cgv" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">CGV</a>
            {" | "}
            <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Confidentialité</a>
            {" | "}
            <a href="/cookies" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Cookies</a>
          </p>
          <p>
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              Plateforme ODR — Règlement des litiges en ligne
            </a>
          </p>
        </div>
      </div>

      {showSign && <SignaturePad onSign={(d) => signMutation.mutate(d)} onClose={() => setShowSign(false)} />}
    </div>
  );
}