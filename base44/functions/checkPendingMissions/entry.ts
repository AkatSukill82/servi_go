import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduler (no user) or admin
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
  if (!isAdmin && !isScheduler) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = Date.now();
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // Get all pending_pro requests
  const pendingRequests = await base44.asServiceRole.entities.ServiceRequestV2.filter(
    { status: 'pending_pro' }, '-updated_date', 100
  );

  let reassigned = 0;
  let reverted = 0;

  for (const req_ of pendingRequests) {
    const updatedAt = req_.updated_date ? new Date(req_.updated_date).getTime() : 0;
    if (now - updatedAt < TIMEOUT_MS) continue; // Not timed out yet

    console.log(`Mission ${req_.id} timed out for pro ${req_.professional_email}`);

    // Add current pro to tried list
    const triedPros = Array.isArray(req_.tried_professionals) ? [...req_.tried_professionals] : [];
    if (req_.professional_email && !triedPros.includes(req_.professional_email)) {
      triedPros.push(req_.professional_email);
    }

    // Find next available pro
    const allPros = await base44.asServiceRole.entities.User.filter(
      { user_type: 'professionnel', available: true, verification_status: 'verified' },
      '-rating', 200
    );

    const categoryPros = allPros.filter(p =>
      p.email &&
      !triedPros.includes(p.email) &&
      (!req_.category_name || !p.category_name || p.category_name === req_.category_name)
    );

    // Sort by distance if coords available
    const clientLat = req_.customer_latitude || 50.8503;
    const clientLon = req_.customer_longitude || 4.3517;
    const MAX_RADIUS_KM = 30;

    const withDist = categoryPros.map(p => ({
      ...p,
      _dist: (p.latitude && p.longitude)
        ? haversine(clientLat, clientLon, p.latitude, p.longitude)
        : 9999,
    })).filter(p => p._dist <= MAX_RADIUS_KM || p._dist === 9999)
      .sort((a, b) => a._dist - b._dist);

    // Check subscriptions
    let nextPro = null;
    for (const candidate of withDist) {
      const subs = await base44.asServiceRole.entities.ProSubscription.filter(
        { professional_email: candidate.email }, '-created_date', 1
      );
      const sub = subs[0];
      if (sub && (sub.status === 'active' || sub.status === 'trial')) {
        nextPro = candidate;
        break;
      }
    }

    const traceNote = (req_.pro_notes || '') +
      `\n[${new Date().toISOString()}] Relance auto: ${req_.professional_email} n'a pas répondu (30 min).`;

    if (nextPro) {
      // Assign to next pro
      await base44.asServiceRole.entities.ServiceRequestV2.update(req_.id, {
        status: 'pending_pro',
        professional_id: nextPro.id,
        professional_name: `${nextPro.first_name || ''} ${nextPro.last_name || ''}`.trim() || nextPro.email,
        professional_email: nextPro.email,
        tried_professionals: triedPros,
        pro_notes: traceNote + ` → Relancé vers ${nextPro.email}`,
      });

      // Notify new pro
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: nextPro.email,
        recipient_type: 'professionnel',
        type: 'new_mission',
        title: `Nouvelle mission : ${req_.category_name}`,
        body: `${req_.customer_address || ''} · Acceptez dans les 30 min`,
        request_id: req_.id,
        action_url: `/ProAgenda`,
      });

      console.log(`Mission ${req_.id} reassigned to ${nextPro.email} (dist: ${nextPro._dist?.toFixed(1)}km)`);
      reassigned++;
    } else {
      // No pro available → revert to searching + notify client
      await base44.asServiceRole.entities.ServiceRequestV2.update(req_.id, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
        tried_professionals: triedPros,
        pro_notes: traceNote + ' → Aucun pro disponible, retour en recherche.',
      });

      if (req_.customer_email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: req_.customer_email,
          recipient_type: 'particulier',
          type: 'mission_refused',
          title: 'Recherche en cours…',
          body: `Aucun ${req_.category_name} disponible pour l'instant. Nous continuons la recherche.`,
          request_id: req_.id,
          action_url: `/Chat?requestId=${req_.id}`,
        });
      }

      console.log(`Mission ${req_.id} reverted to searching (all pros tried: ${triedPros.join(', ')})`);
      reverted++;
    }
  }

  return Response.json({ ok: true, processed: pendingRequests.length, reassigned, reverted });
});