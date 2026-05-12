/**
 * platform.js — source unique de vérité pour la détection de plateforme.
 * Importez depuis ici dans TOUS les fichiers. Ne jamais écrire
 * `window.Capacitor !== undefined` ailleurs dans le code.
 *
 * window.Capacitor est injecté par le bridge natif AVANT que le JS charge,
 * donc cette constante est fiable dès le démarrage.
 */

const cap = typeof window !== 'undefined' ? window.Capacitor : null;

export const platform  = cap?.getPlatform?.() ?? 'web'; // 'ios' | 'android' | 'web'
export const isIOS     = platform === 'ios';
export const isAndroid = platform === 'android';
export const isNative  = isIOS || isAndroid;
export const isWeb     = platform === 'web';
