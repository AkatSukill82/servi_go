import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { requestId } = body;

    if (!requestId) {
      return Response.json({ error: 'requestId requis' }, { status: 400 });
    }

    // Get the service request
    const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
    const request = requests[0];
    if (!request) {
      return Response.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (!['searching', 'pending_pro'].includes(request.status)) {
      return Response.json({ message: 'Demande déjà assignée', status: request.status });
    }

    const triedPros = request.tried_professionals || [];

    // Find available verified professionals matching category
    const allPros = await base44.asServiceRole.entities.User.filter({
      user_type: 'professionnel',
      category_name: request.category_name,
      available: true,
      verification_status: 'verified',
    });

    // Filter out already tried pros
    const candidates = allPros.filter(p => !triedPros.includes(p.email));

    if (candidates.length === 0) {
      console.log(`No available pros for category: ${request.category_name}`);
      // Keep searching status, notify client
      return Response.json({ 
        message: 'Aucun professionnel disponible pour le moment',
        status: 'searching'
      });
    }

    // Sort by rating descending, pick best
    candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const bestPro = candidates[0];

    console.log(`Assigning ${bestPro.full_name} (${bestPro.email}) to request ${requestId}`);

    // Update request
    await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
      status: 'pending_pro',
      professional_id: bestPro.id,
      professional_name: bestPro.full_name,
      professional_email: bestPro.email,
      tried_professionals: [...triedPros, bestPro.email],
    });

    // Check if pro has active subscription
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({
      professional_email: bestPro.email,
    });
    const activeSub = subs.find(s => ['active', 'trial'].includes(s.status));

    if (!activeSub) {
      console.log(`Pro ${bestPro.email} has no active subscription, trying next...`);
      // Mark this pro as tried and recurse to next
      const nextCandidates = candidates.slice(1);
      if (nextCandidates.length === 0) {
        await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
          status: 'searching',
          professional_id: null,
          professional_name: null,
          professional_email: null,
        });
        return Response.json({ message: 'Aucun pro avec abonnement actif', status: 'searching' });
      }
      // Try next pro
      const nextPro = nextCandidates[0];
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
        status: 'pending_pro',
        professional_id: nextPro.id,
        professional_name: nextPro.full_name,
        professional_email: nextPro.email,
        tried_professionals: [...triedPros, bestPro.email, nextPro.email],
      });
      // Notify next pro
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: nextPro.email,
        recipient_type: 'professionnel',
        type: 'new_mission',
        title: `Nouvelle mission — ${request.category_name}`,
        body: `Demande de ${request.customer_name || 'un client'} à ${request.customer_address || 'adresse non précisée'}`,
        request_id: requestId,
        action_url: '/ProDashboard',
      });
      return Response.json({ assigned: nextPro.full_name, email: nextPro.email });
    }

    // Notify the assigned pro
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: bestPro.email,
      recipient_type: 'professionnel',
      type: 'new_mission',
      title: `Nouvelle mission — ${request.category_name}`,
      body: `Demande de ${request.customer_name || 'un client'} à ${request.customer_address || 'adresse non précisée'}`,
      request_id: requestId,
      action_url: '/ProDashboard',
    });

    console.log(`Successfully assigned ${bestPro.full_name} to request ${requestId}`);
    return Response.json({ 
      assigned: bestPro.full_name, 
      email: bestPro.email,
      requestId 
    });

  } catch (error) {
    console.error('autoAssignProfessional error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});