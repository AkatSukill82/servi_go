import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const REASONS = [
  { value: 'comportement_agressif', label: 'Comportement agressif' },
  { value: 'arnaque', label: 'Arnaque ou fraude' },
  { value: 'no_show', label: 'Absence sans prévenir' },
  { value: 'travail_non_conforme', label: 'Travail non conforme' },
  { value: 'fausse_identite', label: 'Fausse identité' },
  { value: 'harcelement', label: 'Harcèlement' },
  { value: 'danger_securite', label: 'Danger pour la sécurité' },
  { value: 'autre', label: 'Autre' },
];

export default function ReportButton({ user, reportedEmail, reportedName, reportedType, requestId }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await base44.entities.Report.create({
      reported_by_email: user.email,
      reported_by_type: user.user_type || 'particulier',
      reported_user_email: reportedEmail,
      reported_user_name: reportedName,
      reported_user_type: reportedType,
      request_id: requestId,
      reason,
      description,
      status: 'pending',
      priority: 'medium',
    });
    setSubmitting(false);
    setOpen(false);
    setReason('');
    setDescription('');
    toast.success('Signalement envoyé. Notre équipe va examiner votre demande.');
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs px-2 h-8 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Signaler
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Signaler {reportedName}</AlertDialogTitle>
          <AlertDialogDescription>Décrivez le problème. Notre équipe examinera votre signalement sous 24h.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder="Motif du signalement *" />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails supplémentaires (optionnel)..." className="rounded-xl resize-none" rows={3} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={!reason || submitting} className="bg-destructive hover:bg-destructive/90">
            {submitting ? 'Envoi...' : 'Envoyer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}