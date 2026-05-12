import { isNativeNow } from '@/lib/platform';

let Haptics = null;

function loadHaptics() {
  if (Haptics !== null) return;
  if (!isNativeNow()) { Haptics = false; return; }
  import('@capacitor/haptics').then(m => { Haptics = m.Haptics; }).catch(() => { Haptics = false; });
}

export function hapticLight() {
  loadHaptics();
  if (!Haptics) return;
  Haptics.impact({ style: 'LIGHT' }).catch(() => {});
}

export function hapticMedium() {
  loadHaptics();
  if (!Haptics) return;
  Haptics.impact({ style: 'MEDIUM' }).catch(() => {});
}

export function hapticSelection() {
  loadHaptics();
  if (!Haptics) return;
  Haptics.selectionChanged().catch(() => {});
}
