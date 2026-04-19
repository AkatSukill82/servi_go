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
    const { data } = payload;

    if (!data || !data.customer_email) {
      console.log('No customer_email in contract payload');
      return Response.json({ ok: true });
    }

    const html = buildEmailHtml({
      title: '📝 Contrat prêt à signer',
      body: `
        <p>Bonjour ${data.customer_name || ''},</p>
        <p>Votre professionnel <strong>${data.professional_name || 'ServiGo'}</strong> a préparé votre contrat de mission pour le service <strong>${data.category_name || ''}</strong>.</p>
        <div style="background:#FEF9E7;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #D69E2E;">
          <strong>Détails du contrat :</strong><br/>
          Référence : <strong>${data.contract_number || 'N/A'}</strong>
          ${data.scheduled_date ? `<br/>Intervention : <strong>${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}</strong>` : ''}
          ${data.agreed_price ? `<br/>Prix convenu : <strong>${data.agreed_price} €</strong>` : ''}
        </div>
        <p><strong>Action requise :</strong> Veuillez signer ce contrat dans l'application ServiGo avant l'intervention. La signature numérique est obligatoire pour valider la mission.</p>
        <p>Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `,
      ctaText: '✍️ Signer mon contrat',
      ctaUrl: 'https://servigo.be',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: data.customer_email,
      subject: `📝 Contrat à signer — ${data.category_name || 'Votre mission'}`,
      body: html,
    });

    console.log(`Contract email sent to ${data.customer_email}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('emailOnContractCreated error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});