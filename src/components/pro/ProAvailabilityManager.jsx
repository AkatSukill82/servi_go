import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
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

const HOURS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const DEFAULT_SLOTS = [{ start: '08:00', end: '18:00', available: true }];

export default function ProAvailabilityManager({ userEmail }) {
  const queryClient = useQueryClient();
  const [localDays, setLocalDays] = useState(() =>
    DAYS.map(d => ({ ...d, is_day_off: false, slots: [...DEFAULT_SLOTS], record_id: null }))
  );

  const { data: records = [] } = useQuery({
    queryKey: ['proAvailability', userEmail],
    queryFn: () => base44.entities.ProAvailability.filter({ professional_email: userEmail }),
    enabled: !!userEmail,
  });

  // Merge fetched records into localDays
  useEffect(() => {
    if (!records.length) return;
    setLocalDays(prev => prev.map(day => {
      const rec = records.find(r => r.day_of_week === day.index);
      if (!rec) return day;
      return {
        ...day,
        is_day_off: rec.is_day_off || false,
        slots: rec.slots?.length ? rec.slots : [...DEFAULT_SLOTS],
        record_id: rec.id,
      };
    }));
  }, [records]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(localDays.map(day => {
        const data = {
          professional_email: userEmail,
          day_of_week: day.index,
          day_label: day.label,
          is_day_off: day.is_day_off,
          slots: day.slots,
        };
        if (day.record_id) {
          return base44.entities.ProAvailability.update(day.record_id, data);
        } else {
          return base44.entities.ProAvailability.create(data).then(rec => {
            setLocalDays(prev => prev.map(d => d.index === day.index ? { ...d, record_id: rec.id } : d));
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

  const toggleDayOff = (index) => {
    setLocalDays(prev => prev.map(d => d.index === index ? { ...d, is_day_off: !d.is_day_off } : d));
  };

  const addSlot = (index) => {
    setLocalDays(prev => prev.map(d => {
      if (d.index !== index) return d;
      return { ...d, slots: [...d.slots, { start: '08:00', end: '18:00', available: true }] };
    }));
  };

  const removeSlot = (dayIndex, slotIdx) => {
    setLocalDays(prev => prev.map(d => {
      if (d.index !== dayIndex) return d;
      return { ...d, slots: d.slots.filter((_, i) => i !== slotIdx) };
    }));
  };

  const updateSlot = (dayIndex, slotIdx, field, value) => {
    setLocalDays(prev => prev.map(d => {
      if (d.index !== dayIndex) return d;
      const slots = d.slots.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s);
      return { ...d, slots };
    }));
  };

  return (
    <div className="space-y-3">
      {localDays.map(day => (
        <div key={day.index} className={`rounded-xl border p-4 transition-colors ${day.is_day_off ? 'bg-muted/30 border-border/30 opacity-60' : 'bg-white border-border/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{day.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.is_day_off ? 'Congé' : 'Disponible'}</span>
              <Switch checked={!day.is_day_off} onCheckedChange={() => toggleDayOff(day.index)} />
            </div>
          </div>

          {!day.is_day_off && (
            <div className="space-y-2">
              {day.slots.map((slot, si) => (
                <div key={si} className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Select value={slot.start} onValueChange={v => updateSlot(day.index, si, 'start', v)}>
                    <SelectTrigger className="h-8 w-24 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.slice(0, 24).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">—</span>
                  <Select value={slot.end} onValueChange={v => updateSlot(day.index, si, 'end', v)}>
                    <SelectTrigger className="h-8 w-24 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.slice(1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => removeSlot(day.index, si)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addSlot(day.index)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1">
                <Plus className="w-3.5 h-3.5" /> Ajouter un créneau
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