import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Save, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DAYS = [
  { idx: 0, label: 'Lundi' },
  { idx: 1, label: 'Mardi' },
  { idx: 2, label: 'Mercredi' },
  { idx: 3, label: 'Jeudi' },
  { idx: 4, label: 'Vendredi' },
  { idx: 5, label: 'Samedi' },
  { idx: 6, label: 'Dimanche' },
];

const DEFAULT_SLOTS = [{ start: '08:00', end: '18:00', available: true }];

const HOURS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function ProAvailabilityEditor({ userEmail }) {
  const queryClient = useQueryClient();
  const [localDays, setLocalDays] = useState(() =>
    DAYS.map(d => ({ ...d, is_day_off: false, slots: [...DEFAULT_SLOTS], record_id: null }))
  );

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['proAvailability', userEmail],
    queryFn: () => base44.entities.ProAvailability.filter({ professional_email: userEmail }, 'day_of_week', 7),
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (records.length > 0) {
      setLocalDays(DAYS.map(d => {
        const rec = records.find(r => r.day_of_week === d.idx);
        return {
          ...d,
          is_day_off: rec?.is_day_off ?? false,
          slots: rec?.slots?.length ? rec.slots : [...DEFAULT_SLOTS],
          record_id: rec?.id || null,
        };
      }));
    }
  }, [records]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(localDays.map(day => {
        const data = {
          professional_email: userEmail,
          day_of_week: day.idx,
          day_label: day.label,
          is_day_off: day.is_day_off,
          slots: day.slots,
        };
        if (day.record_id) {
          return base44.entities.ProAvailability.update(day.record_id, data);
        } else {
          return base44.entities.ProAvailability.create(data).then(rec => {
            day.record_id = rec.id;
          });
        }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAvailability', userEmail] });
      toast.success('Disponibilités sauvegardées ✓');
    },
    onError: (err) => toast.error('Erreur : ' + err.message),
  });

  const toggleDayOff = (idx) => {
    setLocalDays(prev => prev.map(d => d.idx === idx ? { ...d, is_day_off: !d.is_day_off } : d));
  };

  const addSlot = (dayIdx) => {
    setLocalDays(prev => prev.map(d =>
      d.idx === dayIdx ? { ...d, slots: [...d.slots, { start: '08:00', end: '18:00', available: true }] } : d
    ));
  };

  const removeSlot = (dayIdx, slotIdx) => {
    setLocalDays(prev => prev.map(d =>
      d.idx === dayIdx ? { ...d, slots: d.slots.filter((_, i) => i !== slotIdx) } : d
    ));
  };

  const updateSlot = (dayIdx, slotIdx, field, value) => {
    setLocalDays(prev => prev.map(d =>
      d.idx === dayIdx
        ? { ...d, slots: d.slots.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s) }
        : d
    ));
  };

  if (isLoading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-[#534AB7]" /> Mes disponibilités hebdomadaires
      </h3>

      {localDays.map(day => (
        <div key={day.idx} className={`bg-card border rounded-xl p-3 space-y-2 ${day.is_day_off ? 'border-border/50 opacity-60' : 'border-border'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{day.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.is_day_off ? 'Congé' : 'Disponible'}</span>
              <Switch checked={!day.is_day_off} onCheckedChange={() => toggleDayOff(day.idx)} />
            </div>
          </div>

          {!day.is_day_off && (
            <div className="space-y-2">
              {day.slots.map((slot, si) => (
                <div key={si} className="flex items-center gap-2">
                  <select
                    value={slot.start}
                    onChange={e => updateSlot(day.idx, si, 'start', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-border bg-background text-xs px-2 focus:outline-none"
                  >
                    {HOURS.slice(0, 24).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground">→</span>
                  <select
                    value={slot.end}
                    onChange={e => updateSlot(day.idx, si, 'end', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-border bg-background text-xs px-2 focus:outline-none"
                  >
                    {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <button onClick={() => removeSlot(day.idx, si)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSlot(day.idx)}
                className="w-full text-xs text-primary border border-dashed border-primary/40 rounded-lg py-1.5 flex items-center justify-center gap-1 hover:bg-primary/5"
              >
                <Plus className="w-3 h-3" /> Ajouter un créneau
              </button>
            </div>
          )}
        </div>
      ))}

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