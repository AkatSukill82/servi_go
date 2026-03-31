import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, Clock, PenLine, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function SignaturePad({ onSign, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const dpr = window.devicePixelRatio || 1;

  const initCanvas = (canvas) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  };

  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e, canvasRef.current); };
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
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  };
  const confirm = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
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
        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden" style={{ height: 160 }}>
          <canvas
            ref={el => { canvasRef.current = el; if (el) initCanvas(el); }}
            className="w-full h-full"
            style={{ touchAction: 'none' }}
            onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          />
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
      const otherSigned = isCust ? contract.signature_pro : contract.signature_customer;
      const newStatus = otherSigned ? 'signed_both' : (isCust ? 'signed_customer' : 'sent_to_customer');

      await base44.entities.MissionContract.update(contract.id, {
        [field]: dataUrl,
        [dateField]: new Date().toISOString(),
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
            title: 'Contrat signé par les deux parties !',
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

  const custSigDate = contract.signature_customer_date ? new Date(contract.signature_customer_date).toLocaleDateString('fr-BE') : null;
  const proSigDate = contract.signature_pro_date ? new Date(contract.signature_pro_date).toLocaleDateString('fr-BE') : null;

  return (
    <>
      <div className={`mx-4 my-2 rounded-2xl border p-4 ${bothSigned ? 'bg-green-50 border-green-200' : 'bg-primary/5 border-primary/20'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${bothSigned ? 'text-brand-green' : 'text-primary'}`} />
            <p className="text-sm font-semibold">{contract.contract_number}</p>
          </div>
          {bothSigned
            ? <span className="text-[10px] font-bold text-brand-green bg-green-100 px-2 py-0.5 rounded-full">✓ Signé</span>
            : <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">En attente</span>
          }
        </div>

        {/* Signatures display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/70 rounded-xl p-2 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              {contract.signature_customer ? <CheckCircle className="w-3 h-3 text-brand-green" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
              Client
            </p>
            {contract.signature_customer ? (
              <>
                <img src={contract.signature_customer} alt="Signature client" className="w-full h-10 object-contain" />
                {custSigDate && <p className="text-[9px] text-muted-foreground text-center mt-0.5">{custSigDate}</p>}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-2">En attente...</p>
            )}
          </div>
          <div className="bg-white/70 rounded-xl p-2 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              {contract.signature_pro ? <CheckCircle className="w-3 h-3 text-brand-green" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
              Pro
            </p>
            {contract.signature_pro ? (
              <>
                <img src={contract.signature_pro} alt="Signature pro" className="w-full h-10 object-contain" />
                {proSigDate && <p className="text-[9px] text-muted-foreground text-center mt-0.5">{proSigDate}</p>}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-2">En attente...</p>
            )}
          </div>
        </div>

        {contract.agreed_price > 0 && (
          <p className="text-sm font-bold text-center mb-3">{contract.agreed_price} €</p>
        )}

        {!mySigned && (
          <Button onClick={() => setShowSign(true)} size="sm" className="w-full rounded-xl h-9 text-xs">
            <PenLine className="w-3.5 h-3.5 mr-1.5" /> Signer le contrat
          </Button>
        )}
        {mySigned && !bothSigned && (
          <p className="text-xs text-center text-muted-foreground italic">En attente de signature de l'autre partie...</p>
        )}
      </div>

      {showSign && <SignaturePad onSign={(d) => signMutation.mutate(d)} onClose={() => setShowSign(false)} />}
    </>
  );
}