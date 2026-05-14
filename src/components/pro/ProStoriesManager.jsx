import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Image, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BRAND } from '@/lib/theme';

export default function ProStoriesManager({ userEmail, userName }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', photo_before_url: '', photo_after_url: '' });

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['myStories', userEmail],
    queryFn: () => base44.entities.ProStory.filter({ professional_email: userEmail }, '-created_date', 20),
    enabled: !!userEmail,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProStory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStories', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['proStories'] });
      setShowForm(false);
      setForm({ title: '', description: '', photo_before_url: '', photo_after_url: '' });
      toast.success('Réalisation publiée !');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProStory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStories', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['proStories'] });
      toast.success('Supprimé');
    },
  });

  const uploadPhoto = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    return file_url;
  };

  const handleSubmit = async () => {
    if (!form.photo_after_url) { toast.error('Photo "après" obligatoire'); return; }
    await createMutation.mutateAsync({
      professional_email: userEmail,
      professional_name: userName,
      title: form.title,
      description: form.description,
      photo_before_url: form.photo_before_url || null,
      photo_after_url: form.photo_after_url,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-foreground">Mes réalisations</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre (ex: Rénovation salle de bain)"
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description optionnelle..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'photo_before_url', label: 'Photo AVANT', optional: true },
                  { key: 'photo_after_url', label: 'Photo APRÈS *', optional: false },
                ].map(({ key, label, optional }) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                    {form[key] ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '75%' }}>
                        <img src={form[key]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <button
                          onClick={() => setForm(f => ({ ...f, [key]: '' }))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer"
                        style={{ paddingBottom: '75%', position: 'relative' }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                          <span className="text-[10px] text-muted-foreground">Choisir</span>
                        </div>
                        <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await uploadPhoto(file);
                          setForm(f => ({ ...f, [key]: url }));
                        }} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold">Annuler</button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || uploading}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Publier'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories grid */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : stories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Image className="w-10 h-10 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Aucune réalisation publiée</p>
          <p className="text-xs mt-1">Ajoutez des photos avant/après pour inspirer confiance</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stories.map(story => (
            <div key={story.id} className="relative rounded-2xl overflow-hidden bg-muted" style={{ paddingBottom: '120%' }}>
              <img src={story.photo_after_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {story.photo_before_url && (
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <span className="text-[9px] text-white font-bold">B/A</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-white text-[11px] font-bold leading-tight line-clamp-1">{story.title || story.category_name || 'Réalisation'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Eye className="w-2.5 h-2.5 text-white/60" />
                  <span className="text-[9px] text-white/60">{story.views_count || 0}</span>
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(story.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}