import React, { useState } from 'react';
import { X, Send, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SupportModal({ user, onClose }) {
  const [form, setForm] = useState({
    first_name: user?.full_name?.split(' ')[0] || '',
    last_name: user?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.first_name || !form.email || !form.message) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: 'support@servigo.be',
      subject: `[Support] Message de ${form.first_name} ${form.last_name}`,
      body: `Nom : ${form.first_name} ${form.last_name}\nEmail : ${form.email}\n\n${form.message}`,
    });
    toast.success('Message envoyé ! Nous vous répondrons rapidement.');
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-background w-full max-w-md rounded-t-3xl p-5 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" /> Contacter le support
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">Décrivez votre problème, nous vous répondrons par email.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prénom *</Label>
            <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jean" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Dupont" className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email *</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="votre@email.com" className="h-11 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Votre message *</Label>
          <Textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Décrivez votre problème en détail..."
            className="rounded-xl resize-none"
            rows={4}
          />
        </div>

        <Button onClick={handleSend} disabled={sending} className="w-full h-12 rounded-xl text-sm font-semibold">
          <Send className="w-4 h-4 mr-2" />
          {sending ? 'Envoi en cours...' : 'Envoyer'}
        </Button>
      </div>
    </div>
  );
}