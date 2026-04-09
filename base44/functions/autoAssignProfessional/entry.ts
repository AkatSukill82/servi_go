import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { requestId } = await req.json();

  if (!requestId) {
    return Response.json({ error: 'requestId required' }, { status: 400 });
  }

  // 1. Fetch the service request
  const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
  const request = requests[0];
  if (!request) {
    return Response.json({ error: 'Request not found' }, { status: 404 });
  }

  if (!['searching', 'pending_pro'].includes(request.status)) {
    return Response.json({ message: `Skipped — status is ${request.status}`, requestId });
  }

  const { category_name, customer_address, tried_professionals = [] } = request;
  const triedSet = new Set(tried_professionals);

  // 2. Get all matching verified, available professionals not yet tried
  const allPros = await base44.asServiceRole.entities.User.filter({
    user_type: 'professionnel',
    category_name,
    available: true,
    verification_status: 'verified',
  }, '-rating', 200);

  const candidates = allPros.filter(p => p.email && !triedSet.has(p.email));

  // 3. Fetch all subscriptions in one call, build active email Set
  const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 500);
  const activeEmails = new Set(
    allSubs.filter(s => s.status === 'active' || s.status === 'trial').map(s => s.professional_email)
  );

  // 4. Filter to active subscribers, sort by rating desc
  const eligible = candidates
    .filter(p => activeEmails.has(p.email))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // 5. No eligible candidates → revert to searching
  if (eligible.length === 0) {
    await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
      status: 'searching',
      professional_id: null,
      professional_name: null,
      professional_email: null,
    });
    return Response.json({ message: 'Aucun professionnel avec abonnement actif', requestId });
  }

  // 6. Assign best candidate
  const pro = eligible[0];
  await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
    status: 'pending_pro',
    professional_id: pro.id,
    professional_name: pro.full_name,
    professional_email: pro.email,
    tried_professionals: [...tried_professionals, pro.email],
  });

  // 7. Notify the assigned pro
  await base44.asServiceRole.entities.Notification.create({
    recipient_email: pro.email,
    recipient_type: 'professionnel',
    type: 'new_mission',
    title: `Nouvelle mission — ${category_name}`,
    body: customer_address || 'Adresse non précisée',
    request_id: requestId,
    action_url: '/ProDashboard',
  });

  // 8. Return result
  return Response.json({ assigned: pro.full_name, email: pro.email, requestId });
});