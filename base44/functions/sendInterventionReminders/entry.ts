import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduler or admin
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
  if (!isAdmin && !isScheduler) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Tomorrow's date (YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get all missions scheduled for tomorrow with relevant statuses
  const missions = await base44.asServiceRole.entities.ServiceRequestV2.filter(
    { scheduled_date: tomorrowStr }, '-created_date', 200
  );

  const relevant = missions.filter(m =>
    ['accepted', 'contract_signed'].includes(m.status) &&
    m.customer_email && m.professional_email
  );

  console.log(`Sending reminders for ${relevant.length} missions on ${tomorrowStr}`);

  let sent = 0;
  for (const mission of relevant) {
    const dateLabel = tomorrowStr;
    const timeLabel = mission.scheduled_time || 'heure à confirmer';
    const customerName = mission.customer_first_name
      ? `${mission.customer_first_name} ${mission.customer_last_name || ''}`.trim()
      : mission.customer_name || 'le client';
    const proName = mission.professional_name || 'votre professionnel';

    // Email to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: mission.customer_email,
      subject: `⏰ Rappel — Intervention ${mission.category_name} demain`,
      body: `Bonjour,\n\nVotre intervention ${mission.category_name} est prévue demain le ${dateLabel} à ${timeLabel} avec ${proName}.\n\nAdresse : ${mission.customer_address || 'à confirmer'}\n\nPensez à être disponible à l'adresse indiquée.\n\nL'équipe ServiGo`,
    }).catch(e => console.error('Email client error:', e.message));

    // Email to pro
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: mission.professional_email,
      subject: `⏰ Rappel — Intervention demain chez ${customerName}`,
      body: `Bonjour,\n\nVous avez une intervention ${mission.category_name} demain le ${dateLabel} à ${timeLabel} chez ${customerName}.\n\nAdresse : ${mission.customer_address || 'à confirmer'}\nTéléphone client : ${mission.customer_phone || 'non renseigné'}\n\nBonne intervention !\nL'équipe ServiGo`,
    }).catch(e => console.error('Email pro error:', e.message));

    // In-app notification to client
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: mission.customer_email,
      recipient_type: 'particulier',
      type: 'mission_accepted',
      title: `⏰ Rappel — ${mission.category_name} demain à ${timeLabel}`,
      body: `${proName} interviendra demain à ${mission.customer_address || ''}`,
      request_id: mission.id,
      action_url: `/Chat?requestId=${mission.id}`,
    }).catch(() => {});

    // In-app notification to pro
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: mission.professional_email,
      recipient_type: 'professionnel',
      type: 'mission_accepted',
      title: `⏰ Rappel — Intervention demain à ${timeLabel}`,
      body: `Chez ${customerName} — ${mission.customer_address || ''}`,
      request_id: mission.id,
      action_url: `/Chat?requestId=${mission.id}`,
    }).catch(() => {});

    sent++;
  }

  return Response.json({ ok: true, sent });
});