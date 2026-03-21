import React, { useState, useEffect } from 'react';
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
import { Camera, Save, LogOut, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Profile() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    phone: '',
    address: '',
    bank_iban: '',
    photo_url: '',
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || '',
        address: user.address || '',
        bank_iban: user.bank_iban || '',
        photo_url: user.photo_url || '',
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
    setForm({ ...form, photo_url: file_url });
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
            <AvatarImage src={form.photo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-md">
            <Camera className="w-4 h-4 text-primary-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>
        <h2 className="mt-3 font-semibold text-lg">{user?.full_name || 'Utilisateur'}</h2>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informations personnelles
          </h3>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nom complet</Label>
            <Input value={user?.full_name || ''} disabled className="h-12 rounded-xl bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email || ''} disabled className="h-12 rounded-xl bg-muted/50" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Téléphone</Label>
            <Input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+32 123 34 56 78"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Adresse</Label>
            <Input
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Votre adresse complète"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">IBAN (Données bancaires)</Label>
            <Input
              value={form.bank_iban}
              onChange={e => setForm({ ...form, bank_iban: e.target.value })}
              placeholder="BE46 XXXX XXXX XXXX XXXX"
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full h-14 rounded-xl text-base"
        >
          <Save className="w-5 h-5 mr-2" />
          {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-14 rounded-xl text-base text-destructive hover:text-destructive"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Déconnexion
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer mon compte
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
                  try {
                    await base44.auth.updateMe({ account_deleted: true, user_type: null });
                    toast.success('Compte supprimé.');
                    base44.auth.logout('/Landing');
                  } catch {
                    toast.error('Erreur lors de la suppression.');
                  }
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}