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

    if (!data || !data.professional_email) {
      console.log('No professional_email in subscription payload');
      return Response.json({ ok: true });
    }

    const isAnnual = data.plan === 'annual';

    const html = buildEmailHtml({
      title: '🎉 Bienvenue dans ServiGo Pro !',
      body: `
        <p>Bonjour ${data.professional_name || ''},</p>
        <p>Votre abonnement <strong>ServiGo Pro ${isAnnual ? 'Annuel' : 'Mensuel'}</strong> est maintenant <strong>actif</strong>. Vous pouvez désormais recevoir des missions de clients près de chez vous.</p>
        <div style="background:#F0FFF4;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #38A169;">
          <strong>Votre abonnement :</strong><br/>
          Plan : <strong>${isAnnual ? 'Annuel — 100 €/an' : 'Mensuel — 10 €/mois'}</strong>
          ${data.renewal_date ? `<br/>Prochain renouvellement : <strong>${data.renewal_date}</strong>` : ''}
          ${data.trial_ends_date ? `<br/>Fin de la période d'essai : <strong>${data.trial_ends_date}</strong>` : ''}
        </div>
        <p>Pour recevoir vos premières missions :</p>
        <ol style="padding-left:20px;margin:12px 0;">
          <li style="margin-bottom:8px;">Configurez vos disponibilités dans l'app</li>
          <li style="margin-bottom:8px;">Activez votre statut "Disponible"</li>
          <li style="margin-bottom:8px;">Complétez votre profil public</li>
        </ol>
        <p>Cordialement,<br/><strong>L'équipe ServiGo</strong></p>
      `,
      ctaText: '🚀 Accéder à mon tableau de bord',
      ctaUrl: 'https://servigo.be',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: data.professional_email,
      subject: '🎉 Bienvenue dans ServiGo Pro — Votre abonnement est actif !',
      body: html,
    });

    console.log(`Pro welcome email sent to ${data.professional_email}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('emailOnProSubscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});