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
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data || !data.customer_email) {
      console.log('No customer_email in contract payload');
      return Response.json({ ok: true });
    }

    const html = buildEmailHtml({
      title: 'Votre contrat est prêt à signer',
      body: `
        <p>Bonjour ${data.customer_name || ''},</p>
        <p>Votre professionnel <strong>${data.professional_name || 'ServiGo'}</strong> a préparé votre contrat de mission pour le service <strong>${data.category_name || ''}</strong>.</p>
        <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
          <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Détails du contrat</p>
          <p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.8;">
            Référence : <strong>${data.contract_number || 'N/A'}</strong>
            ${data.scheduled_date ? `<br/>Intervention : <strong>${data.scheduled_date}${data.scheduled_time ? ' à ' + data.scheduled_time : ''}</strong>` : ''}
            ${data.agreed_price ? `<br/>Prix convenu : <strong>${data.agreed_price} €</strong>` : ''}
          </p>
        </div>
        <p><strong>Action requise :</strong> Veuillez signer ce contrat dans l'application ServiGo avant l'intervention. La signature numérique est obligatoire pour valider la mission.</p>
        <p style="margin-top:28px;">Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `,
      ctaText: 'Signer mon contrat',
      ctaUrl: 'https://servigo.be',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: data.customer_email,
      subject: `Contrat à signer — ${data.category_name || 'votre mission'}`,
      body: html,
    });

    console.log(`Contract email sent to ${data.customer_email}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('emailOnContractCreated error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});