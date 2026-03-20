import React, { useState } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const DAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
];

const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

export default function AvailabilityEditor({ slots = [], onChange }) {
  const [newSlot, setNewSlot] = useState({ day: 'lundi', start: '08:00', end: '18:00' });

  const addSlot = () => {
    if (newSlot.start >= newSlot.end) return;
    // Check no duplicate for same day+start
    const exists = slots.some(s => s.day === newSlot.day && s.start === newSlot.start);
    if (exists) return;
    onChange([...slots, { ...newSlot }]);
  };

  const removeSlot = (index) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const dayLabel = (key) => DAYS.find(d => d.key === key)?.label || key;

  // Group slots by day for display
  const grouped = DAYS.map(d => ({
    ...d,
    slots: slots.filter(s => s.day === d.key),
  })).filter(d => d.slots.length > 0);

  return (
    <div className="space-y-4">
      {/* Existing slots */}
      {grouped.length > 0 ? (
        <div className="space-y-2">
          {grouped.map(({ key, label, slots: daySlots }) => (
            <div key={key} className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot, idx) => {
                  const globalIdx = slots.findIndex(s => s.day === slot.day && s.start === slot.start && s.end === slot.end);
                  return (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                    >
                      <Clock className="w-3 h-3" />
                      {slot.start} – {slot.end}
                      <button
                        onClick={() => removeSlot(globalIdx)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          Aucun créneau défini. Ajoutez vos disponibilités ci-dessous.
        </p>
      )}

      {/* Add slot form */}
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Ajouter un créneau</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Jour</Label>
            <Select value={newSlot.day} onValueChange={v => setNewSlot(s => ({ ...s, day: v }))}>
              <SelectTrigger className="h-10 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map(d => (
                  <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Début</Label>
            <Select value={newSlot.start} onValueChange={v => setNewSlot(s => ({ ...s, start: v }))}>
              <SelectTrigger className="h-10 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.slice(0, 24).map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Fin</Label>
            <Select value={newSlot.end} onValueChange={v => setNewSlot(s => ({ ...s, end: v }))}>
              <SelectTrigger className="h-10 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.slice(1).map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          onClick={addSlot}
          disabled={newSlot.start >= newSlot.end}
          variant="outline"
          className="w-full h-9 rounded-lg text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter ce créneau
        </Button>
      </div>
    </div>
  );
}