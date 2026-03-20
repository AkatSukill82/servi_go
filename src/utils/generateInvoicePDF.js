import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const paymentLabels = {
  apple_pay: 'Apple Pay',
  bank_transfer: 'Virement bancaire',
  cash: 'Espèces',
};

export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;

  // ── Header background
  doc.setFillColor(37, 99, 235); // primary blue
  doc.rect(0, 0, W, 45, 'F');

  // ── Logo / App name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ServiConnect', margin, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Facture de service', margin, 32);

  // Invoice number top-right
  doc.setFontSize(10);
  doc.text(invoice.invoice_number || '', W - margin, 22, { align: 'right' });
  const dateStr = invoice.created_date
    ? format(new Date(invoice.created_date), 'dd MMMM yyyy', { locale: fr })
    : '';
  doc.text(dateStr, W - margin, 32, { align: 'right' });

  // ── Section: Parties
  let y = 60;
  doc.setTextColor(30, 30, 30);

  // Client box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, (W - 2 * margin) / 2 - 5, 35, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', margin + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.customer_name || 'N/A', margin + 5, y + 17);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.customer_email || '', margin + 5, y + 25);

  // Professional box
  const boxX = W / 2 + 5;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(boxX, y, (W - 2 * margin) / 2 - 5, 35, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PROFESSIONNEL', boxX + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.professional_name || 'N/A', boxX + 5, y + 17);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.category_name || '', boxX + 5, y + 25);

  // ── Section: Service details table
  y += 50;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Détail de la prestation', margin, y);

  y += 6;
  // Table header
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, W - 2 * margin, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', margin + 4, y + 6);
  doc.text('Montant', W - margin - 4, y + 6, { align: 'right' });

  y += 9;
  // Row 1
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, W - 2 * margin, 9, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`Service : ${invoice.category_name || 'Prestation'}`, margin + 4, y + 6);
  doc.text(`${(invoice.base_price || 0).toFixed(2)} €`, W - margin - 4, y + 6, { align: 'right' });

  y += 9;
  // Row 2
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, W - 2 * margin, 9, 'F');
  doc.setTextColor(30, 30, 30);
  doc.text('Frais de service (10%)', margin + 4, y + 6);
  doc.text(`${(invoice.commission || 0).toFixed(2)} €`, W - margin - 4, y + 6, { align: 'right' });

  y += 9;
  // Total row
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, W - 2 * margin, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC', margin + 4, y + 7.5);
  doc.text(`${(invoice.total_price || 0).toFixed(2)} €`, W - margin - 4, y + 7.5, { align: 'right' });

  // ── Payment info
  y += 22;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, W - 2 * margin, 24, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MODE DE PAIEMENT', margin + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(paymentLabels[invoice.payment_method] || 'N/A', margin + 5, y + 17);

  // Payment status badge
  const statusLabel = invoice.payment_status === 'paid' ? 'PAYÉE' : 'EN ATTENTE';
  const statusColor = invoice.payment_status === 'paid' ? [22, 163, 74] : [245, 158, 11];
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - margin - 30, y + 9, 28, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, W - margin - 16, y + 15.5, { align: 'center' });

  // ── Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ServiConnect — Plateforme de mise en relation de services à domicile', W / 2, 285, { align: 'center' });
  doc.text('Document généré automatiquement — ne pas modifier', W / 2, 290, { align: 'center' });

  doc.save(`${invoice.invoice_number || 'facture'}.pdf`);
}