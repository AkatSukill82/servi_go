import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, ShieldCheck, MapPin, Euro, Clock, Briefcase, MessageCircle, Flag, CalendarDays, Camera, X, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BackButton from '@/components/ui/BackButton';
import { toast } from 'sonner';

function StarRating({ rating, size = 'md' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border fill-border'}`} />
      ))}
    </div>
  );
}

const REPORT_REASONS = [
  { value: 'comportement_agressif', label: 'Comportement agressif' },
  { value: 'arnaque', label: 'Arnaque' },
  { value: 'no_show', label: 'No-show' },
  { value: 'travail_non_conforme', label: 'Travail non conforme' },
  { value: 'fausse_identite', label: 'Fausse identité' },
  { value: 'harcelement', label: 'Harcèlement' },
  { value: 'danger_securite', label: 'Danger sécurité' },
  { value: 'autre', label: 'Autre' },
];

function ReportModal({ pro, user, onClose }) {
  const [reason, setReason] = useState('arnaque');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.Report.create({
      reported_by_email: user?.email || 'anonymous',
      reported_by_type: user?.user_type || 'particulier',
      reported_user_email: pro.email,
      reported_user_name: pro.full_name || pro.email,
      reported_user_type: 'professionnel',
      reason,
      description,
      priority: 'medium',
    });
    toast.success('Signalement envoyé. Notre équipe examinera votre demande.');
    onClose();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-background rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <h3 className="font-bold text-base">Signaler ce professionnel</h3>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Motif</p>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Détails (optionnel)</p>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} placeholder="Décrivez ce qui s'est passé..."
            className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90">
            {saving ? 'Envoi...' : 'Signaler'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProPublicProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const proId = urlParams.get('proId') || urlParams.get('userId');
  const proEmail = urlParams.get('proEmail');
  const [showReport, setShowReport] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: pro, isLoading: proLoading } = useQuery({
    queryKey: ['proPublic', proId, proEmail],
    queryFn: async () => {
      if (proId) return base44.entities.User.filter({ id: proId }).then(r => r[0] || null);
      if (proEmail) return base44.entities.User.filter({ email: proEmail }).then(r => r[0] || null);
      return null;
    },
    enabled: !!(proId || proEmail),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['proReviews', pro?.email],
    queryFn: () => base44.entities.Review.filter({ professional_email: pro.email }, '-created_date', 10),
    enabled: !!pro?.email,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const displayName = pro
    ? (pro.first_name || pro.last_name
        ? `${pro.first_name || ''} ${pro.last_name || ''}`.trim()
        : pro.full_name || pro.email?.split('@')[0] || 'Professionnel')
    : '...';

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const { data: availability = [] } = useQuery({
    queryKey: ['proAvailabilityPublic', pro?.email],
    queryFn: () => base44.entities.ProAvailability.filter({ professional_email: pro.email }, 'day_of_week'),
    enabled: !!pro?.email,
  });

  const handleRequest = () => {
    const cat = categories.find(c => c.name === pro?.category_name);
    if (cat) navigate(`/ServiceRequest?categoryId=${cat.id}&priorityProId=${pro.id}`);
    else navigate('/ServiceRequest');
  };

  if (proLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!pro) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🔍</div>
      <p className="font-semibold text-foreground">Professionnel introuvable</p>
      <p className="text-sm text-muted-foreground">Ce profil n'existe pas ou a été supprimé.</p>
      <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Retour</button>
    </div>
  );

  const isVerified = pro.verification_status === 'verified';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white px-5 pt-14 pb-8 relative">
        <div className="absolute top-4 left-4">
          <BackButton fallback="/Home" />
        </div>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shrink-0 bg-primary-foreground/20 flex items-center justify-center">
            {pro.photo_url
              ? <img src={pro.photo_url} alt={displayName} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-white">{initials}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{displayName}</h1>
              {isVerified && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Vérifié
                </span>
              )}
            </div>
            <p className="text-sm text-white/80 mt-0.5">{pro.category_name || 'Artisan ServiGo'}</p>
            {avgRating && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StarRating rating={Number(avgRating)} />
                <span className="text-sm font-bold">{avgRating}</span>
                <span className="text-xs text-white/70">({reviews.length} avis)</span>
                {Number(avgRating) >= 4.5 && (
                  <span className="flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ Top Pro
                  </span>
                )}
              </div>
            )}
            {pro.address && (
              <p className="flex items-center gap-1 text-xs text-white/70 mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {pro.address.split(',').slice(0, 2).join(',')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 mt-4">
        {/* Trust signals */}
        <div className="flex gap-2 flex-wrap">
          {pro.created_date && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Depuis {format(new Date(pro.created_date), 'MMM yyyy', { locale: fr })}</span>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-xs text-muted-foreground">{reviews.length} avis client{reviews.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {isVerified && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">Identité vérifiée</span>
            </div>
          )}
          {pro.insurance_url && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
              <Shield className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Assuré RC Pro</span>
            </div>
          )}
        </div>

        {/* Tarifs */}
        {(pro.base_price || pro.hourly_rate) && (
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            {pro.base_price && (
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Prix de base</p>
                <p className="text-lg font-bold">{Number(pro.base_price).toFixed(2).replace('.', ',')} €</p>
              </div>
            )}
            {pro.base_price && pro.hourly_rate && <div className="w-px h-10 bg-border" />}
            {pro.hourly_rate && (
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground mb-1">Taux horaire</p>
                <p className="text-lg font-bold">{Number(pro.hourly_rate).toFixed(2).replace('.', ',')} €/h</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {pro.pro_description && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">À propos</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{pro.pro_description}</p>
          </div>
        )}

        {/* Portfolio */}
        {(pro.portfolio_photos || []).length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Réalisations</h3>
              <span className="text-xs text-muted-foreground ml-auto">{pro.portfolio_photos.length} photo{pro.portfolio_photos.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {pro.portfolio_photos.map((url, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
                  onClick={() => window.open(url, '_blank')}
                >
                  <img src={url} alt={`Réalisation ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avis */}
        {reviews.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <h3 className="font-semibold text-sm">Avis clients</h3>
              </div>
              <span className="text-xs text-muted-foreground">{reviews.length} avis</span>
            </div>
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">{review.customer_name || 'Client'}</p>
                      <p className="text-[10px] text-muted-foreground">{review.created_date ? format(new Date(review.created_date), 'd MMMM yyyy', { locale: fr }) : ''}</p>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.comment && <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews.length === 0 && (
          <div className="bg-muted/40 rounded-2xl border border-border p-5 text-center">
            <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Pas encore d'avis pour ce professionnel</p>
          </div>
        )}

        {/* Disponibilités */}
        {availability.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Disponibilités</h3>
            </div>
            <div className="space-y-2">
              {availability.map(day => (
                <div key={day.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <p className="text-sm font-medium">{day.day_label || day.day_of_week}</p>
                  {day.is_day_off
                    ? <span className="text-xs text-muted-foreground">Repos</span>
                    : <div className="flex flex-wrap gap-1 justify-end">
                        {(day.slots || []).map((s, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{s.start}–{s.end}</span>
                        ))}
                      </div>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signalement */}
        <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors mx-auto py-2">
          <Flag className="w-3.5 h-3.5" /> Signaler ce professionnel
        </button>
      </div>

      {showReport && <ReportModal pro={pro} user={user} onClose={() => setShowReport(false)} />}

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-5 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <Button onClick={handleRequest} className="w-full h-12 rounded-xl text-base font-semibold">
          Demander {displayName.split(' ')[0]} →
        </Button>
      </div>
    </div>
  );
}