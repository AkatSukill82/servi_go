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
import { Camera, Save, LogOut, User, Trash2, Receipt, FileText, Headphones } from 'lucide-react';
import SupportModal from '@/components/support/SupportModal';
import { useI18n } from '@/hooks/useI18n';
import DocumentsTab from '@/components/documents/DocumentsTab';
import { toast } from 'sonner';
import CustomerReceipts from '@/components/profile/CustomerReceipts';

export default function Profile() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [tab, setTab] = useState('profil');
  const [showSupport, setShowSupport] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', bank_iban: '', photo_url: '' });

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
    setForm(f => ({ ...f, photo_url: file_url }));
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
    <div className="px-4 pt-6 pb-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{t('profile_title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'profil', label: t('profile_tab_profile'), icon: <User className="w-3.5 h-3.5" /> },
          { key: 'recus', label: t('profile_tab_receipts'), icon: <Receipt className="w-3.5 h-3.5" /> },
          { key: 'documents', label: t('profile_tab_documents'), icon: <FileText className="w-3.5 h-3.5" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'recus' && <CustomerReceipts user={user} />}
      {tab === 'documents' && <DocumentsTab user={user} />}

      {tab === 'profil' && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                <AvatarImage src={form.photo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-md">
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <h2 className="mt-3 font-semibold text-lg">{user?.full_name || 'Utilisateur'}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {t('profile_personal_info')}
              </h3>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('profile_fullname')}</Label>
                <Input value={user?.full_name || ''} disabled className="h-12 rounded-xl bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={user?.email || ''} disabled className="h-12 rounded-xl bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('profile_phone')}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+32 123 34 56 78" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('profile_address')}</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Votre adresse complète" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('profile_iban')}</Label>
                <Input value={form.bank_iban} onChange={e => setForm(f => ({ ...f, bank_iban: e.target.value }))} placeholder="BE46 XXXX XXXX XXXX XXXX" className="h-12 rounded-xl" />
              </div>
            </div>

            <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="w-full h-14 rounded-xl text-base">
              <Save className="w-5 h-5 mr-2" />
              {updateMutation.isPending ? t('profile_saving') : t('profile_save')}
            </Button>

            <Button variant="outline" onClick={() => base44.auth.logout()} className="w-full h-14 rounded-xl text-base text-destructive hover:text-destructive">
              <LogOut className="w-5 h-5 mr-2" />
              {t('profile_logout')}
            </Button>

            <Button variant="outline" onClick={() => setShowSupport(true)} className="w-full h-12 rounded-xl text-sm font-medium">
              <Headphones className="w-4 h-4 mr-2" />
              Contacter le support
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full h-12 rounded-xl text-sm text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('profile_delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('profile_delete_confirm_title')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('profile_delete_confirm_desc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('btn_cancel')}</AlertDialogCancel>
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
                    {t('profile_delete_confirm_btn')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>

      {showSupport && <SupportModal user={user} onClose={() => setShowSupport(false)} />}
        </>
      )}
    </div>
  );
}