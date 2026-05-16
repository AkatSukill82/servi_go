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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
  if (!isAdmin && !isScheduler) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowLabel = tomorrow.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });

  const missions = await base44.asServiceRole.entities.ServiceRequestV2.filter(
    { scheduled_date: tomorrowStr }, '-created_date', 200
  );
  const relevant = missions.filter(m =>
    ['accepted', 'contract_signed'].includes(m.status) && m.customer_email && m.professional_email
  );

  console.log(`Sending reminders for ${relevant.length} missions on ${tomorrowStr}`);

  let sent = 0;
  for (const mission of relevant) {
    const timeLabel = mission.scheduled_time || 'heure à confirmer';
    const customerName = mission.customer_first_name
      ? `${mission.customer_first_name} ${mission.customer_last_name || ''}`.trim()
      : mission.customer_name || 'le client';
    const proName = mission.professional_name || 'votre professionnel';

    // Email client
    const clientHtml = buildEmailHtml({
      title: `Rappel — votre intervention est demain`,
      body: `
        <p>Bonjour,</p>
        <p>Votre intervention <strong>${mission.category_name}</strong> est confirmée pour <strong>demain ${tomorrowLabel}</strong>.</p>
        ${infoBlock('Détails de l\'intervention', [
          `<strong>Professionnel :</strong> ${proName}`,
          `<strong>Date :</strong> ${tomorrowLabel} à ${timeLabel}`,
          `<strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}`,
        ].join('<br/>'))}
        <p>Pensez à être disponible à l'adresse indiquée.</p>
        <p style="margin-top:24px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `,
      ctaText: 'Voir ma mission',
      ctaUrl: 'https://servigo.be',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: mission.customer_email,
      subject: `Rappel — Intervention ${mission.category_name} demain`,
      body: clientHtml,
    }).catch(e => console.error('Email client error:', e.message));

    // Email pro
    const proHtml = buildEmailHtml({
      title: `Rappel — intervention demain`,
      body: `
        <p>Bonjour,</p>
        <p>Vous avez une intervention <strong>${mission.category_name}</strong> demain <strong>${tomorrowLabel}</strong>.</p>
        ${infoBlock('Détails de la mission', [
          `<strong>Client :</strong> ${customerName}`,
          `<strong>Date :</strong> ${tomorrowLabel} à ${timeLabel}`,
          `<strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}`,
          `<strong>Téléphone :</strong> ${mission.customer_phone || 'Non renseigné'}`,
        ].join('<br/>'))}
        <p>Bonne intervention !</p>
        <p style="margin-top:24px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `,
      ctaText: 'Voir la mission',
      ctaUrl: 'https://servigo.be',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: mission.professional_email,
      subject: `Rappel — Intervention demain chez ${customerName}`,
      body: proHtml,
    }).catch(e => console.error('Email pro error:', e.message));

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: mission.customer_email, recipient_type: 'particulier',
      type: 'mission_accepted',
      title: `Rappel — ${mission.category_name} demain à ${timeLabel}`,
      body: `${proName} interviendra demain à ${mission.customer_address || ''}`,
      request_id: mission.id, action_url: `/Chat?requestId=${mission.id}`,
    }).catch(() => {});

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: mission.professional_email, recipient_type: 'professionnel',
      type: 'mission_accepted',
      title: `Rappel — Intervention demain à ${timeLabel}`,
      body: `Chez ${customerName} — ${mission.customer_address || ''}`,
      request_id: mission.id, action_url: `/Chat?requestId=${mission.id}`,
    }).catch(() => {});

    sent++;
  }

  return Response.json({ ok: true, sent });
});