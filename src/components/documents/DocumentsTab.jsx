import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, PenLine, CheckCircle, Clock, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

// ─── PDF generation ──────────────────────────────────────────────────────────
function generateInvoicePDF(invoice, type = 'facture') {
  const doc = new jsPDF();
  const isDevis = type === 'devis';

  // Header — branded #1A1A2E
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, 210, 44, 'F');
  // Orange accent bar
  doc.setFillColor(255, 107, 53);
  doc.rect(0, 44, 210, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ServiGo', 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 107, 53);
  doc.text(isDevis ? 'DEVIS' : 'FACTURE', 20, 32);
  doc.setTextColor(255, 255, 255);

  // Reset color
  doc.setTextColor(30, 30, 30);

  // Ref + date
  doc.setFontSize(10);
  doc.text(`N° : ${invoice.invoice_number}`, 120, 52);
  const dateStr = invoice.created_date ? format(new Date(invoice.created_date), 'dd/MM/yyyy', { locale: fr }) : format(new Date(), 'dd/MM/yyyy', { locale: fr });
  doc.text(`Date : ${dateStr}`, 120, 60);

  // Parties
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CLIENT', 20, 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.customer_name || '—', 20, 64);
  doc.text(invoice.customer_email || '—', 20, 71);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PRESTATAIRE', 120, 72);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.professional_name || '—', 120, 80);

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 85, 190, 85);

  // Service table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, 90, 170, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Prestation', 24, 97);
  doc.text('Prix HT', 130, 97);
  doc.text('Total', 170, 97);

  // Row
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.category_name || 'Service', 24, 110);
  doc.text(`${(invoice.base_price || 0).toFixed(2)} €`, 130, 110);
  doc.text(`${(invoice.base_price || 0).toFixed(2)} €`, 170, 110);

  // Totals
  doc.line(20, 118, 190, 118);
  doc.setFontSize(10);
  doc.text(`Commission plateforme (10%) :`, 110, 128);
  doc.text(`${(invoice.commission || 0).toFixed(2)} €`, 175, 128, { align: 'right' });

  const tva = ((invoice.base_price || 0) + (invoice.commission || 0)) * 0.21;
  doc.text(`TVA (21%) :`, 110, 137);
  doc.text(`${tva.toFixed(2)} €`, 175, 137, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL TTC :`, 110, 148);
  doc.text(`${(invoice.total_price || 0).toFixed(2)} €`, 175, 148, { align: 'right' });

  // Payment method
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const pm = invoice.payment_method === 'cash' ? 'Espèces' : invoice.payment_method === 'stripe' ? 'Carte bancaire (en ligne)' : 'Virement bancaire';
  doc.text(`Mode de paiement : ${pm}`, 20, 160);
  doc.text(`Statut : ${invoice.payment_status === 'paid' ? 'Payée ✓' : 'En attente'}`, 20, 168);

  // Signatures area
  doc.line(20, 178, 190, 178);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Signature client', 40, 186);
  doc.text('Signature prestataire', 130, 186);
  doc.rect(20, 190, 70, 30);
  doc.rect(120, 190, 70, 30);

  // Embed signature images if available
  if (invoice.signature_customer_url) {
    doc.addImage(invoice.signature_customer_url, 'PNG', 22, 192, 66, 26);
  }
  if (invoice.signature_pro_url) {
    doc.addImage(invoice.signature_pro_url, 'PNG', 122, 192, 66, 26);
  }

  // Footer
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 278, 210, 20, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ServiGo — contact@servigo.be — Bruxelles, Belgique 🇧🇪', 105, 287, { align: 'center' });
  doc.setTextColor(255, 107, 53);
  doc.text('www.servigo.be', 105, 293, { align: 'center' });

  doc.save(`${isDevis ? 'devis' : 'facture'}_${invoice.invoice_number}.pdf`);
}

// ─── Signature Canvas Modal ──────────────────────────────────────────────────
function SignatureModal({ onClose, onConfirm }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#0f0f0f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    // Check not blank
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasContent = data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasContent) { toast.error('Veuillez signer avant de confirmer'); return; }
    onConfirm(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full max-w-md rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Signature électronique</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Signez dans le cadre ci-dessous avec votre doigt ou la souris</p>
        <div className="border-2 border-dashed border-border rounded-2xl overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={360}
            height={160}
            className="w-full"
            style={{ touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={clearCanvas} className="flex-1 rounded-xl h-11">
            <Trash2 className="w-4 h-4 mr-2" /> Effacer
          </Button>
          <Button onClick={confirm} className="flex-1 rounded-xl h-11">
            <CheckCircle className="w-4 h-4 mr-2" /> Confirmer la signature
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DocumentsTab({ user }) {
  const queryClient = useQueryClient();
  const [signingInvoiceId, setSigningInvoiceId] = useState(null);
  const [docType, setDocType] = useState('factures'); // 'factures' | 'devis'

  const isCustomer = user?.user_type === 'particulier';

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['userInvoices', user?.email],
    queryFn: () => {
      if (!user?.email) return [];
      return base44.entities.Invoice.list('-created_date', 100);
    },
    enabled: !!user?.email,
    select: (data) => {
      if (isCustomer) return data.filter(i => i.customer_email === user.email);
      return data.filter(i => i.professional_name === user.full_name || i.customer_email === user.email);
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['userRequestsDocs', user?.email],
    queryFn: () => base44.entities.ServiceRequest.filter(
      isCustomer ? { customer_email: user.email } : { professional_email: user.email },
      '-created_date', 100
    ),
    enabled: !!user?.email,
  });

  const signMutation = useMutation({
    mutationFn: ({ invoiceId, field, dataUrl }) =>
      base44.entities.Invoice.update(invoiceId, { [field]: dataUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInvoices'] });
      toast.success('Document signé avec succès !');
      setSigningInvoiceId(null);
    },
  });

  // Pending quotes (requests with status searching/pending_pro that have no invoice yet)
  const pendingRequests = requests.filter(r =>
    ['searching', 'pending_pro', 'accepted'].includes(r.status)
  );

  const handleSign = (dataUrl) => {
    const invoice = invoices.find(i => i.id === signingInvoiceId);
    if (!invoice) return;
    const field = isCustomer ? 'signature_customer_url' : 'signature_pro_url';
    signMutation.mutate({ invoiceId: invoice.id, field, dataUrl });
  };

  const sigField = isCustomer ? 'signature_customer_url' : 'signature_pro_url';

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        {[['factures', 'Factures'], ['devis', 'Devis']].map(([k, l]) => (
          <button key={k} onClick={() => setDocType(k)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              docType === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
            }`}>
            <FileText className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
      </div>

      {/* FACTURES */}
      {docType === 'factures' && (
        isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune facture disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const signed = !!inv[sigField];
              const bothSigned = !!inv.signature_customer_url && !!inv.signature_pro_url;
              return (
                <div key={inv.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.category_name} · {inv.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.created_date ? format(new Date(inv.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{(inv.total_price || 0).toFixed(2)} €</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        inv.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {inv.payment_status === 'paid' ? '✓ Payée' : 'En attente'}
                      </span>
                    </div>
                  </div>

                  {/* Signature status */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {inv.signature_customer_url
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">Client</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {inv.signature_pro_url
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">Prestataire</span>
                    </div>
                    {bothSigned && <span className="text-xs font-medium text-green-600 ml-auto">✓ Contrat signé</span>}
                  </div>

                  <div className="flex gap-2">
                    {!signed && (
                      <Button onClick={() => setSigningInvoiceId(inv.id)} variant="outline" size="sm" className="flex-1 rounded-xl h-9 text-xs">
                        <PenLine className="w-3.5 h-3.5 mr-1.5" /> Signer
                      </Button>
                    )}
                    <Button onClick={() => generateInvoicePDF(inv, 'facture')} variant="outline" size="sm" className={`${signed ? 'flex-1' : ''} rounded-xl h-9 text-xs`}>
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Télécharger
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* DEVIS */}
      {docType === 'devis' && (
        pendingRequests.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun devis disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => {
              const fakeInvoice = {
                invoice_number: `DEV-${req.id?.slice(-6)?.toUpperCase()}`,
                category_name: req.category_name,
                customer_name: req.customer_name,
                customer_email: req.customer_email,
                professional_name: req.professional_name,
                base_price: req.base_price || 0,
                commission: req.commission || 0,
                total_price: req.total_price || 0,
                payment_method: req.payment_method,
                payment_status: req.payment_status || 'unpaid',
                created_date: req.created_date,
                signature_customer_url: null,
                signature_pro_url: null,
              };
              return (
                <div key={req.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">DEV-{req.id?.slice(-6)?.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.category_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.created_date ? format(new Date(req.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                      </p>
                    </div>
                    <p className="font-bold text-lg shrink-0">{(req.total_price || 0).toFixed(2)} €</p>
                  </div>
                  <Button onClick={() => generateInvoicePDF(fakeInvoice, 'devis')} variant="outline" size="sm" className="w-full rounded-xl h-9 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Télécharger le devis PDF
                  </Button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Signature modal */}
      {signingInvoiceId && (
        <SignatureModal
          onClose={() => setSigningInvoiceId(null)}
          onConfirm={handleSign}
        />
      )}
    </div>
  );
}