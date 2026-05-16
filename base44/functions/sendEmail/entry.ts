import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ServiGo Email Template — Style C ────────────────────────────────────────
// Design: Header noir arrondi · Carte blanche · Blocs gris accent · CTA noir
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
<body style="margin:0;padding:0;background:#EBEBEB;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EBEBEB;padding:48px 16px 56px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#0F0F0F;border-radius:20px 20px 0 0;padding:36px 40px 32px;text-align:center;">
              <!-- Logo -->
              <div style="margin-bottom:6px;">
                <span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:34px;font-weight:800;color:#FFFFFF;letter-spacing:-1.5px;line-height:1;">Servi</span><span style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:-1.5px;line-height:1;background:#FFFFFF;color:#0F0F0F;padding:2px 8px;border-radius:6px;margin-left:2px;">Go</span>
              </div>
              <p style="margin:10px 0 0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;">Services à domicile · Belgique</p>
            </td>
          </tr>

          <!-- ── CARD ── -->
          <tr>
            <td style="background:#FFFFFF;padding:40px 40px 36px;border-left:1px solid #E0E0E0;border-right:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;border-radius:0 0 20px 20px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

              <!-- Title -->
              <h1 style="margin:0 0 18px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#0F0F0F;line-height:1.2;letter-spacing:-0.5px;">${title}</h1>

              <!-- Body -->
              <div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:400;color:#444444;line-height:1.8;">
                ${body}
              </div>

              <!-- CTA -->
              ${ctaText && ctaUrl ? `
              <div style="margin-top:36px;">
                <a href="${ctaUrl}" style="display:block;background:#0F0F0F;color:#FFFFFF;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;padding:18px 32px;border-radius:12px;text-decoration:none;text-align:center;letter-spacing:-0.2px;">
                  ${ctaText} &nbsp;→
                </a>
              </div>` : ''}

              <!-- Divider -->
              <div style="height:1px;background:#F0F0F0;margin:32px 0 24px;"></div>

              <!-- Footer inside card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;color:#0F0F0F;">ServiGo</p>
                    <p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;color:#AAAAAA;line-height:1.6;">
                      <a href="mailto:contact@servigo.be" style="color:#AAAAAA;text-decoration:none;">contact@servigo.be</a>
                      &nbsp;·&nbsp;
                      <a href="https://servigo.be" style="color:#AAAAAA;text-decoration:none;">servigo.be</a>
                    </p>
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <p style="margin:0;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:10px;color:#CCCCCC;line-height:1.8;">
                      <a href="https://servigo.be/confidentialite" style="color:#CCCCCC;text-decoration:underline;text-underline-offset:2px;">Confidentialité</a><br/>
                      <a href="https://servigo.be/cgu" style="color:#CCCCCC;text-decoration:underline;text-underline-offset:2px;">CGU</a>
                      &nbsp;·&nbsp;
                      <a href="https://servigo.be/confidentialite" style="color:#CCCCCC;text-decoration:underline;text-underline-offset:2px;">Se désinscrire</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Helper : bloc info (encadré gris avec bordure noire gauche) ──────────────
export function infoBlock(labelText, contentHtml) {
  return `
  <div style="background:#F5F5F5;border-radius:12px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
    ${labelText ? `<p style="margin:0 0 8px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:#0F0F0F;text-transform:uppercase;letter-spacing:1px;">${labelText}</p>` : ''}
    <div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;line-height:1.8;">${contentHtml}</div>
  </div>`;
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