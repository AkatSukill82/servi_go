import { isNativeNow } from '@/lib/platform';

function triggerHaptic(style) {
  if (!isNativeNow()) return;
  try {
    const cap = window.Capacitor;
    if (!cap) return;
    // Use Capacitor Plugins API if available
    const Haptics = cap.Plugins?.Haptics;
    if (!Haptics) return;
    if (style === 'selection') {
      Haptics.selectionChanged().catch(() => {});
    } else {
      Haptics.impact({ style: style || 'LIGHT' }).catch(() => {});
    }
  } catch (_) {}
}

export function hapticLight()     { triggerHaptic('LIGHT'); }
export function hapticMedium()    { triggerHaptic('MEDIUM'); }
export function hapticSelection() { triggerHaptic('selection'); }