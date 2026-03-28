import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, LogOut, Briefcase, Euro, MapPin, CalendarDays, FileText, Headphones, Pencil, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SupportModal from '@/components/support/SupportModal';
import DocumentsTab from '@/components/documents/DocumentsTab';
import BackButton from '@/components/ui/BackButton';
import PhoneVerification from '@/components/profile/PhoneVerification';
import EmailVerification from '@/components/profile/EmailVerification';
import { toast } from 'sonner';
import AvailabilityEditor from '@/components/pro/AvailabilityEditor';
import VerificationSection from '@/components/pro/VerificationSection';

export default function ProProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profil');
  const [isEditing, setIsEditing] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const [form, setForm] = useState({
    phone: '', address: '', bank_iban: '', photo_url: '',
    category_name: '', base_price: '', hourly_rate: '',
    pro_description: '', available: true, availability_slots: [], bce_number: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
  });

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || '',
        address: user.address || '',
        bank_iban: user.bank_iban || '',
        photo_url: user.photo_url || '',
        category_name: user.category_name || '',
        base_price: user.base_price || '',
        hourly_rate: user.hourly_rate || '',
        pro_description: user.pro_description || '',
        available: user.available !== false,
        availability_slots: user.availability_slots || [],
        bce_number: user.bce_number || '',
        contact_email: user.contact_email || user.email || '',
      });
      setVerifiedEmail(user.contact_email || null);
      setVerifiedPhone(user.phone || null);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profil mis à jour !');
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'P';

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <BackButton fallback="/ProDashboard" />
        <h1 className="text-2xl font-bold">Mon profil pro</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[['profil', 'Profil'], ['documents', 'Documents']].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border shrink-0 transition-colors ${
              activeTab === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
            }`}>
            {k === 'documents' && <FileText className="w-3.5 h-3.5" />}
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'documents' && <DocumentsTab user={user} />}

      {activeTab !== 'documents' && (
        <>
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                <AvatarImage src={form.photo_url} />
                <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center cursor-pointer shadow-md">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="mt-3 font-semibold text-lg">{user?.full_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <div className="space-y-4">
            {/* Disponibilité */}
            <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium">Disponible</p>
                <p className="text-xs text-muted-foreground">Accepter de nouvelles missions</p>
              </div>
              <Switch checked={form.available} onCheckedChange={val => setForm(f => ({ ...f, available: val }))} />
            </div>

            {/* Métier */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" /> Mon métier
              </h3>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Catégorie de service</Label>
                <Select value={form.category_name} onValueChange={val => setForm(f => ({ ...f, category_name: val }))}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choisissez votre métier" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Description de vos services</Label>
                <Textarea
                  value={form.pro_description}
                  onChange={e => setForm(f => ({ ...f, pro_description: e.target.value }))}
                  placeholder="Décrivez vos compétences et services..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Tarifs */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Euro className="w-4 h-4 text-green-600" /> Mes tarifs
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix de base (€)</Label>
                  <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="Ex: 80" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tarif horaire (€/h)</Label>
                  <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="Ex: 45" className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Coordonnées
              </h3>
              <PhoneVerification
                value={form.phone}
                onChange={val => setForm(f => ({ ...f, phone: val }))}
                userEmail={user?.email}
                isEditing={isEditing}
                verified={!!verifiedPhone && verifiedPhone === form.phone}
                onVerified={setVerifiedPhone}
              />
              <EmailVerification
                currentEmail={user?.contact_email || ''}
                contactEmail={form.contact_email || ''}
                onChange={val => setForm(f => ({ ...f, contact_email: val }))}
                onVerified={setVerifiedEmail}
                verified={!!verifiedEmail && verifiedEmail === form.contact_email}
                isEditing={isEditing}
              />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Adresse</Label>
                <Input value={form.address} disabled={!isEditing} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Ex: Rue de la Loi 16, 1000 Bruxelles" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">IBAN</Label>
                <Input value={form.bank_iban} disabled={!isEditing} onChange={e => setForm(f => ({ ...f, bank_iban: e.target.value }))} placeholder="BE68 XXXX XXXX XXXX" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Numéro BCE/KBO</Label>
                <Input value={form.bce_number} onChange={e => setForm(f => ({ ...f, bce_number: e.target.value }))} placeholder="BE 0xxx.xxx.xxx" className="h-12 rounded-xl" />
              </div>
            </div>

            {/* Vérification */}
            <VerificationSection user={user} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['currentUser'] })} />

            {/* Disponibilités */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Mes disponibilités
              </h3>
              <AvailabilityEditor slots={form.availability_slots} onChange={slots => setForm(f => ({ ...f, availability_slots: slots }))} />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (isEditing) {
                    setForm(f => ({
                      ...f,
                      phone: user?.phone || '',
                      address: user?.address || '',
                      bank_iban: user?.bank_iban || '',
                      contact_email: user?.contact_email || user?.email || '',
                    }));
                    setVerifiedPhone(user?.phone || null);
                    setVerifiedEmail(user?.contact_email || null);
                  }
                  setIsEditing(e => !e);
                }}
                className="flex-1 h-14 rounded-xl text-base"
              >
                {isEditing ? <><X className="w-5 h-5 mr-2" />Annuler</> : <><Pencil className="w-5 h-5 mr-2" />Modifier</>}
              </Button>
              <Button
                onClick={() => updateMutation.mutate({ ...form, base_price: Number(form.base_price), hourly_rate: Number(form.hourly_rate) })}
                disabled={updateMutation.isPending || !isEditing}
                className="flex-1 h-14 rounded-xl text-base bg-accent hover:bg-accent/90"
              >
                <Save className="w-5 h-5 mr-2" />
                {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>

            <Button variant="outline" onClick={() => navigate('/Support')} className="w-full h-14 rounded-xl text-base font-medium">
              <Headphones className="w-5 h-5 mr-2" /> Contacter le support
            </Button>

            <Button variant="outline" onClick={() => base44.auth.logout()} className="w-full h-14 rounded-xl text-base text-destructive hover:text-destructive">
              <LogOut className="w-5 h-5 mr-2" /> Déconnexion
            </Button>


          </div>
        </>
      )}
    </div>
  );
}