import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = [
  { key: 0, label: 'Lundi' },
  { key: 1, label: 'Mardi' },
  { key: 2, label: 'Mercredi' },
  { key: 3, label: 'Jeudi' },
  { key: 4, label: 'Vendredi' },
  { key: 5, label: 'Samedi' },
  { key: 6, label: 'Dimanche' },
];

const DEFAULT_SLOT = { start: '08:00', end: '18:00', available: true };

export default function ProAvailabilitySection({ userEmail }) {
  const queryClient = useQueryClient();
  const [localDays, setLocalDays] = useState(() =>
    DAYS.map(d => ({ day_of_week: d.key, day_label: d.label, is_day_off: false, slots: [{ ...DEFAULT_SLOT }], _record_id: null }))
  );

  const { data: avRecords = [], isLoading } = useQuery({
    queryKey: ['proAvailability', userEmail],
    queryFn: () => base44.entities.ProAvailability.filter({ professional_email: userEmail }, 'day_of_week', 7),
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (!avRecords.length) return;
    setLocalDays(DAYS.map(d => {
      const rec = avRecords.find(r => r.day_of_week === d.key);
      return {
        day_of_week: d.key,
        day_label: d.label,
        is_day_off: rec?.is_day_off ?? false,
        slots: rec?.slots?.length ? rec.slots : [{ ...DEFAULT_SLOT }],
        _record_id: rec?.id || null,
      };
    }));
  }, [avRecords]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(localDays.map(async (day) => {
        const data = {
          professional_email: userEmail,
          day_of_week: day.day_of_week,
          day_label: day.day_label,
          is_day_off: day.is_day_off,
          slots: day.slots,
        };
        if (day._record_id) {
          await base44.entities.ProAvailability.update(day._record_id, data);
        } else {
          await base44.entities.ProAvailability.create(data);
        }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAvailability', userEmail] });
      toast.success('Disponibilités sauvegardées ✓');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const updateDay = (dayIdx, patch) => {
    setLocalDays(days => days.map((d, i) => i === dayIdx ? { ...d, ...patch } : d));
  };

  const addSlot = (dayIdx) => {
    setLocalDays(days => days.map((d, i) => i === dayIdx
      ? { ...d, slots: [...d.slots, { ...DEFAULT_SLOT }] }
      : d
    ));
  };

  const removeSlot = (dayIdx, slotIdx) => {
    setLocalDays(days => days.map((d, i) => i === dayIdx
      ? { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) }
      : d
    ));
  };

  const updateSlot = (dayIdx, slotIdx, field, value) => {
    setLocalDays(days => days.map((d, i) => i === dayIdx
      ? { ...d, slots: d.slots.map((s, si) => si === slotIdx ? { ...s, [field]: value } : s) }
      : d
    ));
  };

  if (isLoading) return <div className="text-xs text-muted-foreground text-center py-4">Chargement...</div>;

  return (
    <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#534AB7]" /> Mes disponibilités
      </h3>

      <div className="space-y-3">
        {localDays.map((day, dayIdx) => (
          <div key={day.day_of_week} className="border border-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
              <p className="text-sm font-semibold">{day.day_label}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{day.is_day_off ? 'Congé' : 'Disponible'}</span>
                <Switch
                  checked={!day.is_day_off}
                  onCheckedChange={val => updateDay(dayIdx, { is_day_off: !val })}
                />
              </div>
            </div>

            {!day.is_day_off && (
              <div className="px-4 py-3 space-y-2">
                {day.slots.map((slot, slotIdx) => (
                  <div key={slotIdx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={e => updateSlot(dayIdx, slotIdx, 'start', e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-border text-sm bg-background"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={e => updateSlot(dayIdx, slotIdx, 'end', e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-border text-sm bg-background"
                    />
                    <button
                      onClick={() => removeSlot(dayIdx, slotIdx)}
                      disabled={day.slots.length === 1}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSlot(dayIdx)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter un créneau
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full h-11 rounded-xl bg-[#1D9E75] hover:bg-[#1D9E75]/90 font-semibold"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les disponibilités'}
      </Button>
    </div>
  );
}