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
<body style="margin:0;padding:0;background:#F2F2F2;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F2;padding:40px 16px 48px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr>
          <td style="background:#0F0F0F;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <div style="display:inline-block;">
              <span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:800;color:#FFFFFF;letter-spacing:-1px;">Servi</span><span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:800;background:#FFFFFF;color:#0F0F0F;padding:0 6px;border-radius:4px;margin-left:1px;letter-spacing:-1px;">Go</span>
            </div>
            <p style="margin:8px 0 0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.5px;text-transform:uppercase;">Services à domicile en Belgique</p>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:40px 40px 32px;border-left:1px solid #E5E5E5;border-right:1px solid #E5E5E5;">
            <h1 style="margin:0 0 20px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:#0F0F0F;line-height:1.25;letter-spacing:-0.3px;">${title}</h1>
            <div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:15px;color:#3D3D3D;line-height:1.75;">${body}</div>
            ${ctaText && ctaUrl ? `<div style="margin-top:36px;text-align:center;"><a href="${ctaUrl}" style="display:inline-block;background:#0F0F0F;color:#FFFFFF;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;text-decoration:none;">${ctaText} →</a></div>` : ''}
          </td>
        </tr>
        <tr><td style="background:#FFFFFF;padding:0 40px;border-left:1px solid #E5E5E5;border-right:1px solid #E5E5E5;"><div style="height:1px;background:#F0F0F0;"></div></td></tr>
        <tr>
          <td style="background:#FFFFFF;border:1px solid #E5E5E5;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:600;color:#0F0F0F;">ServiGo</p>
            <p style="margin:0 0 12px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8C8C8C;line-height:1.6;">Votre plateforme de services à domicile en Belgique<br/><a href="mailto:contact@servigo.be" style="color:#8C8C8C;text-decoration:none;">contact@servigo.be</a></p>
            <p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#BBBBBB;"><a href="https://servigo.be/confidentialite" style="color:#BBBBBB;text-decoration:underline;">Politique de confidentialité</a>&nbsp;·&nbsp;<a href="https://servigo.be/cgu" style="color:#BBBBBB;text-decoration:underline;">CGU</a>&nbsp;·&nbsp;<a href="https://servigo.be/confidentialite" style="color:#BBBBBB;text-decoration:underline;">Se désinscrire</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
  if (!isAdmin && !isScheduler) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowLabel = tomorrow.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });

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
    const timeLabel = mission.scheduled_time || 'heure à confirmer';
    const customerName = mission.customer_first_name
      ? `${mission.customer_first_name} ${mission.customer_last_name || ''}`.trim()
      : mission.customer_name || 'le client';
    const proName = mission.professional_name || 'votre professionnel';

    // Email client
    const clientHtml = buildEmailHtml({
      title: `Rappel — Intervention ${mission.category_name} demain`,
      body: `
        <p>Bonjour,</p>
        <p>Votre intervention est prévue <strong>demain ${tomorrowLabel}</strong> à <strong>${timeLabel}</strong> avec <strong>${proName}</strong>.</p>
        <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
          <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Détails</p>
          <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.8;">
            <strong>Service :</strong> ${mission.category_name}<br/>
            <strong>Date :</strong> ${tomorrowLabel} à ${timeLabel}<br/>
            <strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}
          </p>
        </div>
        <p>Pensez à être disponible à l'adresse indiquée.</p>
        <p style="margin-top:28px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
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
      title: `Rappel — Intervention demain chez ${customerName}`,
      body: `
        <p>Bonjour,</p>
        <p>Vous avez une intervention <strong>${mission.category_name}</strong> demain <strong>${tomorrowLabel}</strong> à <strong>${timeLabel}</strong>.</p>
        <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
          <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Détails de la mission</p>
          <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.8;">
            <strong>Client :</strong> ${customerName}<br/>
            <strong>Date :</strong> ${tomorrowLabel} à ${timeLabel}<br/>
            <strong>Adresse :</strong> ${mission.customer_address || 'À confirmer'}<br/>
            <strong>Téléphone :</strong> ${mission.customer_phone || 'Non renseigné'}
          </p>
        </div>
        <p>Bonne intervention !</p>
        <p style="margin-top:28px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
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

    // In-app notifications (inchangées)
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