import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const paymentLabels = {
  apple_pay: 'Apple Pay',
  bank_transfer: 'Virement bancaire',
  cash: 'Espèces',
};

export async function generateInvoicePDF(invoice) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 18;

  // ── Background blanc pur
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // ── Bande noire en haut
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 52, 'F');

  // ── Logo ServiGo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ServiGo', margin, 24);

  // ── Sous-titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Plateforme de services à domicile', margin, 33);

  // ── Numéro de facture + date (aligné à droite dans le header)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoice_number || '', W - margin, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(8.5);
  const dateStr = invoice.created_date
    ? format(new Date(invoice.created_date), 'dd MMMM yyyy', { locale: fr })
    : '';
  doc.text(dateStr, W - margin, 31, { align: 'right' });

  // ── Mot "FACTURE" en grand
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', margin, 76);

  // Ligne séparatrice fine
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, 82, W - margin, 82);

  // ── Parties (CLIENT / PROFESSIONNEL) côte à côte
  let y = 92;
  const colW = (W - 2 * margin - 10) / 2;

  // CLIENT
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('CLIENT', margin, y);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(invoice.customer_name || 'N/A', margin, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(invoice.customer_email || '', margin, y + 16);

  // PROFESSIONNEL
  const col2X = margin + colW + 10;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('PROFESSIONNEL', col2X, y);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(invoice.professional_name || 'N/A', col2X, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(invoice.category_name || '', col2X, y + 16);

  // Ligne séparatrice
  y += 28;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);

  // ── Tableau des prestations
  y += 12;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('DÉTAIL DE LA PRESTATION', margin, y);

  // En-tête du tableau
  y += 6;
  doc.setFillColor(10, 10, 10);
  doc.roundedRect(margin, y, W - 2 * margin, 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', margin + 5, y + 6.8);
  doc.text('Montant HTVA', W - margin - 5, y + 6.8, { align: 'right' });

  // Ligne service
  y += 10;
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, W - 2 * margin, 10, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Service : ${invoice.category_name || 'Prestation'}`, margin + 5, y + 6.8);
  const htva = ((invoice.base_price || 0) + (invoice.commission || 0));
  doc.text(`${htva.toFixed(2)} €`, W - margin - 5, y + 6.8, { align: 'right' });

  // Ligne TVA
  y += 10;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, W - 2 * margin, 10, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('TVA (21%)', margin + 5, y + 6.8);
  const tva = htva * 0.21;
  doc.text(`${tva.toFixed(2)} €`, W - margin - 5, y + 6.8, { align: 'right' });

  // Ligne Total
  y += 14;
  doc.setFillColor(10, 10, 10);
  doc.roundedRect(margin, y, W - 2 * margin, 13, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC', margin + 5, y + 8.8);
  doc.text(`${(invoice.total_price || 0).toFixed(2)} €`, W - margin - 5, y + 8.8, { align: 'right' });

  // ── Paiement + statut
  y += 24;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);

  y += 10;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('MODE DE PAIEMENT', margin, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(10, 10, 10);
  doc.text(paymentLabels[invoice.payment_method] || 'N/A', margin, y + 9);

  // Badge statut
  const statusLabel = invoice.payment_status === 'paid' ? 'PAYÉE' : 'EN ATTENTE';
  const isPaid = invoice.payment_status === 'paid';
  doc.setFillColor(isPaid ? 22 : 245, isPaid ? 163 : 158, isPaid ? 74 : 11);
  doc.roundedRect(W - margin - 32, y + 2, 30, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, W - margin - 17, y + 8, { align: 'center' });

  // ── Footer
  doc.setFillColor(10, 10, 10);
  doc.rect(0, H - 20, W, 20, 'F');
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ServiGo — Plateforme de services à domicile', W / 2, H - 10, { align: 'center' });
  doc.text('Document généré automatiquement', W / 2, H - 5, { align: 'center' });

  doc.save(`${invoice.invoice_number || 'facture'}.pdf`);
}