import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ServiGo Premium Email Template ──────────────────────────────────────────
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
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    if (!data) {
      console.log('No data in payload');
      return Response.json({ ok: true });
    }

    const entityName = event?.entity_name;
    const eventType = event?.type;

    // ── ServiceRequestV2 created ───────────────────────────────────────────────
    if (entityName === 'ServiceRequestV2' && eventType === 'create' && data.customer_email) {
      const scheduledStr = data.scheduled_date
        ? `<br/><strong>Date souhaitée :</strong> ${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}`
        : '';
      const urgentStr = data.is_urgent
        ? `<br/><span style="font-weight:700;color:#0F0F0F;">⚡ Demande urgente</span>`
        : '';

      const html = buildEmailHtml({
        title: 'Votre demande a bien été reçue',
        body: `
          <p>Bonjour ${data.customer_first_name || data.customer_name || ''},</p>
          <p>Nous avons bien reçu votre demande de service. Notre équipe recherche actuellement un professionnel disponible près de chez vous.</p>
          <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
            <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Récapitulatif</p>
            <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.8;">
              <strong>Service :</strong> ${data.category_name || 'Non précisé'}${scheduledStr}${urgentStr}
              ${data.customer_address ? `<br/><strong>Adresse :</strong> ${data.customer_address}` : ''}
              ${data.estimated_price ? `<br/><strong>Prix estimé :</strong> ${data.estimated_price} €` : ''}
            </p>
          </div>
          <p>Vous recevrez une notification dès qu'un professionnel accepte votre mission. Cela prend généralement moins de 30 minutes.</p>
          <p style="margin-top:28px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
        `,
        ctaText: 'Suivre ma demande',
        ctaUrl: 'https://servigo.be',
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'ServiGo',
        to: data.customer_email,
        subject: `Votre demande de ${data.category_name || 'service'} — confirmée`,
        body: html,
      });
      console.log(`Confirmation email sent to ${data.customer_email}`);
    }

    // ── ServiceRequestV2 accepted ──────────────────────────────────────────────
    if (entityName === 'ServiceRequestV2' && eventType === 'update' && data.status === 'accepted' && data.customer_email) {
      const html = buildEmailHtml({
        title: 'Un professionnel a accepté votre mission',
        body: `
          <p>Bonjour ${data.customer_first_name || data.customer_name || ''},</p>
          <p>Bonne nouvelle ! <strong>${data.professional_name || 'Un professionnel ServiGo'}</strong> a accepté votre demande de <strong>${data.category_name || 'service'}</strong>.</p>
          <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
            <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Votre professionnel</p>
            <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.8;">
              ${data.professional_name || 'Non communiqué'}
              ${data.scheduled_date ? `<br/><strong>Intervention prévue :</strong> ${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}` : ''}
            </p>
          </div>
          <p>Prochaine étape : vous allez recevoir un contrat à signer numériquement dans l'application avant l'intervention.</p>
          <p style="margin-top:28px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
        `,
        ctaText: 'Voir ma mission',
        ctaUrl: 'https://servigo.be',
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'ServiGo',
        to: data.customer_email,
        subject: `Mission acceptée — ${data.category_name || 'votre service'}`,
        body: html,
      });
      console.log(`Accepted email sent to ${data.customer_email}`);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('emailOnServiceRequest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});