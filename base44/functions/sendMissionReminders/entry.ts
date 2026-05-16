import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildEmailHtml({ title, body, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400;600;700;800&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#EBEBEB;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EBEBEB;padding:48px 16px 56px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#0F0F0F;border-radius:20px 20px 0 0;padding:36px 40px 32px;text-align:center;">
            <div style="margin-bottom:6px;">
              <span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:34px;font-weight:800;color:#FFFFFF;letter-spacing:-1.5px;">Servi</span><span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:-1.5px;background:#FFFFFF;color:#0F0F0F;padding:2px 8px;border-radius:6px;margin-left:2px;">Go</span>
            </div>
            <p style="margin:10px 0 0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;">Services à domicile · Belgique</p>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:40px 40px 36px;border-left:1px solid #E0E0E0;border-right:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;border-radius:0 0 20px 20px;">
            <h1 style="margin:0 0 18px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#0F0F0F;line-height:1.2;letter-spacing:-0.5px;">${title}</h1>
            <div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#444444;line-height:1.8;">${body}</div>
            ${ctaText && ctaUrl ? `<div style="margin-top:36px;"><a href="${ctaUrl}" style="display:block;background:#0F0F0F;color:#FFFFFF;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;padding:18px 32px;border-radius:12px;text-decoration:none;text-align:center;">${ctaText} &nbsp;→</a></div>` : ''}
            <div style="height:1px;background:#F0F0F0;margin:32px 0 24px;"></div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><p style="margin:0 0 4px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;color:#0F0F0F;">ServiGo</p><p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#AAAAAA;"><a href="mailto:contact@servigo.be" style="color:#AAAAAA;text-decoration:none;">contact@servigo.be</a> · <a href="https://servigo.be" style="color:#AAAAAA;text-decoration:none;">servigo.be</a></p></td>
                <td style="text-align:right;vertical-align:top;"><p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:10px;color:#CCCCCC;line-height:1.8;"><a href="https://servigo.be/confidentialite" style="color:#CCCCCC;text-decoration:underline;">Confidentialité</a><br/><a href="https://servigo.be/cgu" style="color:#CCCCCC;text-decoration:underline;">CGU</a> · <a href="https://servigo.be/confidentialite" style="color:#CCCCCC;text-decoration:underline;">Se désinscrire</a></p></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoBlock(label, contentHtml) {
  return `<div style="background:#F5F5F5;border-radius:12px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">${label ? `<p style="margin:0 0 8px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:#0F0F0F;text-transform:uppercase;letter-spacing:1px;">${label}</p>` : ''}<div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;line-height:1.8;">${contentHtml}</div></div>`;
}

async function sendProReminder(base44, mission, reminderType) {
  const timeLabel = mission.scheduled_time || 'heure à confirmer';
  const customerName = mission.customer_first_name
    ? `${mission.customer_first_name} ${mission.customer_last_name || ''}`.trim()
    : mission.customer_name || 'le client';

  let subject = '';
  let body = '';

  if (reminderType === 'oneday') {
    subject = `Rappel — Mission confirmée pour demain`;
    body = `
      <p>Bonjour,</p>
      <p>Vous avez une intervention <strong>${mission.category_name}</strong> confirmée pour <strong>demain</strong>.</p>
      ${infoBlock('Détails de la mission', [
        `<strong>Client :</strong> ${customerName}`,
        `<strong>Heure :</strong> ${timeLabel}`,
        `<strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}`,
        `<strong>Téléphone :</strong> ${mission.customer_phone || 'Non renseigné'}`,
      ].join('<br/>'))}
      <p>Pensez à préparer votre matériel et vérifier votre itinéraire.</p>
      <p style="margin-top:24px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
    `;
  } else if (reminderType === 'morning') {
    subject = `✨ Mission aujourd'hui à ${timeLabel}`;
    body = `
      <p>Bonjour,</p>
      <p>Vous avez une intervention <strong>${mission.category_name}</strong> <strong>aujourd'hui à ${timeLabel}</strong>.</p>
      ${infoBlock('Détails de la mission', [
        `<strong>Client :</strong> ${customerName}`,
        `<strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}`,
        `<strong>Téléphone :</strong> ${mission.customer_phone || 'Non renseigné'}`,
      ].join('<br/>'))}
      <p>Vérifiez votre itinéraire et partez à temps.</p>
      <p style="margin-top:24px;">Bonne intervention !<br/><strong>L'équipe ServiGo</strong></p>
    `;
  } else if (reminderType === 'threehours') {
    subject = `⏰ Départ dans 3 heures — ${mission.category_name}`;
    body = `
      <p>Bonjour,</p>
      <p>Vous avez une intervention <strong>${mission.category_name}</strong> dans <strong>3 heures</strong> à <strong>${timeLabel}</strong>.</p>
      ${infoBlock('Derniers détails', [
        `<strong>Client :</strong> ${customerName}`,
        `<strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}`,
        `<strong>Téléphone :</strong> ${mission.customer_phone || 'Non renseigné'}`,
      ].join('<br/>'))}
      <p>Préparez votre véhicule et vérifiez votre GPS.</p>
      <p style="margin-top:24px;">À bientôt !<br/><strong>L'équipe ServiGo</strong></p>
    `;
  }

  const html = buildEmailHtml({
    title: subject,
    body,
    ctaText: 'Voir la mission',
    ctaUrl: 'https://servigo.be',
  });

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: 'ServiGo',
    to: mission.professional_email,
    subject,
    body: html,
  }).catch(e => console.error(`Email ${reminderType} error:`, e.message));

  // Notification in-app
  const notifTypes = { oneday: 'mission_reminder_1day', morning: 'mission_reminder_morning', threehours: 'mission_reminder_3hours' };
  const notifBodies = {
    oneday: `Intervention demain à ${timeLabel}`,
    morning: `Intervention aujourd'hui à ${timeLabel}`,
    threehours: `Départ dans 3 heures`
  };

  await base44.asServiceRole.entities.Notification.create({
    recipient_email: mission.professional_email,
    recipient_type: 'professionnel',
    type: notifTypes[reminderType],
    title: `Rappel — ${mission.category_name}`,
    body: notifBodies[reminderType],
    request_id: mission.id,
    action_url: `/ProAgenda?missionId=${mission.id}`,
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch {}

    const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
    if (!isAdmin && !isScheduler) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    
    // Timezone: Europe/Brussels (UTC+2 en été, UTC+1 en hiver)
    const bxlOffset = now.getTimezoneOffset();
    const adjustedNow = new Date(now.getTime() - bxlOffset * 60000);

    const results = { oneday: 0, morning: 0, threehours: 0 };

    // ── 1. Missions pour DEMAIN (1 jour avant) — lancer une fois par jour (ex: 10h)
    const tomorrow = new Date(adjustedNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const missionsOneDay = await base44.asServiceRole.entities.ServiceRequestV2.filter(
      { scheduled_date: tomorrowStr },
      '-created_date',
      500
    );
    const relevantOneDay = missionsOneDay.filter(m =>
      ['accepted', 'contract_signed'].includes(m.status) && m.professional_email
    );
    for (const mission of relevantOneDay) {
      await sendProReminder(base44, mission, 'oneday');
      results.oneday++;
    }

    // ── 2. Missions pour AUJOURD'HUI (matin) — lancer à 08h
    const todayStr = adjustedNow.toISOString().split('T')[0];
    const missionsMorning = await base44.asServiceRole.entities.ServiceRequestV2.filter(
      { scheduled_date: todayStr },
      '-created_date',
      500
    );
    const relevantMorning = missionsMorning.filter(m =>
      ['accepted', 'contract_signed'].includes(m.status) && m.professional_email
    );
    for (const mission of relevantMorning) {
      await sendProReminder(base44, mission, 'morning');
      results.morning++;
    }

    // ── 3. Missions pour AUJOURD'HUI (3h avant) — lancer à 12h si mission à 15h
    // Récupère missions d'aujourd'hui avec heure >= maintenant + 3h
    const threeHoursLater = new Date(adjustedNow.getTime() + 3 * 60 * 60 * 1000);
    const threeHoursMissionStr = threeHoursLater.toISOString().split('T')[0];
    const threeHoursTimeStr = threeHoursLater.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    const missionsThreeHours = await base44.asServiceRole.entities.ServiceRequestV2.filter(
      { scheduled_date: todayStr },
      '-created_date',
      500
    );
    const relevantThreeHours = missionsThreeHours.filter(m => {
      if (!['accepted', 'contract_signed'].includes(m.status) || !m.professional_email) return false;
      if (!m.scheduled_time) return false;
      // Check si mission entre 'now + 3h' et 'now + 4h'
      const [mHour, mMin] = m.scheduled_time.split(':').map(Number);
      const [curHour, curMin] = adjustedNow.toTimeString().split(' ')[0].substring(0, 5).split(':').map(Number);
      const curTotalMin = curHour * 60 + curMin;
      const mTotalMin = mHour * 60 + mMin;
      const targetMin = curTotalMin + (3 * 60); // 3h from now
      return mTotalMin >= targetMin && mTotalMin < targetMin + 60;
    });
    
    for (const mission of relevantThreeHours) {
      await sendProReminder(base44, mission, 'threehours');
      results.threehours++;
    }

    console.log(`Mission reminders sent — 1day: ${results.oneday}, morning: ${results.morning}, 3h: ${results.threehours}`);

    return Response.json({ ok: true, ...results });
  } catch (error) {
    console.error('sendMissionReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});