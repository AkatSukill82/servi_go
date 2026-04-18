import React, { useState, useEffect } from 'react';
import { maskIban } from '@/utils/formatters';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Camera, Save, LogOut, Briefcase, Euro, MapPin, CalendarDays,
  FileText, Headphones, ShieldCheck, Star, CreditCard, Pencil,
  Trash2, Check, Shield, User, CheckCircle, Clock, Upload, AlertTriangle, LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AvailabilityEditor from '@/components/pro/AvailabilityEditor';
import { useTheme } from '@/lib/ThemeContext';
import DocumentsTab from '@/components/documents/DocumentsTab';

const TABS = [
  { key: 'infos', label: 'Infos', icon: User },
  { key: 'activite', label: 'Activité', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'securite', label: 'Sécurité', icon: Shield },
];

const DOCS_DEF = [
  { key: 'id_card_url', label: "Carte d'identité (eID)", icon: ShieldCheck },
  { key: 'insurance_url', label: "Assurance RC Pro", icon: Shield },
  { key: 'onss_url', label: "Attestation ONSS / Indépendant", icon: FileText },
];

function getDisplayName(user) {
  if (user?.first_name || user?.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const rawHandle = (user?.full_name || '').includes('@') ? user.full_name.split('@')[0] : (user?.full_name || '');
  const smart = rawHandle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
  if (smart.length >= 2) return smart.charAt(0).toUpperCase() + smart.slice(1).toLowerCase();
  if (user?.email) return user.email.split('@')[0].replace(/[^a-zA-Z]/g, '') || 'Professionnel';
  return 'Professionnel';
}

function getInitials(user) {
  const name = getDisplayName(user);
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function ProfileCompletion({ user }) {
  const checks = [
    !!user?.photo_url,
    !!(user?.first_name || user?.full_name),
    !!user?.phone,
    !!user?.category_name,
    !!user?.pro_description,
    !!user?.id_card_url,
    !!user?.insurance_url,
    user?.eid_status === 'verified',
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const color = pct < 50 ? 'bg-red-500' : pct < 80 ? 'bg-yellow-500' : 'bg-[#1D9E75]';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Complétion du profil</span>
        <span className={`text-xs font-bold ${pct < 50 ? 'text-red-500' : pct < 80 ? 'text-yellow-600' : 'text-[#1D9E75]'}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function ProProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dark, setDark } = useTheme();
  const [activeTab, setActiveTab] = useState('infos');
  const [isEditing, setIsEditing] = useState(false);
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
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', address: '', photo_url: '',
    category_name: '', base_price: '', hourly_rate: '',
    pro_description: '', available: true, availability_slots: [], bce_number: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscription } = useQuery({
    queryKey: ['proSubscription', user?.email],
    queryFn: () => base44.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  const { data: completedMissions = [] } = useQuery({
    queryKey: ['proCompletedMissions', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter({ professional_email: user?.email, status: 'completed' }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['proAllReviews', user?.email],
    queryFn: () => base44.entities.Review.filter({ professional_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const avgRating = allReviews.length > 0 ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1) : null;
  const totalEarnings = completedMissions.reduce((sum, m) => sum + (m.estimated_price || 0), 0);

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
        category_name: user.category_name || '',
        base_price: user.base_price || '',
        hourly_rate: user.hourly_rate || '',
        pro_description: user.pro_description || '',
        available: user.available !== false,
        availability_slots: user.availability_slots || [],
        bce_number: user.bce_number || '',
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

  const handleDocUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ [field]: file_url });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    toast.success('Document uploadé !');
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

  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const isVerified = user?.verification_status === 'verified';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  return (
    <div className="min-h-full bg-background">
      {/* Hero Card */}
      <div className="bg-card border-b border-border/50 shadow-sm px-5 pt-8 pb-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 border-4 border-white shadow-md">
              <AvatarImage src={form.photo_url || user?.photo_url} />
              <AvatarFallback className="bg-[#534AB7] text-white text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#534AB7] flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{displayName}</h1>
            <p className="text-xs text-muted-foreground truncate">{user?.category_name || 'Professionnel ServiGo'}</p>

            {user?.rating && (
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(user.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">({user.reviews_count || 0} avis)</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {isVerified ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ backgroundColor: '#FFF3EE', color: '#FF6B35', borderColor: '#FF6B35' }}>
                  <ServiGoIcon size={10} /> Pro Vérifié ServiGo ✓
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                  ⏳ Vérification en attente
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {isActive ? '✓ Abonnement actif' : '⚠ Abonnement inactif'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle disponibilité */}
        <div className="flex items-center justify-between mt-4 bg-muted rounded-xl px-4 py-2.5">
          <div>
            <p className="text-sm font-medium">Disponible pour des missions</p>
            <p className="text-xs text-muted-foreground">{form.available ? 'Vous recevez des nouvelles demandes' : 'Vous êtes hors ligne'}</p>
          </div>
          <button
            onClick={async () => {
              const val = !form.available;
              setForm(f => ({ ...f, available: val }));
              await base44.auth.updateMe({ available: val });
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            }}
            style={{
              position: 'relative',
              width: '48px',
              height: '28px',
              borderRadius: '14px',
              backgroundColor: form.available ? '#10B981' : '#D1D5DB',
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
              left: form.available ? '22px' : '2px',
              width: '24px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.2s ease',
            }} />
            {form.available && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#34D399',
                animation: 'pulse 2s infinite',
              }} />
            )}
          </button>
        </div>

        <div className="mt-3">
          <ProfileCompletion user={user} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-colors min-h-[44px] ${
              activeTab === key
                ? 'bg-[#534AB7] text-white border-[#534AB7] shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] truncate">{label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-3 mt-1">

        {/* ─── ONGLET INFOS ─── */}
        {activeTab === 'infos' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Coordonnées</h3>
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
                    <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} disabled={!isEditing} placeholder="Jean" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nom</Label>
                    <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} disabled={!isEditing} placeholder="Dupont" className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} disabled={!isEditing} placeholder="+32 470 12 34 56" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adresse</Label>
                  <div className="relative">
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} disabled={!isEditing} placeholder="Rue de la Loi 16, 1000 Bruxelles" className="h-11 rounded-xl pr-10" />
                    {isEditing && (
                      <button onClick={handleGeolocate} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary">
                        <MapPin className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Numéro BCE/KBO</Label>
                  <Input value={form.bce_number} onChange={e => setForm(f => ({ ...f, bce_number: e.target.value }))} disabled={!isEditing} placeholder="BE 0xxx.xxx.xxx" className="h-11 rounded-xl" />
                </div>
                {isEditing && (
                  <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="w-full h-11 rounded-xl bg-[#1D9E75] hover:bg-[#1D9E75]/90">
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                )}
              </div>
            </div>

            {/* Abonnement */}
            <button onClick={() => navigate('/ProSubscription')} className={`w-full bg-card rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left ${isActive ? 'border-green-200' : 'border-orange-200'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                <CreditCard className={`w-5 h-5 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">ServiGo Pro — 10€/mois</p>
                <p className="text-xs text-muted-foreground">{isActive ? `Actif · Renouvellement le ${subscription?.renewal_date || '—'}` : 'Abonnement requis pour recevoir des missions'}</p>
              </div>
              <span className="text-primary font-bold">→</span>
            </button>

            {/* eID */}
            <button onClick={() => navigate('/EidVerification')} className={`w-full bg-card rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left ${user?.eid_status === 'verified' ? 'border-green-200' : 'border-red-200'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.eid_status === 'verified' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <ShieldCheck className={`w-5 h-5 ${user?.eid_status === 'verified' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{user?.eid_status === 'verified' ? '✓ Identité vérifiée' : 'Vérifier mon identité (eID)'}</p>
                <p className="text-xs text-muted-foreground">{user?.eid_status === 'verified' ? 'Votre identité est validée' : 'Obligatoire pour les missions'}</p>
              </div>
              {user?.eid_status !== 'verified' && <span className="text-primary font-bold">→</span>}
            </button>

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
            <Button variant="outline" onClick={() => navigate('/Support')} className="w-full h-12 rounded-xl text-sm">
              <Headphones className="w-4 h-4 mr-2" /> Contacter le support
            </Button>
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={() => setShowAdminModal(true)}
                className="w-full h-12 rounded-xl text-sm border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard Admin
              </Button>
            )}
            <Button variant="outline" onClick={async () => { await base44.auth.logout(); window.location.href = '/login'; }} className="w-full h-12 rounded-xl text-sm text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </motion.div>
        )}
        {activeTab === 'infos' && (
          <div className="text-center pb-4 text-xs text-muted-foreground">
            <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
            {" · "}
            <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
            {" · "}
            <span>© 2026 ServiGo</span>
          </div>
        )}

        {/* ─── ONGLET ACTIVITÉ ─── */}
        {activeTab === 'activite' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Statistiques rapides */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-[#534AB7] dark:text-[#8B83D4]">{completedMissions.length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Missions complétées</p>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-[#1D9E75] dark:text-[#34D399]">{avgRating || '—'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Note moyenne</p>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalEarnings.toFixed(0)}€</p>
                <p className="text-[10px] text-muted-foreground mt-1">Revenus estimés</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#534AB7]" />Mon métier</h3>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Catégorie de service</Label>
                <Select value={form.category_name} onValueChange={val => setForm(f => ({ ...f, category_name: val }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisissez votre métier" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description de vos services</Label>
                <Textarea value={form.pro_description} onChange={e => setForm(f => ({ ...f, pro_description: e.target.value }))} placeholder="Décrivez vos compétences et services..." className="rounded-xl resize-none" rows={4} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Euro className="w-4 h-4 text-[#1D9E75] dark:text-[#34D399]" />Mes tarifs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prix de base (€)</Label>
                  <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="80" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tarif horaire (€/h)</Label>
                  <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="45" className="h-11 rounded-xl" />
                </div>
              </div>
            </div>

            <AvailabilityEditor userEmail={user?.email} />

            <Button
              onClick={() => updateMutation.mutate({ ...form, base_price: Number(form.base_price), hourly_rate: Number(form.hourly_rate) })}
              disabled={updateMutation.isPending}
              className="w-full h-12 rounded-xl bg-[#1D9E75] hover:bg-[#1D9E75]/90 font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
          </motion.div>
        )}

        {/* ─── ONGLET DOCUMENTS ─── */}
        {activeTab === 'documents' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Barre de complétion */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
              <ProfileCompletion user={user} />
            </div>

            {/* Documents requis */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Documents de vérification</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Requis pour recevoir le badge "Pro Vérifié ✓"</p>
              </div>
              <div className="divide-y divide-border/50">
                {DOCS_DEF.map(({ key, label, icon: Icon }) => {
                  const hasDoc = !!user?.[key];
                  const verif = user?.verification_status;
                  return (
                    <div key={key} className="flex items-center gap-3 px-5 py-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasDoc ? 'bg-green-50' : 'bg-red-50'}`}>
                        <Icon className={`w-5 h-5 ${hasDoc ? 'text-green-600' : 'text-red-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className={`text-xs mt-0.5 ${hasDoc ? 'text-green-600' : 'text-red-400'}`}>
                          {hasDoc
                            ? (verif === 'verified' ? '✓ Vérifié par ServiGo' : '⏳ En cours de vérification')
                            : '✗ Document manquant'}
                        </p>
                      </div>
                      {!hasDoc ? (
                        <label className="shrink-0 cursor-pointer">
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary text-white rounded-lg">
                            <Upload className="w-3 h-3" /> Uploader
                          </div>
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleDocUpload(e, key)} />
                        </label>
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Factures & contrats */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="px-5 py-4">
                <h3 className="font-semibold text-sm mb-3">Factures & contrats</h3>
                <DocumentsTab user={user} />
              </div>
            </div>
          </motion.div>
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

        {/* ─── ONGLET SÉCURITÉ ─── */}
        {activeTab === 'securite' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
              <h3 className="font-semibold mb-4 text-sm">Sécurité du compte</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Email de connexion</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Vérification ServiGo</p>
                    <p className="text-xs text-muted-foreground">{isVerified ? 'Pro Vérifié' : 'En attente de vérification'}</p>
                  </div>
                  <ShieldCheck className={`w-4 h-4 ${isVerified ? 'text-green-500' : 'text-yellow-400'}`} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Abonnement</p>
                    <p className="text-xs text-muted-foreground">{isActive ? 'Actif' : 'Inactif'}</p>
                  </div>
                  <CreditCard className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-red-400'}`} />
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
                    Cette action est irréversible. Toutes vos données et missions seront définitivement supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={async () => {
                      await base44.auth.updateMe({ account_deleted: true, user_type: null });
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