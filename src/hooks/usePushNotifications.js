import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

// Access PushNotifications via Capacitor's plugin registry.
// @capacitor/push-notifications is NOT in package.json — we use registerPlugin
// directly from @capacitor/core, which routes calls to the native iOS/Android
// implementation installed via CocoaPods. On web this is a no-op.
const PushNotifications = registerPlugin('PushNotifications');

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform()) return;

    let listeners = [];

    const setup = async () => {
      try {
        const { receive } = await PushNotifications.requestPermissions();
        if (receive !== 'granted') return;

        await PushNotifications.register();

        const tokenListener = await PushNotifications.addListener(
          'registration',
          async ({ value: token }) => {
            await base44.entities.User.update(user.id, {
              push_token: token,
              push_platform: Capacitor.getPlatform(),
            }).catch(() => {});
          }
        );

        listeners = [tokenListener];
      } catch {
        // Native plugin not registered (simulator, old iOS) — silent no-op
      }
    };

    setup();

    return () => { listeners.forEach(l => l?.remove?.()); };
  }, [user?.id]);
}
