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
import { Camera, Save, LogOut, User, Trash2, Receipt, FileText, Shield, ShieldCheck, MapPin, Pencil, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CustomerReceipts from '@/components/profile/CustomerReceipts';
import { useDarkMode } from '@/hooks/useDarkMode';

const TABS = [
  { key: 'infos', label: 'Mes informations', icon: User },
  { key: 'recus', label: 'Mes reçus', icon: Receipt },
  { key: 'securite', label: 'Sécurité', icon: Shield },
];

function getDisplayName(user) {
  if (user?.first_name || user?.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (user?.full_name) return user.full_name;
  if (user?.email) return user.email.split('@')[0];
  return 'Utilisateur';
}

function getInitials(user) {
  const name = getDisplayName(user);
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [tab, setTab] = useState('infos');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', address: '', photo_url: '' });

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || (user.full_name?.split(' ')[0] || ''),
        last_name: user.last_name || (user.full_name?.split(' ').slice(1).join(' ') || ''),
        phone: user.phone || '',
        address: user.address || '',
        photo_url: user.photo_url || '',
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profil mis à jour !');
      setIsEditing(false);
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
    <div className="min-h-full bg-[#F8F8F6]">
      {/* Hero Card */}
      <div className="bg-white border-b border-border/50 shadow-sm px-5 pt-8 pb-6">
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
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
              tab === key ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-muted-foreground border-border hover:bg-gray-50'
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
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
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
              className={`w-full bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left transition-colors ${
                eidVerified ? 'border-green-200' : 'border-red-200'
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
              <div className="flex items-center justify-between bg-white rounded-2xl border border-border/50 shadow-sm px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Mode nuit</p>
                  <p className="text-xs text-muted-foreground">{dark ? 'Thème sombre activé' : 'Thème clair activé'}</p>
                </div>
                <button
                  onClick={() => setDark(d => !d)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${dark ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => base44.auth.logout()}
                className="w-full h-12 rounded-xl text-sm text-muted-foreground"
              >
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
              </Button>
            </div>
          </motion.div>
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
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-5">
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
                      base44.auth.logout('/Landing');
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