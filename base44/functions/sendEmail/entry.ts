import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ServiGo Premium Email Template ──────────────────────────────────────────
// Design: Noir & Blanc · Bricolage Grotesque · Zéro mention Base44
export function buildEmailHtml({ title, body, ctaText, ctaUrl }) {
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
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#0F0F0F;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <!-- Logo wordmark -->
              <div style="display:inline-block;">
                <span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:800;color:#FFFFFF;letter-spacing:-1px;line-height:1;">Servi</span><span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:800;color:#FFFFFF;letter-spacing:-1px;line-height:1;background:#FFFFFF;color:#0F0F0F;padding:0 6px;border-radius:4px;margin-left:1px;">Go</span>
              </div>
              <p style="margin:8px 0 0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:400;color:rgba(255,255,255,0.45);letter-spacing:0.5px;text-transform:uppercase;">Services à domicile en Belgique</p>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background:#FFFFFF;padding:40px 40px 32px;border-left:1px solid #E5E5E5;border-right:1px solid #E5E5E5;">
              <h1 style="margin:0 0 20px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:#0F0F0F;line-height:1.25;letter-spacing:-0.3px;">${title}</h1>
              <div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:400;color:#3D3D3D;line-height:1.75;">
                ${body}
              </div>
              ${ctaText && ctaUrl ? `
              <div style="margin-top:36px;text-align:center;">
                <a href="${ctaUrl}" style="display:inline-block;background:#0F0F0F;color:#FFFFFF;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">
                  ${ctaText} →
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="background:#FFFFFF;padding:0 40px;border-left:1px solid #E5E5E5;border-right:1px solid #E5E5E5;">
              <div style="height:1px;background:#F0F0F0;"></div>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E5E5;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:600;color:#0F0F0F;">ServiGo</p>
              <p style="margin:0 0 12px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:400;color:#8C8C8C;line-height:1.6;">
                Votre plateforme de services à domicile en Belgique<br/>
                <a href="mailto:contact@servigo.be" style="color:#8C8C8C;text-decoration:none;">contact@servigo.be</a>
              </p>
              <p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#BBBBBB;">
                <a href="https://servigo.be/confidentialite" style="color:#BBBBBB;text-decoration:underline;text-underline-offset:2px;">Politique de confidentialité</a>
                &nbsp;·&nbsp;
                <a href="https://servigo.be/cgu" style="color:#BBBBBB;text-decoration:underline;text-underline-offset:2px;">CGU</a>
                &nbsp;·&nbsp;
                <a href="https://servigo.be/confidentialite" style="color:#BBBBBB;text-decoration:underline;text-underline-offset:2px;">Se désinscrire</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { to, subject, title, bodyHtml, ctaText, ctaUrl, rawHtml } = body;

    if (!to || !subject) {
      return Response.json({ error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    const html = rawHtml || buildEmailHtml({
      title: title || subject,
      body: bodyHtml || '',
      ctaText,
      ctaUrl,
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to,
      subject,
      body: html,
    });

    console.log(`Email sent to ${to} — subject: ${subject}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});