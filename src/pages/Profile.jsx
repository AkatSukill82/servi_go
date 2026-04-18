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
import { Camera, Save, LogOut, User, Trash2, Receipt, Shield, ShieldCheck, MapPin, Pencil, Check, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import CustomerReceipts from '@/components/profile/CustomerReceipts';
import ReferralSection from '@/components/profile/ReferralSection';
import { useTheme } from '@/lib/ThemeContext';

const TABS = [
  { key: 'infos', label: 'Mes informations', icon: User },
  { key: 'recus', label: 'Mes reçus', icon: Receipt },
  { key: 'securite', label: 'Sécurité', icon: Shield },
];

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
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);

  const handleAdminAccess = () => {
    if (adminPassword === 'servigo2026') {
      setShowAdminModal(false);
      setAdminPassword('');
      setAdminError(false);
      navigate('/AdminDashboard');
    } else {
      setAdminError(true);
    }
  };

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

          </motion.div>
        )}

        {tab === 'infos' && user && <ReferralSection user={user} />}

        {/* Mode nuit + Déconnexion + Footer — toujours en dernier */}
        {tab === 'infos' && (
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
                style={{
                  position: 'relative',
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  backgroundColor: dark ? '#4F46E5' : '#D1D5DB',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease',
                  minHeight: 'unset',
                  minWidth: 'unset',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  left: dark ? '22px' : '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'left 0.2s ease',
                }} />
              </button>
            </div>
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => setShowAdminModal(true)}
                className="w-full h-12 rounded-xl text-sm border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard Admin
              </Button>
            )}
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
            <div className="flex items-center justify-center gap-3 py-2 text-xs text-muted-foreground flex-wrap">
              <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
              <span>·</span>
              <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
              <span>·</span>
              <span>© 2026 ServiGo</span>
            </div>
          </div>
        )}

        {/* Admin password modal */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6" onClick={e => e.target === e.currentTarget && setShowAdminModal(false)}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="font-bold text-sm">Accès Admin</p>
                  <p className="text-xs text-muted-foreground">Entrez le mot de passe admin</p>
                </div>
              </div>
              <Input
                type="password"
                placeholder="Mot de passe"
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setAdminError(false); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminAccess()}
                className={`h-11 rounded-xl ${adminError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                autoFocus
              />
              {adminError && <p className="text-xs text-red-500 -mt-2">Mot de passe incorrect</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowAdminModal(false); setAdminPassword(''); setAdminError(false); }} className="flex-1 rounded-xl h-11">Annuler</Button>
                <Button onClick={handleAdminAccess} className="flex-1 rounded-xl h-11 bg-purple-600 hover:bg-purple-700">Accéder</Button>
              </div>
            </div>
          </div>
        )}

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