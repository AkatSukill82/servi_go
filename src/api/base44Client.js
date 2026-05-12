import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// En Capacitor (iOS natif), il n'y a pas de proxy — on pointe directement vers l'API Base44
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
const serverUrl = isCapacitor ? 'https://base44.app' : '';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
});
