import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { requestId } = body;

    if (!requestId) {
      return Response.json({ error: 'requestId requis' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
    const request = requests[0];
    if (!request) {
      return Response.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (!['searching', 'pending_pro'].includes(request.status)) {
      return Response.json({ message: 'Demande déjà assignée', status: request.status });
    }

    const triedPros = request.tried_professionals || [];
    const customerLat = request.customer_latitude;
    const customerLon = request.customer_longitude;

    const allPros = await base44.asServiceRole.entities.User.filter({
      user_type: 'professionnel',
      category_name: request.category_name,
      available: true,
      verification_status: 'verified',
    });

    // Filter out already tried pros
    let candidates = allPros.filter(p => !triedPros.includes(p.email));

    // Filter and sort by distance if coordinates are available
    if (customerLat && customerLon) {
      candidates = candidates
        .map(p => ({
          ...p,
          _distance: (p.latitude && p.longitude)
            ? calculateDistance(customerLat, customerLon, p.latitude, p.longitude)
            : 9999,
        }))
        .filter(p => p._distance <= 30) // Max 30 km
        .sort((a, b) => a._distance - b._distance);

      console.log(`Candidates within 30km: ${candidates.length}`);
      candidates.forEach(p => console.log(`  ${p.full_name}: ${p._distance.toFixed(1)} km`));
    } else {
      // Fallback: sort by rating
      candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (candidates.length === 0) {
      console.log(`No available pros for category: ${request.category_name}`);
      return Response.json({ 
        message: 'Aucun professionnel disponible dans un rayon de 30 km',
        status: 'searching'
      });
    }

    // Check subscription for each candidate in order
    let chosenPro = null;
    const newTried = [...triedPros];

    for (const pro of candidates) {
      const subs = await base44.asServiceRole.entities.ProSubscription.filter({
        professional_email: pro.email,
      });
      const activeSub = subs.find(s => ['active', 'trial'].includes(s.status));
      newTried.push(pro.email);
      if (activeSub) {
        chosenPro = pro;
        break;
      }
      console.log(`Pro ${pro.email} has no active subscription, skipping.`);
    }

    if (!chosenPro) {
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
        status: 'searching',
        professional_id: null,
        professional_name: null,
        professional_email: null,
        tried_professionals: newTried,
      });
      return Response.json({ message: 'Aucun pro avec abonnement actif dans la zone', status: 'searching' });
    }

    const distanceInfo = chosenPro._distance && chosenPro._distance < 9999
      ? ` (à ${chosenPro._distance.toFixed(1)} km)`
      : '';

    console.log(`Assigning ${chosenPro.full_name}${distanceInfo} to request ${requestId}`);

    await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
      status: 'pending_pro',
      professional_id: chosenPro.id,
      professional_name: chosenPro.full_name,
      professional_email: chosenPro.email,
      tried_professionals: newTried,
    });

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: chosenPro.email,
      recipient_type: 'professionnel',
      type: 'new_mission',
      title: `Nouvelle mission — ${request.category_name}`,
      body: `Demande de ${request.customer_name || 'un client'} à ${request.customer_address || 'adresse non précisée'}${distanceInfo}`,
      request_id: requestId,
      action_url: `/Chat?requestId=${requestId}`,
    });

    return Response.json({ 
      assigned: chosenPro.full_name, 
      email: chosenPro.email,
      distance_km: chosenPro._distance ? parseFloat(chosenPro._distance.toFixed(1)) : null,
      requestId 
    });

  } catch (error) {
    console.error('autoAssignProfessional error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});