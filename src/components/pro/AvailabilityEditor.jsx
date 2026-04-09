import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DAYS = [
  { day_of_week: 0, day_label: 'Lundi' },
  { day_of_week: 1, day_label: 'Mardi' },
  { day_of_week: 2, day_label: 'Mercredi' },
  { day_of_week: 3, day_label: 'Jeudi' },
  { day_of_week: 4, day_label: 'Vendredi' },
  { day_of_week: 5, day_label: 'Samedi' },
  { day_of_week: 6, day_label: 'Dimanche' },
];

export default function AvailabilityEditor({ userEmail }) {
  const [days, setDays] = useState(DAYS.map(d => ({
    ...d,
    id: null,
    slots: [],
    is_day_off: d.day_of_week >= 5,
  })));
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Fetch existing availability on mount
  useEffect(() => {
    if (!userEmail) return;
    const fetchAvailability = async () => {
      try {
        const existing = await base44.entities.ProAvailability.filter({
          professional_email: userEmail,
        }, '-day_of_week');
        
        if (existing.length === 0) {
          // Initialize defaults
          setInitializing(true);
          const toCreate = DAYS.map(d => ({
            professional_email: userEmail,
            day_of_week: d.day_of_week,
            day_label: d.day_label,
            slots: d.day_of_week < 5 ? [{ start: '08:00', end: '18:00', available: true }] : [],
            is_day_off: d.day_of_week >= 5,
          }));
          
          await Promise.all(toCreate.map(rec => base44.entities.ProAvailability.create(rec)));
          setDays(toCreate.map((d, i) => ({ ...d, id: i })));
          toast.success('Créneaux par défaut configurés');
          setInitializing(false);
          return;
        }

        setDays(existing.map(e => ({
          day_of_week: e.day_of_week,
          day_label: e.day_label,
          id: e.id,
          slots: e.slots || [],
          is_day_off: e.is_day_off,
        })));
      } catch (err) {
        console.error('Error fetching availability:', err);
      }
    };
    fetchAvailability();
  }, [userEmail]);

  const updateDay = (dayIndex, updates) => {
    setDays(d => d.map((day, i) => i === dayIndex ? { ...day, ...updates } : day));
  };

  const addSlot = (dayIndex) => {
    const day = days[dayIndex];
    const newSlot = { start: '08:00', end: '18:00', available: true };
    updateDay(dayIndex, { slots: [...(day.slots || []), newSlot] });
  };

  const removeSlot = (dayIndex, slotIndex) => {
    const day = days[dayIndex];
    updateDay(dayIndex, { slots: day.slots.filter((_, i) => i !== slotIndex) });
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    const day = days[dayIndex];
    const updatedSlots = [...day.slots];
    updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], [field]: value };
    updateDay(dayIndex, { slots: updatedSlots });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all(
        days.map(day => {
          if (day.id) {
            return base44.entities.ProAvailability.update(day.id, {
              slots: day.slots,
              is_day_off: day.is_day_off,
            });
          }
          return base44.entities.ProAvailability.create({
            professional_email: userEmail,
            day_of_week: day.day_of_week,
            day_label: day.day_label,
            slots: day.slots,
            is_day_off: day.is_day_off,
          });
        })
      );
      toast.success('Disponibilités sauvegardées ✅');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {days.map((day, dayIndex) => (
        <div key={day.day_of_week} className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{day.day_label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{day.is_day_off ? 'Repos' : 'Disponible'}</span>
              <Switch
                checked={!day.is_day_off}
                onCheckedChange={(val) => updateDay(dayIndex, { is_day_off: !val })}
              />
            </div>
          </div>

          {!day.is_day_off && (
            <div className="space-y-2">
              {day.slots && day.slots.length > 0 ? (
                day.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
                      className="h-9 rounded-lg text-xs"
                    />
                    <span className="text-xs text-muted-foreground">à</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
                      className="h-9 rounded-lg text-xs"
                    />
                    <button
                      onClick={() => removeSlot(dayIndex, slotIndex)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucun créneau</p>
              )}
              <button
                onClick={() => addSlot(dayIndex)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Ajouter un créneau
              </button>
            </div>
          )}
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full h-11 rounded-xl bg-[#1D9E75] hover:bg-[#1D9E75]/90"
      >
        {loading ? 'Sauvegarde...' : 'Sauvegarder les disponibilités'}
      </Button>
    </div>
  );
}