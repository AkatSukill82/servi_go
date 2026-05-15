import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { requestId } = await req.json();
    if (!requestId) return Response.json({ error: 'requestId required' }, { status: 400 });

    // 1. Fetch the request
    const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
    const request = requests[0];
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (!['searching', 'pending_pro'].includes(request.status)) {
      return Response.json({ message: `Request status is '${request.status}', skipping` });
    }

    const triedEmails = new Set(request.tried_professionals || []);

    // 2. Get matching professionals
    const allPros = await base44.asServiceRole.entities.User.filter({
      user_type: 'professionnel',
      category_name: request.category_name,
      available: true,
      verification_status: 'verified',
    }, '-rating', 200);

    const candidates = allPros.filter(p => p.email && !triedEmails.has(p.email));

    // 3. Fetch ALL subscriptions in one call, build active set
    const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 500);
    const activeEmails = new Set(
      allSubs
        .filter(s => s.status === 'active' || s.status === 'trial')
        .map(s => s.professional_email)
    );

    // 3b. Fetch verified identity checks — only pros with approved eID can receive missions
    const approvedVerifs = await base44.asServiceRole.entities.IdentityVerification.filter(
      { status: 'approved' }, '-created_date', 500
    );
    const verifiedEmails = new Set(approvedVerifs.map(v => v.user_email));

    // 4. Filter to active subscribers WITH approved eID, sort by rating desc
    const eligible = candidates
      .filter(p => activeEmails.has(p.email) && verifiedEmails.has(p.email))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 5. No eligible candidates (hard stop)
    if (eligible.length === 0) {
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
      });
      return Response.json({ message: 'All eligible professionals have been tried. Resetting to searching.' });
    }

    // 6. Hard stop check: if tried_professionals covers all eligible candidates, stop
    const allEligibleCount = allPros.filter(p => activeEmails.has(p.email)).length;
    if (triedEmails.size >= allEligibleCount) {
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
      });
      return Response.json({ message: 'All eligible candidates exhausted. Resetting to searching.' });
    }

    // 7. Assign best candidate with deduplicated tried_professionals
    const pro = eligible[0];
    const updatedTriedPros = [...new Set([...(request.tried_professionals || []), pro.email])];

    await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
      status: 'pending_pro',
      professional_id: pro.id,
      professional_name: pro.full_name,
      professional_email: pro.email,
      tried_professionals: updatedTriedPros,
    });

    // 8. Notify assigned pro (in-app)
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: pro.email,
      recipient_type: 'professionnel',
      type: 'new_mission',
      title: `Nouvelle mission — ${request.category_name}`,
      body: request.customer_address || '',
      request_id: requestId,
      action_url: '/ProDashboard',
    });

    // 8b. Send push notification (fire-and-forget)
    base44.asServiceRole.functions.invoke('sendPushNotification', {
      email: pro.email,
      title: `🔔 Nouvelle mission — ${request.category_name}`,
      body: request.customer_address
        ? `📍 ${request.customer_address}`
        : 'Une nouvelle demande vous attend sur ServiGo',
      url: '/ProDashboard',
    }).catch(err => console.warn('Push notification skipped:', err.message));

    // 9. Return result
    return Response.json({ assigned: pro.full_name, email: pro.email, requestId });

  } catch (error) {
    console.error('autoAssignProfessional error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});