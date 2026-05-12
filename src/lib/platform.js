/**
 * platform.js — source unique de vérité pour la détection de plateforme.
 *
 * Les constantes (isIOS, isNative…) sont évaluées au chargement du module.
 * La fonction getPlatform() relit window.Capacitor à chaque appel — utilisez-la
 * pour les décisions critiques (paiement) afin d'éviter les problèmes de timing.
 */

const cap = typeof window !== 'undefined' ? window.Capacitor : null;

export const platform  = cap?.getPlatform?.() ?? 'web';
export const isIOS     = platform === 'ios';
export const isAndroid = platform === 'android';
export const isNative  = isIOS || isAndroid;
export const isWeb     = platform === 'web';

/** Relit la plateforme au moment de l'appel (fiable même si Capacitor charge tard). */
export function getPlatformNow() {
  return window.Capacitor?.getPlatform?.() ?? 'web';
}
export function isIOSNow()     { return getPlatformNow() === 'ios'; }
export function isAndroidNow() { return getPlatformNow() === 'android'; }
export function isNativeNow()  { return isIOSNow() || isAndroidNow(); }
