import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { requestId } = await req.json();

    if (!requestId) {
      return Response.json({ error: 'requestId requis' }, { status: 400 });
    }

    // 1. Fetch the request
    const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
    const request = requests[0];
    if (!request) return Response.json({ error: 'Demande introuvable' }, { status: 404 });
    if (!['searching', 'pending_pro'].includes(request.status)) {
      return Response.json({ message: `Statut incompatible: ${request.status}` });
    }

    // 2. Get matching professionals, exclude already tried
    const triedEmails = new Set(request.tried_professionals || []);
    const candidates = await base44.asServiceRole.entities.User.filter({
      user_type: 'professionnel',
      category_name: request.category_name,
      available: true,
      verification_status: 'verified',
    }, '-rating', 200);
    const filtered = candidates.filter(p => p.email && !triedEmails.has(p.email));

    // 3. Fetch all ProSubscriptions in one call, build active set
    const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 500);
    const activeEmails = new Set(
      allSubs.filter(s => ['active', 'trial'].includes(s.status)).map(s => s.professional_email)
    );

    // 4. Filter to active subscribers, sort by rating desc
    const eligible = filtered
      .filter(p => activeEmails.has(p.email))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 5. No eligible candidates
    if (eligible.length === 0) {
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
      });
      return Response.json({ message: 'Aucun professionnel avec abonnement actif' });
    }

    // 6. Assign best candidate
    const pro = eligible[0];
    const updatedTried = [...(request.tried_professionals || []), pro.email];
    await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
      status: 'pending_pro',
      professional_id: pro.id,
      professional_name: pro.full_name,
      professional_email: pro.email,
      tried_professionals: updatedTried,
    });

    // 7. Notify assigned pro
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: pro.email,
      recipient_type: 'professionnel',
      type: 'new_mission',
      title: `Nouvelle mission — ${request.category_name}`,
      body: request.customer_address || '',
      request_id: requestId,
      action_url: '/ProDashboard',
    });

    // 8. Return result
    return Response.json({ assigned: pro.full_name, email: pro.email, requestId });
  } catch (error) {
    console.error('autoAssignProfessional error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});