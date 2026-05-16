import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

const AUTOMATIONS = [
  { icon: '✅', text: 'Nouvelle demande client → Email de confirmation' },
  { icon: '🎉', text: 'Mission acceptée → Email au client' },
  { icon: '📝', text: 'Contrat créé → Invitation à signer' },
  { icon: '🚀', text: 'Abonnement Pro actif → Email de bienvenue' },
];

export default function AdminEmailTab({ adminEmail }) {
  const [form, setForm] = useState({
    to: adminEmail || '',
    subject: 'Test ServiGo — Email de vérification',
    message: "Ceci est un email de test envoyé depuis le panneau d'administration ServiGo. Si vous recevez cet email, la configuration est correcte.",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.message) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setSent(false);
    try {
      const bodyHtml = `
        <p>Bonjour,</p>
        <p>${form.message.replace(/\n/g, '<br/>')}</p>
        <div style="background:#F0F4FF;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #6C5CE7;font-size:13px;color:#718096;">
          Email envoyé depuis le panneau d'administration ServiGo par <strong>${adminEmail || 'admin'}</strong>.
        </div>
        <p>Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `;
      await base44.functions.invoke('sendEmail', {
        to: form.to.trim(),
        subject: form.subject.trim(),
        title: form.subject.trim(),
        bodyHtml,
      });
      setSent(true);
      toast.success(`Email envoyé à ${form.to} !`);
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'Inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Test d'envoi transactionnel</p>
            <p className="text-xs text-muted-foreground">Via Base44 SendEmail · Expéditeur : ServiGo</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Email destinataire *</Label>
          <Input
            type="email"
            value={form.to}
            onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
            placeholder="exemple@email.com"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Sujet *</Label>
          <Input
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Sujet de l'email"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Message *</Label>
          <Textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={4}
            className="rounded-xl resize-none"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={loading || !form.to || !form.subject || !form.message}
          className="w-full h-12 rounded-xl font-semibold"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours...</>
          ) : sent ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Email envoyé !</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Envoyer le test</>
          )}
        </Button>

        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">Email envoyé avec succès à <strong>{form.to}</strong>. Vérifiez aussi les spams.</p>
          </div>
        )}
      </div>

      {/* Automations */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold">Automations email actives</p>
        <div className="space-y-2">
          {AUTOMATIONS.map(({ icon, text }, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5">
              <span className="text-base">{icon}</span>
              <p className="text-xs text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}