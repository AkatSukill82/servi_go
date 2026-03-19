import { useEffect, useRef } from 'react';

/**
 * Hook to request notification permission and show browser notifications.
 * Call requestPermission() once (e.g. on login/dashboard mount).
 * Call notify(title, body, options) to trigger a notification.
 */
export function useNotifications() {
  const permissionRef = useRef(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
      return result === 'granted';
    }
    return false;
  };

  const notify = (title, body, options = {}) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  };

  return { requestPermission, notify };
}

/**
 * Hook that polls a query and fires a notification when a condition is met.
 * onNotify(prev, next) should return { title, body } or null.
 */
export function usePollingNotification({ data, onNotify, notify }) {
  const prevRef = useRef(null);

  useEffect(() => {
    if (data === undefined || data === null) return;
    const prev = prevRef.current;
    if (prev !== null) {
      const notification = onNotify(prev, data);
      if (notification) {
        notify(notification.title, notification.body);
      }
    }
    prevRef.current = data;
  }, [data]);
}