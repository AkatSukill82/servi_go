import React, { useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DAY_KEYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Generate time slots every 30 min within a range like "08:00"-"18:00"
function generateTimeSlots(start, end) {
  const slots = [];
  let [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const endMins = eh * 60 + em;
  while (sh * 60 + sm < endMins) {
    slots.push(`${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
    sm += 30;
    if (sm >= 60) { sh++; sm -= 60; }
  }
  return slots;
}

export default function SlotPicker({ proSlots = [], selectedDate, selectedTime, onDateChange, onTimeChange }) {
  // Build next 14 days
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  // Get available days from proSlots
  const availableDayKeys = useMemo(() => {
    return new Set((proSlots || []).map(s => s.day));
  }, [proSlots]);

  // Time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayKey = DAY_KEYS[new Date(selectedDate).getDay()];
    const daySlots = (proSlots || []).filter(s => s.day === dayKey);
    const all = [];
    daySlots.forEach(slot => {
      all.push(...generateTimeSlots(slot.start, slot.end));
    });
    return [...new Set(all)].sort();
  }, [selectedDate, proSlots]);

  const getDayLabel = (date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEE', { locale: fr });
  };

  const isDayAvailable = (date) => {
    if (availableDayKeys.size === 0) return true; // no restrictions = all days open
    const key = DAY_KEYS[date.getDay()];
    return availableDayKeys.has(key);
  };

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div>
        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" /> Choisissez une date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const available = isDayAvailable(date);
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                disabled={!available}
                onClick={() => { onDateChange(dateStr); onTimeChange(''); }}
                className={cn(
                  'flex flex-col items-center shrink-0 w-14 py-3 rounded-2xl border transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : available
                    ? 'bg-card border-border/50 hover:border-primary/40'
                    : 'bg-muted/40 border-transparent opacity-40 cursor-not-allowed'
                )}
              >
                <span className="text-[10px] font-medium capitalize">{getDayLabel(date)}</span>
                <span className="text-lg font-bold leading-tight">{format(date, 'd')}</span>
                <span className="text-[10px] capitalize">{format(date, 'MMM', { locale: fr })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time picker */}
      {selectedDate && (
        <div>
          <p className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" /> Choisissez un horaire
          </p>
          {timeSlots.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
              Aucun créneau disponible ce jour-là
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map(time => (
                <button
                  key={time}
                  onClick={() => onTimeChange(time)}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-medium border transition-all',
                    selectedTime === time
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border/50 hover:border-primary/40'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}