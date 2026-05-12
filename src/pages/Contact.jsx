import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Instagram } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'hello@servigo.be',
        subject: `Contact ServiGo — ${form.name}`,
        body: `Nom : ${form.name}\nEmail : ${form.email}\n\n${form.message}`,
      });
      toast.success('Message envoyé ! Nous vous répondrons sous 48h.');
      setForm({ name: '', email: '', message: '' });
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez ou écrivez-nous directement par email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Contactez-nous</h1>
        <p className="text-muted-foreground text-sm mb-8">Une question, un problème ou une suggestion ? Nous sommes là.</p>

        {/* Contact methods */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          <a href="mailto:hello@servigo.be"
            className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Email</p>
              <p className="text-sm text-muted-foreground">hello@servigo.be</p>
            </div>
          </a>
          <a href="https://instagram.com/servigo.be" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Instagram className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Instagram</p>
              <p className="text-sm text-muted-foreground">@servigo.be</p>
            </div>
          </a>
        </div>

        {/* Contact form */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Formulaire de contact
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Votre nom"
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="votre@email.com"
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Message</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Décrivez votre demande..."
                rows={4}
                className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 transition-opacity"
            >
              {sending ? 'Envoi en cours…' : 'Envoyer le message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}