import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Camera, Save, LogOut, User, Trash2, Receipt, Shield, ShieldCheck, MapPin, Pencil, Check, Copy, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import CustomerReceipts from '@/components/profile/CustomerReceipts';
import { useTheme } from '@/lib/ThemeContext';

const TABS = [
  { key: 'infos', label: 'Mes informations', icon: User },
  { key: 'recus', label: 'Mes reçus', icon: Receipt },
  { key: 'securite', label: 'Sécurité', icon: Shield },
];

const STATUS_BADGE = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Inscrit', color: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Récompensé', color: 'bg-yellow-100 text-yellow-700' },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-600' },
};

function ReferralSection({ user }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [codeCreating, setCodeCreating] = useState(false);

  const { data: referrals = [], isSuccess } = useQuery({
    queryKey: ['referrals', user?.email],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user.email }),
    enabled: !!user?.email,
  });

  const myCode = referrals.find(r => !r.referred_email)?.referral_code || referrals[0]?.referral_code;

  useEffect(() => {
    if (!isSuccess || myCode || codeCreating || !user?.email) return;
    setCodeCreating(true);
    const code = `${(user.first_name || 'USER').toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    base44.entities.Referral.create({
      referrer_email: user.email,
      referrer_name: user.full_name || user.email,
      referral_code: code,
      status: 'pending',
    }).then(() => queryClient.invalidateQueries({ queryKey: ['referrals', user.email] }));
  }, [isSuccess, myCode, user?.email]);

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copié !');
  };

  const referred = referrals.filter(r => r.referred_email);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-1">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Mes parrainages</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary font-medium">
            🎁 Parrainez un ami et gagnez une réduction de 10% sur votre prochaine mission
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Votre code de parrainage</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono font-bold text-base text-center tracking-widest border border-border">
                {myCode || '...'}
              </div>
              <button onClick={handleCopy} className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {referred.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Amis invités ({referred.length})</p>
              <div className="space-y-2">
                {referred.map(r => {
                  const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{r.referred_name || r.referred_email}</p>
                        {r.referred_email && <p className="text-xs text-muted-foreground">{r.referred_email}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun ami parrainé pour l'instant. Partagez votre code !</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getDisplayName(user) {
  if (user?.first_name || user?.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const rawHandle = (user?.full_name || '').includes('@') ? user.full_name.split('@')[0] : (user?.full_name || '');
  const smart = rawHandle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
  if (smart.length >= 2) return smart.charAt(0).toUpperCase() + smart.slice(1).toLowerCase();
  if (user?.email) return user.email.split('@')[0].replace(/[^a-zA-Z]/g, '') || 'Utilisateur';
  return 'Utilisateur';
}

function getInitials(user) {
  const name = getDisplayName(user);
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dark, setDark } = useTheme();
  const [tab, setTab] = useState('infos');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', address: '', photo_url: '' });

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Sync depuis la BDD une seule fois au chargement
  useEffect(() => {
    if (user?.dark_mode !== undefined) {
      setDark(user.dark_mode === true);
    }
  }, [user?.dark_mode]);

  useEffect(() => {
    if (user) {
      const rawHandle = (user.full_name || '').includes('@') ? user.full_name.split('@')[0] : user.full_name || '';
      const smartFirst = rawHandle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
      const defaultFirst = smartFirst.length >= 2 ? smartFirst.charAt(0).toUpperCase() + smartFirst.slice(1).toLowerCase() : '';
      setForm({
        first_name: user.first_name || defaultFirst,
        last_name: user.last_name || '',
        phone: user.phone || '',
        address: user.address || '',
        photo_url: user.photo_url || '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      return base44.auth.updateMe({ ...data, ...(fullName ? { full_name: fullName } : {}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profil mis à jour ✓');
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error('Erreur lors de la sauvegarde : ' + (err?.message || 'réessayez'));
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    await base44.auth.updateMe({ photo_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    toast.success('Photo mise à jour !');
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const data = await res.json();
        if (data.display_name) {
          setForm(f => ({ ...f, address: data.display_name }));
          toast.success('Adresse récupérée !');
        }
      } catch {}
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const eidVerified = user?.eid_status === 'verified';

  return (
    <div className="min-h-full bg-background">
      {/* Hero Card */}
      <div className="bg-card border-b border-border/50 shadow-sm px-5 pt-8 pb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 border-4 border-white shadow-md">
              <AvatarImage src={form.photo_url || user?.photo_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{displayName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Client
              </span>
              {eidVerified ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> eID vérifié
                </span>
              ) : (
                <button
                  onClick={() => navigate('/EidVerification')}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200"
                >
                  ⚠ Vérifier l'identité
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Checklist onboarding rapide */}
        {(!user?.photo_url || !user?.address || !eidVerified) && (
          <div className="mt-4 bg-primary/5 rounded-xl border border-primary/15 p-3 space-y-2">
            <p className="text-xs font-semibold text-primary">Complétez votre profil :</p>
            {!user?.photo_url && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <div className="w-4 h-4 rounded border-2 border-border flex items-center justify-center shrink-0" />
                Ajoutez votre photo de profil
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
            {!user?.address && (
              <button onClick={() => { setTab('infos'); setIsEditing(true); }} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full text-left">
                <div className="w-4 h-4 rounded border-2 border-border flex items-center justify-center shrink-0" />
                Complétez votre adresse
              </button>
            )}
            {!eidVerified && (
              <button onClick={() => navigate('/EidVerification')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full text-left">
                <div className="w-4 h-4 rounded border-2 border-border flex items-center justify-center shrink-0" />
                Vérifiez votre identité (eID)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-colors min-h-[44px] ${
              tab === key ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="truncate text-[10px]">{label.split(' ').slice(-1)[0]}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-4 mt-1">
        {/* ─── ONGLET INFOS ─── */}
        {tab === 'infos' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Informations personnelles</h3>
                <button
                  onClick={() => setIsEditing(e => !e)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}
                >
                  {isEditing ? 'Annuler' : <><Pencil className="w-3 h-3" />Modifier</>}
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Prénom</Label>
                    <Input
                      value={form.first_name}
                      onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Jean"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nom</Label>
                    <Input
                      value={form.last_name}
                      onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Dupont"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email (non modifiable)</Label>
                  <Input value={user?.email || ''} disabled className="h-11 rounded-xl bg-muted/50 text-muted-foreground" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Téléphone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="+32 470 12 34 56"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adresse complète</Label>
                  <div className="relative">
                    <Input
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Rue de la Loi 16, 1000 Bruxelles"
                      className="h-11 rounded-xl pr-10"
                    />
                    {isEditing && (
                      <button onClick={handleGeolocate} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80">
                        <MapPin className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <Button
                    onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                    className="w-full h-11 rounded-xl font-semibold bg-[#1D9E75] hover:bg-[#1D9E75]/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                )}
              </div>
            </div>

            {/* eID Card */}
            <button
              onClick={() => navigate('/EidVerification')}
              className={`w-full bg-card rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left transition-colors ${
                eidVerified ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${eidVerified ? 'bg-green-50' : 'bg-red-50'}`}>
                <ShieldCheck className={`w-5 h-5 ${eidVerified ? 'text-green-600' : 'text-red-500'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {eidVerified ? '✓ Identité vérifiée' : 'Vérifier mon identité'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {eidVerified ? 'Votre compte est validé ServiGo' : 'Carte eID requise pour les demandes'}
                </p>
              </div>
              {!eidVerified && <span className="text-primary text-sm font-bold">→</span>}
            </button>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{dark ? '🌙' : '☀️'}</span>
                  <div>
                    <p className="text-sm font-medium">Mode nuit</p>
                    <p className="text-xs text-muted-foreground">Thème sombre pour les yeux</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !dark;
                    setDark(next);
                    base44.auth.updateMe({ dark_mode: next }).catch(() => {});
                  }}
                  className={`relative w-12 h-4 rounded-full transition-colors duration-200 border ${dark ? 'bg-[#4F46E5] border-[#4F46E5]' : 'bg-muted border-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${dark ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await base44.auth.logout();
                  window.location.href = '/login';
                }}
                className="w-full h-12 rounded-xl text-sm text-muted-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" /> Déconnexion
              </Button>

              <div className="flex items-center justify-center gap-3 py-2 text-xs text-muted-foreground">
                <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
                <span>·</span>
                <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
                <span>·</span>
                <span>© 2026 ServiGo</span>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'infos' && user && <ReferralSection user={user} />}

        {/* ─── ONGLET REÇUS ─── */}
        {tab === 'recus' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <CustomerReceipts user={user} />
          </motion.div>
        )}

        {/* ─── ONGLET SÉCURITÉ ─── */}
        {tab === 'securite' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
              <h3 className="font-semibold mb-4 text-sm">Sécurité du compte</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Email de connexion</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Vérification eID</p>
                    <p className="text-xs text-muted-foreground">{eidVerified ? 'Vérifié' : 'Non vérifié'}</p>
                  </div>
                  <ShieldCheck className={`w-4 h-4 ${eidVerified ? 'text-green-500' : 'text-red-400'}`} />
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-12 rounded-xl text-sm border-red-200 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={async () => {
                      await base44.auth.updateMe({ account_deleted: true, user_type: null });
                      toast.success('Compte supprimé.');
                      logout();
                    }}
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </div>
    </div>
  );
}