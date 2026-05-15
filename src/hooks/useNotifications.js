import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

const DEEP_LINK_MAP = {
  new_mission:       (n) => n.action_url || '/ProDashboard',
  contract_to_sign:  (n) => n.action_url || '/ProDashboard',
  message_received:  (n) => n.action_url || '/Messages',
  mission_accepted:  (n) => n.action_url || '/MissionHistory',
  review_request:    (n) => n.action_url || '/MissionHistory',
  contract_signed:   (n) => n.action_url || '/Chat',
  pro_en_route:      (n) => n.action_url || '/TrackingMap',
  mission_completed: (n) => n.action_url || '/MissionHistory',
  new_review:        (n) => n.action_url || '/ProDashboard',
  dispute_opened:    (n) => n.action_url || '/Chat',
  dispute_resolved:  (n) => n.action_url || '/Chat',
};

// Save FCM/APNs token to Base44 so the backend can target this device
async function savePushToken(token, platform) {
  try {
    const user = await base44.auth.me();
    if (!user?.email) return;
    // Upsert: update existing token or create new
    const existing = await base44.entities.PushToken.filter({ user_email: user.email, platform });
    if (existing[0]) {
      await base44.entities.PushToken.update(existing[0].id, { token, updated_date: new Date().toISOString() });
    } else {
      await base44.entities.PushToken.create({ user_email: user.email, token, platform });
    }
  } catch {}
}

export function useNotifications(navigate) {
  const permissionRef = useRef('default');

  // Register native push listeners once (Capacitor only)
  useEffect(() => {
    if (!isNative()) return;

    let listeners = [];

    const pkg = '@capacitor' + '/push-notifications';
    import(/* @vite-ignore */ pkg).then(({ PushNotifications }) => {
      // Token received — save to Base44
      PushNotifications.addListener('registration', (token) => {
        const platform = window.Capacitor.getPlatform?.() === 'android' ? 'android' : 'ios';
        savePushToken(token.value, platform);
      }).then(l => listeners.push(l));

      // Foreground notification — show local alert
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(notification.title || 'ServiGo', {
            body: notification.body || '',
            icon: '/favicon.ico',
          });
        }
      }).then(l => listeners.push(l));

      // User tapped a notification — deep link
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data || {};
        if (!navigate) return;
        const resolver = DEEP_LINK_MAP[data.type];
        const url = resolver ? resolver(data) : (data.action_url || '/');
        navigate(url);
      }).then(l => listeners.push(l));

      // Error logging
      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[Push] Registration error:', err);
      }).then(l => listeners.push(l));
    }).catch(() => {});

    return () => {
      listeners.forEach(l => l?.remove?.());
    };
  }, []);

  const requestPermission = async () => {
    if (isNative()) {
      try {
        const pkg = '@capacitor' + '/push-notifications';
        const { PushNotifications } = await import(/* @vite-ignore */ pkg);
        const result = await PushNotifications.requestPermissions();
        if (result.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    // Web fallback
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  };

  // In-app local notification (web only — native uses FCM delivery)
  const notify = (title, body, notificationData = {}, options = {}) => {
    if (isNative()) return; // Native push is delivered by FCM/APNs directly
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      if (navigate && notificationData.type) {
        const resolver = DEEP_LINK_MAP[notificationData.type];
        const url = resolver ? resolver(notificationData) : (notificationData.action_url || '/');
        navigate(url);
      } else if (notificationData.action_url && navigate) {
        navigate(notificationData.action_url);
      }
    };
  };

  return { requestPermission, notify };
}

/**
 * Polling-based notification trigger — fires when data changes.
 * onNotify(prev, next) → { title, body } | null
 */
export function usePollingNotification({ data, onNotify, notify }) {
  const prevRef = useRef(null);

  useEffect(() => {
    if (data === undefined || data === null) return;
    const prev = prevRef.current;
    if (prev !== null) {
      const notification = onNotify(prev, data);
      if (notification) notify(notification.title, notification.body);
    }
    prevRef.current = data;
  }, [data]);
}