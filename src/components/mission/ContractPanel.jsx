import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, Clock, PenLine, Trash2, X } from 'lucide-react';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function SignaturePad({ onSign, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const start = (e) => { drawing.current = true; last.current = pos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const p = pos(e, canvas);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#0f0f0f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; };
  const clear = () => canvasRef.current.getContext('2d').clearRect(0, 0, 360, 150);
  const confirm = () => {
    const canvas = canvasRef.current;
    const data = canvas.getContext('2d').getImageData(0, 0, 360, 150).data;
    if (!data.some((v, i) => i % 4 === 3 && v > 0)) { toast.error('Veuillez signer avant de confirmer'); return; }
    onSign(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full rounded-t-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Signature électronique</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Signez dans le cadre avec votre doigt ou la souris</p>
        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden">
          <canvas ref={canvasRef} width={360} height={150} className="w-full" style={{ touchAction: 'none' }}
            onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear} className="flex-1 rounded-xl h-10 text-sm"><Trash2 className="w-4 h-4 mr-1.5" />Effacer</Button>
          <Button onClick={confirm} className="flex-1 rounded-xl h-10 text-sm"><PenLine className="w-4 h-4 mr-1.5" />Confirmer ma signature</Button>
        </div>
      </div>
    </div>
  );
}

export default function ContractPanel({ requestId, userEmail, userType }) {
  const queryClient = useQueryClient();
  const [showSign, setShowSign] = useState(false);

  const { data: contract } = useQuery({
    queryKey: ['contract', requestId],
    queryFn: () => base44.entities.MissionContract.filter({ request_id: requestId }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  const signMutation = useMutation({
    mutationFn: async (dataUrl) => {
      const isCust = userType === 'particulier';
      const field = isCust ? 'signature_customer' : 'signature_pro';
      const dateField = isCust ? 'signature_customer_date' : 'signature_pro_date';
      const ipField = isCust ? 'customer_ip' : 'pro_ip';
      const otherSigned = isCust ? contract.signature_pro : contract.signature_customer;
      const newStatus = otherSigned ? 'signed_both' : (isCust ? 'signed_customer' : 'sent_to_customer');

      // Fetch user IP
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: async () => ({ ip: null }) }));
      const { ip } = await ipRes.json();

      await base44.entities.MissionContract.update(contract.id, {
        [field]: dataUrl,
        [dateField]: new Date().toISOString(),
        [ipField]: ip,
        status: newStatus,
      });

      if (newStatus === 'signed_both') {
        await base44.entities.ServiceRequestV2.update(requestId, { status: 'contract_signed' });
        // Notify both parties
        await Promise.all([
          base44.entities.Notification.create({
            recipient_email: isCust ? contract.professional_email : contract.customer_email,
            recipient_type: isCust ? 'professionnel' : 'particulier',
            type: 'contract_signed',
            title: 'Contrat signé par les deux parties !',
            body: 'La mission peut maintenant commencer.',
            request_id: requestId,
            action_url: `/Chat?requestId=${requestId}`,
          }),
          base44.entities.Notification.create({
            recipient_email: isCust ? contract.customer_email : contract.professional_email,
            recipient_type: isCust ? 'particulier' : 'professionnel',
            type: 'contract_signed',
            title: 'Contrat signé ✔️',
            body: 'La mission peut maintenant commencer.',
            request_id: requestId,
            action_url: `/Chat?requestId=${requestId}`,
          }),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', requestId] });
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      toast.success('Contrat signé avec succès !');
      setShowSign(false);
    },
  });

  if (!contract) return null;

  const mySigned = !!(userType === 'particulier' ? contract.signature_customer : contract.signature_pro);
  const otherSigned = !!(userType === 'particulier' ? contract.signature_pro : contract.signature_customer);
  const bothSigned = mySigned && otherSigned;

  return (
    <>
      <div className="mx-4 my-2 rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Branded contract header */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#1A1A2E' }}>
          <div className="flex items-center gap-2">
            <ServiGoIcon size={18} white />
            <span className="text-xs font-bold text-white">ServiGo</span>
          </div>
          <span className="text-[10px] text-white/60 font-mono">{contract.contract_number}</span>
        </div>
        {/* Status bar */}
        <div className="h-1" style={{ backgroundColor: bothSigned ? '#00B894' : contract.status === 'cancelled' ? '#E17055' : '#FF6B35' }} />
        <div className={`p-4 space-y-3 ${bothSigned ? 'bg-green-50' : 'bg-card'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${bothSigned ? 'text-brand-green' : 'text-primary'}`} />
            <p className="text-sm font-semibold">{contract.contract_number}</p>
          </div>
          {bothSigned
            ? <span className="text-[10px] font-bold text-brand-green bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signé</span>
            : <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">En attente</span>
          }
        </div>

        {/* Contract details */}
        {contract.service_description && (
          <div className="text-xs space-y-1 bg-background/50 rounded-lg p-2.5">
            <p className="font-medium text-foreground">{contract.service_description}</p>
            {contract.agreed_price > 0 && <p className="text-muted-foreground">💰 Prix convenu: <span className="font-semibold text-foreground">{contract.agreed_price} €</span></p>}
            {contract.scheduled_date && <p className="text-muted-foreground">📅 {contract.scheduled_date}{contract.scheduled_time ? ` à ${contract.scheduled_time}` : ''}</p>}
            {contract.estimated_duration_hours && <p className="text-muted-foreground">⏱️ Durée estimée: {contract.estimated_duration_hours}h</p>}
            {contract.special_conditions && <p className="text-muted-foreground italic">📝 {contract.special_conditions}</p>}
          </div>
        )}

        {/* Signing status */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            {contract.signature_customer ? <CheckCircle className="w-3 h-3 text-brand-green" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
            <span className="text-muted-foreground">Client</span>
          </div>
          <div className="flex items-center gap-1">
            {contract.signature_pro ? <CheckCircle className="w-3 h-3 text-brand-green" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
            <span className="text-muted-foreground">Pro</span>
          </div>
        </div>

        {bothSigned && (
          <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
            <p className="text-xs font-semibold text-green-700">Contrat signé par les deux parties ✅</p>
          </div>
        )}

        {!mySigned && (
          <Button onClick={() => setShowSign(true)} size="sm" className="w-full rounded-xl h-9 text-xs">
            <PenLine className="w-3.5 h-3.5 mr-1.5" /> Signer le contrat
          </Button>
        )}
        {mySigned && !bothSigned && (
          <p className="text-xs text-center text-muted-foreground italic">En attente de signature de l'autre partie...</p>
        )}
        {/* Contract footer */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <p className="text-[9px] text-muted-foreground text-center">
            Document généré par ServiGo · Bruxelles, Belgique · Valeur contractuelle légale
          </p>
        </div>
        </div>
      </div>

      {showSign && <SignaturePad onSign={(d) => signMutation.mutate(d)} onClose={() => setShowSign(false)} />}
    </>
  );
}