import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Registers the service worker and subscribes the user to Web Push.
 * Saves the subscription to the backend via savePushToken.
 * Should only be called for authenticated professional users.
 */
export function usePushSubscription(userEmail, userType) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    // Only for professionals, only once
    if (!userEmail || userType !== 'professionnel' || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        // Register SW
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Push permission denied');
          return;
        }

        // Fetch VAPID public key from backend
        const { data } = await base44.functions.invoke('getVapidPublicKey', {});
        const vapidKey = data?.vapidPublicKey;
        if (!vapidKey) { console.warn('No VAPID key returned'); return; }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Save to backend
        await base44.functions.invoke('savePushToken', {
          subscription: subscription.toJSON(),
          platform: 'web',
          deviceName: navigator.userAgent.slice(0, 60),
        });

        subscribedRef.current = true;
        console.log('Push subscription registered');
      } catch (err) {
        console.error('Push subscription error:', err);
      }
    }

    subscribe();
  }, [userEmail, userType]);
}