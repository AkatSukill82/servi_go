import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CreateInvoiceModal({ user, onClose }) {
  const queryClient = useQueryClient();

  const { data: completedRequests = [] } = useQuery({
    queryKey: ['proCompletedForInvoice', user?.email],
    queryFn: async () => {
      const requests = await base44.entities.ServiceRequestV2.filter(
        { professional_email: user.email, status: 'completed' },
        '-created_date',
        50
      );
      // Filter out ones that already have an invoice
      const invoices = await base44.entities.Invoice.filter({ professional_email: user.email }, '-created_date', 100);
      const invoicedRequestIds = new Set(invoices.map(i => i.request_id));
      return requests.filter(r => !invoicedRequestIds.has(r.id));
    },
    enabled: !!user?.email,
  });

  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentTerms, setPaymentTerms] = useState('Paiement à réception');

  const selectedRequest = completedRequests.find(r => r.id === selectedRequestId);

  const totalHT = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalTTC = totalHT; // No VAT for simplicity (small business)

  const updateItem = (index, field, value) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (index) => setLineItems(prev => prev.filter((_, i) => i !== index));

  const createMutation = useMutation({
    mutationFn: async () => {
      const req = selectedRequest;
      if (!req) throw new Error('Sélectionnez une mission');
      if (lineItems.some(i => !i.description)) throw new Error('Remplissez toutes les descriptions');

      const invoiceNumber = `FAC-${Date.now().toString().slice(-8)}`;
      const items = lineItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        vat_rate: 0,
        line_total: Number(item.quantity) * Number(item.unit_price),
      }));

      const invoice = await base44.entities.Invoice.create({
        request_id: req.id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        service_date: req.scheduled_date || new Date().toISOString().split('T')[0],
        payment_terms: paymentTerms,
        category_name: req.category_name,
        professional_name: user.full_name,
        professional_email: user.email,
        professional_bce: user.bce_number || '',
        customer_name: req.customer_name || `${req.customer_first_name || ''} ${req.customer_last_name || ''}`.trim(),
        customer_email: req.customer_email,
        customer_address: req.customer_address || '',
        currency: 'EUR',
        line_items: items,
        subtotal_ht: totalHT,
        total_vat: 0,
        total_ttc: totalTTC,
        base_price: totalHT,
        total_price: totalTTC,
        payment_method: paymentMethod,
        payment_status: 'unpaid',
      });

      // Send notification to customer
      await base44.entities.Notification.create({
        recipient_email: req.customer_email,
        recipient_type: 'particulier',
        type: 'payment_received',
        title: `Nouvelle facture de ${user.full_name || 'votre prestataire'}`,
        body: `Montant : ${totalTTC.toFixed(2)} € — ${req.category_name}. Consultez votre espace Reçus pour la visualiser.`,
        request_id: req.id,
        action_url: '/Profile',
      });

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['customerInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['proCompletedForInvoice'] });
      toast.success('Facture créée et notifiée au client !');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div
        className="bg-card flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <p className="font-semibold text-sm">Créer une facture</p>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mission selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mission concernée</Label>
          {completedRequests.length === 0 ? (
            <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
              Aucune mission terminée sans facture pour l'instant
            </div>
          ) : (
            <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Choisissez une mission" />
              </SelectTrigger>
              <SelectContent>
                {completedRequests.map(req => (
                  <SelectItem key={req.id} value={req.id}>
                    {req.category_name} — {req.customer_name || req.customer_first_name || 'Client'} ({req.scheduled_date || 'Date inconnue'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedRequest && (
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-0.5">
            <p><span className="font-medium text-foreground">Client :</span> {selectedRequest.customer_name || `${selectedRequest.customer_first_name || ''} ${selectedRequest.customer_last_name || ''}`.trim()}</p>
            <p><span className="font-medium text-foreground">Email :</span> {selectedRequest.customer_email}</p>
            {selectedRequest.customer_address && <p><span className="font-medium text-foreground">Adresse :</span> {selectedRequest.customer_address}</p>}
          </div>
        )}

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Prestations facturées</Label>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-primary">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>

          {lineItems.map((item, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Ligne {index + 1}</p>
                {lineItems.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Description (ex: Débouchage évier)"
                value={item.description}
                onChange={e => updateItem(index, 'description', e.target.value)}
                className="h-10 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Prix unitaire (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(index, 'unit_price', e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <p className="text-xs font-semibold text-foreground">
                  Sous-total : {(item.quantity * item.unit_price).toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mode de paiement</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="stripe">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Conditions de paiement</Label>
            <Input
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              className="h-11 rounded-xl text-sm"
              placeholder="Ex: 30 jours"
            />
          </div>
        </div>

        {/* Total */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <p className="font-semibold text-sm">Total à payer</p>
          <p className="font-bold text-xl text-primary">{totalTTC.toFixed(2)} €</p>
        </div>

        {/* Submit */}
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!selectedRequestId || createMutation.isPending || completedRequests.length === 0}
          className="w-full h-12 rounded-xl font-semibold text-sm"
        >
          <Send className="w-4 h-4 mr-2" />
          {createMutation.isPending ? 'Envoi en cours...' : 'Créer & envoyer la facture au client'}
        </Button>
      </div>
    </div>
  );
}