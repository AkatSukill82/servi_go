import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, ShieldX, Eye, Clock, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'verified', label: 'Vérifiés' },
  { value: 'rejected', label: 'Refusés' },
];

const DOCS = [
  { key: 'id_card_url', label: "Carte d'identité" },
  { key: 'insurance_url', label: "Assurance RC" },
  { key: 'onss_url', label: "ONSS / Indépendant" },
];

function DocLink({ url, label }) {
  if (!url) return <span className="text-xs text-muted-foreground italic">Non fourni</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
    >
      <FileText className="w-3 h-3" /> {label}
    </a>
  );
}

function ProCard({ pro, onApprove, onReject, isPending }) {
  const [expanded, setExpanded] = useState(false);

  const statusBadge = {
    pending: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">⏳ En attente</Badge>,
    verified: <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">✓ Vérifié</Badge>,
    rejected: <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">✗ Refusé</Badge>,
  }[pro.verification_status] || <Badge variant="secondary" className="text-xs">Sans statut</Badge>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
    >
      <div className="p-4 flex items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden font-bold text-primary text-lg">
            {pro.photo_url
              ? <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
              : <User className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{pro.full_name}</p>
            <p className="text-xs text-muted-foreground">{pro.email}</p>
            <p className="text-xs text-muted-foreground">{pro.category_name || '—'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {statusBadge}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-primary underline underline-offset-2"
          >
            {expanded ? 'Réduire' : 'Voir documents'}
          </button>
        </div>
      </div>

      {/* Documents */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          <div className="grid grid-cols-1 gap-2">
            {DOCS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <DocLink url={pro[key]} label="Ouvrir" />
              </div>
            ))}
          </div>

          {/* Actions */}
          {pro.verification_status !== 'verified' && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => onApprove(pro.id)}
                disabled={isPending}
                className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approuver
              </Button>
              {pro.verification_status !== 'rejected' && (
                <Button
                  onClick={() => onReject(pro.id)}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-sm"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Refuser
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function AdminVerification() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['allPros'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel' }, '-created_date', 100),
    enabled: currentUser?.role === 'admin',
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, pro }) => {
      await base44.entities.User.update(id, { verification_status: status });

      const isVerified = status === 'verified';
      const subject = isVerified
        ? '✅ Votre compte ServiGo est vérifié !'
        : '❌ Votre dossier ServiGo a été refusé';
      const body = isVerified
        ? `Bonjour ${pro.full_name},\n\nFélicitations ! Votre dossier a été examiné et votre compte est maintenant vérifié.\n\nVous bénéficiez désormais du badge "Pro Vérifié ✓" visible par tous les clients, ce qui augmente votre crédibilité et vos chances d'obtenir des missions.\n\nConnectez-vous à ServiGo pour commencer à recevoir des demandes.\n\nL'équipe ServiGo`
        : `Bonjour ${pro.full_name},\n\nNous avons examiné votre dossier mais malheureusement nous ne pouvons pas valider votre compte pour le moment.\n\nCela peut être dû à des documents illisibles, expirés ou incomplets. Veuillez vous connecter à ServiGo et soumettre à nouveau vos documents dans la section "Mon profil".\n\nEn cas de questions, contactez notre support.\n\nL'équipe ServiGo`;

      await base44.integrations.Core.SendEmail({
        to: pro.email,
        subject,
        body,
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['allPros'] });
      toast.success(status === 'verified' ? 'Pro approuvé et notifié par email !' : 'Pro refusé et notifié par email.');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-semibold">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  const filtered = filter === 'all'
    ? pros
    : filter === 'pending'
    ? pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status))
    : pros.filter(p => p.verification_status === filter);

  const pendingCount = pros.filter(p => p.verification_status === 'pending' || (p.id_card_url && !p.verification_status)).length;

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Vérifications Pro</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-bold bg-accent text-accent-foreground rounded-full px-2 py-0.5">{pendingCount}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Approuvez ou refusez les dossiers des professionnels</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:border-primary/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun professionnel dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pro => (
            <ProCard
              key={pro.id}
              pro={pro}
              onApprove={id => updateMutation.mutate({ id, status: 'verified', pro })}
              onReject={id => updateMutation.mutate({ id, status: 'rejected', pro })}
              isPending={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}