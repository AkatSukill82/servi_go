import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildEmailHtml({ title, body, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F4F7FB;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#1A365D;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">ServiGo</span><br/>
            <span style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;display:inline-block;">Votre plateforme de services à domicile</span>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:32px 32px 24px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1A365D;">${title}</h2>
            <div style="font-size:15px;color:#4A5568;line-height:1.7;">${body}</div>
            ${ctaText && ctaUrl ? `<div style="margin-top:28px;text-align:center;"><a href="${ctaUrl}" style="display:inline-block;background:#1A365D;color:#FFFFFF;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">${ctaText}</a></div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#718096;font-weight:600;">ServiGo — Votre plateforme de services à domicile en Belgique</p>
            <p style="margin:0;font-size:12px;color:#A0AEC0;"><a href="mailto:contact@servigo.be" style="color:#A0AEC0;text-decoration:underline;">contact@servigo.be</a>&nbsp;·&nbsp;<a href="https://servigo.be/confidentialite" style="color:#A0AEC0;text-decoration:underline;">Se désinscrire</a></p>
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

    // ── ServiceRequestV2 created (status: searching) ──────────────────────────
    if (entityName === 'ServiceRequestV2' && eventType === 'create' && data.customer_email) {
      const scheduledStr = data.scheduled_date
        ? `<br/><strong>Date souhaitée :</strong> ${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}`
        : '';
      const urgentStr = data.is_urgent
        ? `<br/><span style="color:#E53E3E;font-weight:600;">⚡ Demande urgente</span>`
        : '';

      const html = buildEmailHtml({
        title: '✅ Votre demande a bien été reçue !',
        body: `
          <p>Bonjour ${data.customer_first_name || data.customer_name || ''},</p>
          <p>Nous avons bien reçu votre demande de service. Notre équipe recherche actuellement un professionnel disponible près de chez vous.</p>
          <div style="background:#F8FAFC;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #1A365D;">
            <strong>Récapitulatif de votre demande :</strong><br/>
            <strong>Service :</strong> ${data.category_name || 'Non précisé'}${scheduledStr}${urgentStr}
            ${data.customer_address ? `<br/><strong>Adresse :</strong> ${data.customer_address}` : ''}
            ${data.estimated_price ? `<br/><strong>Prix estimé :</strong> ${data.estimated_price} €` : ''}
          </div>
          <p>Vous recevrez une notification dès qu'un professionnel accepte votre mission. Cela prend généralement moins de 30 minutes.</p>
          <p>Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
        `,
        ctaText: 'Suivre ma demande',
        ctaUrl: 'https://servigo.be',
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'ServiGo',
        to: data.customer_email,
        subject: `✅ Demande reçue — ${data.category_name || 'Service'}`,
        body: html,
      });
      console.log(`Confirmation email sent to ${data.customer_email}`);
    }

    // ── ServiceRequestV2 updated to "accepted" ────────────────────────────────
    if (entityName === 'ServiceRequestV2' && eventType === 'update' && data.status === 'accepted' && data.customer_email) {
      const html = buildEmailHtml({
        title: '🎉 Un professionnel a accepté votre mission !',
        body: `
          <p>Bonjour ${data.customer_first_name || data.customer_name || ''},</p>
          <p>Bonne nouvelle ! <strong>${data.professional_name || 'Un professionnel ServiGo'}</strong> a accepté votre demande de <strong>${data.category_name || 'service'}</strong>.</p>
          <div style="background:#F0FFF4;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #38A169;">
            <strong>Votre professionnel :</strong><br/>
            ${data.professional_name || 'Non communiqué'}
            ${data.scheduled_date ? `<br/><strong>Intervention prévue :</strong> ${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}` : ''}
          </div>
          <p>Prochaine étape : vous allez recevoir un contrat à signer numériquement dans l'application avant l'intervention.</p>
          <p>Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
        `,
        ctaText: 'Voir ma mission',
        ctaUrl: 'https://servigo.be',
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'ServiGo',
        to: data.customer_email,
        subject: `🎉 Mission acceptée — ${data.category_name || 'Service'}`,
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