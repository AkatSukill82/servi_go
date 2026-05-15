import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Web Push via web-push library
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { email, title, body, url } = await req.json();
    if (!email || !title) {
      return Response.json({ error: 'email and title required' }, { status: 400 });
    }

    const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@servigo.be';

    if (!vapidPublic || !vapidPrivate) {
      console.error('VAPID keys not configured');
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Fetch all active push tokens for this user
    const tokens = await base44.asServiceRole.entities.PushToken.filter({
      user_email: email,
      is_active: true,
    });

    if (!tokens.length) {
      console.log(`No push tokens found for ${email}`);
      return Response.json({ sent: 0, message: 'No tokens found' });
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    let sent = 0;
    const expiredIds = [];

    await Promise.all(tokens.map(async (token) => {
      try {
        // token.token stores the JSON-serialised PushSubscription object
        const subscription = JSON.parse(token.token);
        await webpush.sendNotification(subscription, payload);
        sent++;
        // Refresh last_used_at
        await base44.asServiceRole.entities.PushToken.update(token.id, {
          last_used_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Push failed for token ${token.id}:`, err.statusCode, err.message);
        // 404/410 = subscription expired
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredIds.push(token.id);
        }
      }
    }));

    // Deactivate expired tokens
    if (expiredIds.length) {
      await Promise.all(expiredIds.map(id =>
        base44.asServiceRole.entities.PushToken.update(id, { is_active: false })
      ));
      console.log(`Deactivated ${expiredIds.length} expired tokens`);
    }

    console.log(`Push sent to ${email}: ${sent}/${tokens.length} tokens`);
    return Response.json({ sent, total: tokens.length });

  } catch (error) {
    console.error('sendPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});