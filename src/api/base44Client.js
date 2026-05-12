import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isNative } from '@/lib/platform';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// En natif (iOS/Android), pas de proxy Vite — on pointe directement vers Base44
const serverUrl = isNative ? 'https://base44.app' : '';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl
});
