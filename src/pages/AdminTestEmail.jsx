import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, CheckCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTestEmail() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ to: '', subject: 'Test ServiGo — Email de vérification', message: 'Ceci est un email de test envoyé depuis le panneau d\'administration ServiGo. Si vous recevez cet email, la configuration est correcte.' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-center px-6">
        <div>
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

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
        <div style="background:#F0F4FF;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #1A365D;font-size:13px;color:#718096;">
          Cet email a été envoyé depuis le panneau d'administration ServiGo par <strong>${user?.email || 'admin'}</strong>.
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
      toast.error('Erreur lors de l\'envoi : ' + (err?.message || 'Inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <div className="px-4 pt-6 pb-20 w-full max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/AdminDashboard')} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Test Email</h1>
            <p className="text-sm text-muted-foreground">Envoyer un email de test via ServiGo</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Envoi transactionnel</p>
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
              inputMode="email"
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
              placeholder="Contenu du message..."
              rows={5}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Preview note */}
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
            L'email sera envoyé avec le <strong>header bleu ServiGo</strong>, votre message en corps, et un footer avec lien de désinscription.
          </div>

          <Button
            onClick={handleSend}
            disabled={loading || !form.to || !form.subject || !form.message}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours...</>
            ) : sent ? (
              <><CheckCircle className="w-4 h-4 mr-2 text-green-300" /> Email envoyé !</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Envoyer le test</>
            )}
          </Button>
        </div>

        {/* Success message */}
        {sent && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Email envoyé avec succès !</p>
              <p className="text-xs text-green-700 mt-0.5">Vérifiez la boîte de réception de <strong>{form.to}</strong>. Pensez à vérifier les spams si vous ne le recevez pas.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}