import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const key = Deno.env.get('VAPID_PUBLIC_KEY');
    if (!key) return Response.json({ error: 'VAPID not configured' }, { status: 500 });

    return Response.json({ vapidPublicKey: key });
  } catch (error) {
    console.error('getVapidPublicKey error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});