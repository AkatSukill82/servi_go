import { base44 } from '@/api/base44Client';

/**
 * Send a push notification to a user via FCM (Base44 backend function).
 * Also creates the in-app Notification record.
 *
 * @param {Object} params
 * @param {string} params.recipient_email
 * @param {string} params.recipient_type  'particulier' | 'professionnel'
 * @param {string} params.type            notification type key
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.request_id]
 * @param {string} [params.action_url]
 */
export async function sendPushNotification({
  recipient_email,
  recipient_type,
  type,
  title,
  body,
  request_id,
  action_url,
}) {
  if (!recipient_email) return;

  // 1. Store in-app notification (always)
  await base44.entities.Notification.create({
    recipient_email,
    recipient_type,
    type,
    title,
    body,
    request_id,
    action_url,
  });

  // 2. Send FCM push (fire-and-forget — don't block the caller)
  base44.functions.invoke('sendPushNotification', {
    recipient_email,
    title,
    body,
    data: { type, action_url: action_url || '', request_id: request_id || '' },
  }).catch(() => {});
}
