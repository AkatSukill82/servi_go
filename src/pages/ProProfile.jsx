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
import { Camera, Save, LogOut, Briefcase, Euro, MapPin, LayoutDashboard, ArrowLeft } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ProProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    phone: '', address: '', bank_iban: '', photo_url: '',
    category_name: '', base_price: '', hourly_rate: '',
    pro_description: '', available: true,
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
      });
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton fallback="/ProDashboard" />
          <h1 className="text-2xl font-bold">Mon profil pro</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/ProDashboard')} className="rounded-xl">
          <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
        </Button>
      </div>

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
        {/* Availability toggle */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="font-medium">Disponible</p>
            <p className="text-xs text-muted-foreground">Accepter de nouvelles missions</p>
          </div>
          <Switch
            checked={form.available}
            onCheckedChange={val => setForm(f => ({ ...f, available: val }))}
          />
        </div>

        {/* Métier & prix */}
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
              <Input
                type="number"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="Ex: 80"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tarif horaire (€/h)</Label>
              <Input
                type="number"
                value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                placeholder="Ex: 45"
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Coordonnées
          </h3>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Téléphone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Adresse</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Votre adresse" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">IBAN</Label>
            <Input value={form.bank_iban} onChange={e => setForm(f => ({ ...f, bank_iban: e.target.value }))} placeholder="FR76 XXXX..." className="h-12 rounded-xl" />
          </div>
        </div>

        <Button onClick={() => updateMutation.mutate({ ...form, base_price: Number(form.base_price), hourly_rate: Number(form.hourly_rate) })} disabled={updateMutation.isPending} className="w-full h-14 rounded-xl text-base bg-accent hover:bg-accent/90">
          <Save className="w-5 h-5 mr-2" />
          {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>

        <Button variant="outline" onClick={() => base44.auth.logout()} className="w-full h-14 rounded-xl text-base text-destructive hover:text-destructive">
          <LogOut className="w-5 h-5 mr-2" /> Déconnexion
        </Button>
      </div>
    </div>
  );
}