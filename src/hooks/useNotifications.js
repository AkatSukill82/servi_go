import { useEffect, useRef } from 'react';

// Deep link mapping: notification action_url → navigate
const DEEP_LINK_MAP = {
  new_mission: (n) => n.action_url || '/ProDashboard',
  contract_to_sign: (n) => n.action_url || '/ProDashboard',
  message_received: (n) => n.action_url || '/Messages',
  mission_accepted: (n) => n.action_url || '/MissionHistory',
  review_request: (n) => n.action_url || '/MissionHistory',
  contract_signed: (n) => n.action_url || '/Chat',
  pro_en_route: (n) => n.action_url || '/TrackingMap',
  mission_completed: (n) => n.action_url || '/MissionHistory',
  new_review: (n) => n.action_url || '/ProDashboard',
};

export function useNotifications(navigate) {
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

  const notify = (title, body, notificationData = {}, options = {}) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Deep link on click
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