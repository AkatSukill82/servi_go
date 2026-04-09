import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DAYS = [
  { index: 0, label: 'Lundi' },
  { index: 1, label: 'Mardi' },
  { index: 2, label: 'Mercredi' },
  { index: 3, label: 'Jeudi' },
  { index: 4, label: 'Vendredi' },
  { index: 5, label: 'Samedi' },
  { index: 6, label: 'Dimanche' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

function initDays(records) {
  return DAYS.map(d => {
    const rec = records.find(r => r.day_of_week === d.index);
    return {
      ...d,
      id: rec?.id || null,
      is_day_off: rec?.is_day_off ?? false,
      slots: rec?.slots || [{ start: '08:00', end: '18:00', available: true }],
    };
  });
}

export default function ProAvailabilitySection({ userEmail }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(DAYS.map(d => ({ ...d, id: null, is_day_off: false, slots: [{ start: '08:00', end: '18:00', available: true }] })));

  const { data: records = [] } = useQuery({
    queryKey: ['proAvailability', userEmail],
    queryFn: () => base44.entities.ProAvailability.filter({ professional_email: userEmail }, 'day_of_week'),
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (records.length > 0) setDays(initDays(records));
  }, [records]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const day of days) {
        const data = {
          professional_email: userEmail,
          day_of_week: day.index,
          day_label: day.label,
          is_day_off: day.is_day_off,
          slots: day.slots,
        };
        if (day.id) {
          await base44.entities.ProAvailability.update(day.id, data);
        } else {
          const created = await base44.entities.ProAvailability.create(data);
          day.id = created.id;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAvailability', userEmail] });
      toast.success('Disponibilités sauvegardées ✓');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const toggleDayOff = (idx) => {
    setDays(d => d.map((day, i) => i === idx ? { ...day, is_day_off: !day.is_day_off } : day));
  };

  const addSlot = (dayIdx) => {
    setDays(d => d.map((day, i) => i === dayIdx
      ? { ...day, slots: [...day.slots, { start: '08:00', end: '18:00', available: true }] }
      : day
    ));
  };

  const removeSlot = (dayIdx, slotIdx) => {
    setDays(d => d.map((day, i) => i === dayIdx
      ? { ...day, slots: day.slots.filter((_, si) => si !== slotIdx) }
      : day
    ));
  };

  const updateSlot = (dayIdx, slotIdx, field, value) => {
    setDays(d => d.map((day, i) => i === dayIdx
      ? { ...day, slots: day.slots.map((s, si) => si === slotIdx ? { ...s, [field]: value } : s) }
      : day
    ));
  };

  return (
    <div className="space-y-3">
      {days.map((day, dayIdx) => (
        <div key={day.index} className="bg-muted/30 rounded-xl p-3 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{day.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.is_day_off ? 'Repos' : 'Disponible'}</span>
              <Switch
                checked={!day.is_day_off}
                onCheckedChange={() => toggleDayOff(dayIdx)}
              />
            </div>
          </div>
          {!day.is_day_off && (
            <div className="space-y-2">
              {day.slots.map((slot, slotIdx) => (
                <div key={slotIdx} className="flex items-center gap-2">
                  <select
                    value={slot.start}
                    onChange={e => updateSlot(dayIdx, slotIdx, 'start', e.target.value)}
                    className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground">–</span>
                  <select
                    value={slot.end}
                    onChange={e => updateSlot(dayIdx, slotIdx, 'end', e.target.value)}
                    className="flex-1 h-8 rounded-lg border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {HOURS.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <button onClick={() => removeSlot(dayIdx, slotIdx)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSlot(dayIdx)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
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