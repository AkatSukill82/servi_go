import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscription, platform = 'web', deviceName } = await req.json();
    if (!subscription) return Response.json({ error: 'subscription required' }, { status: 400 });

    const tokenStr = typeof subscription === 'string' ? subscription : JSON.stringify(subscription);
    const endpoint = typeof subscription === 'object' ? subscription.endpoint : JSON.parse(subscription).endpoint;

    // Check if token already exists (by endpoint) to avoid duplicates
    const existing = await base44.asServiceRole.entities.PushToken.filter({ user_email: user.email });
    const found = existing.find(t => {
      try {
        const parsed = JSON.parse(t.token);
        return parsed.endpoint === endpoint;
      } catch { return false; }
    });

    if (found) {
      // Update and reactivate if needed
      await base44.asServiceRole.entities.PushToken.update(found.id, {
        is_active: true,
        last_used_at: new Date().toISOString(),
        token: tokenStr,
      });
      return Response.json({ status: 'updated', id: found.id });
    }

    // Create new token
    const created = await base44.asServiceRole.entities.PushToken.create({
      user_email: user.email,
      token: tokenStr,
      platform,
      device_name: deviceName || `Appareil ${platform}`,
      is_active: true,
      last_used_at: new Date().toISOString(),
    });

    console.log(`Push token saved for ${user.email} (${platform})`);
    return Response.json({ status: 'created', id: created.id });

  } catch (error) {
    console.error('savePushToken error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});