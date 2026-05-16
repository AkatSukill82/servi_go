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

  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthName = firstOfLastMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  console.log(`Generating monthly report for ${lastMonthName}`);

  const allRequests = await base44.asServiceRole.entities.ServiceRequestV2.list('-created_date', 500);
  const lastMonthRequests = allRequests.filter(r => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });

  const total = lastMonthRequests.length;
  const completed = lastMonthRequests.filter(r => r.status === 'completed').length;
  const cancelled = lastMonthRequests.filter(r => r.status === 'cancelled').length;
  const inProgress = lastMonthRequests.filter(r => ['accepted', 'contract_signed', 'pro_en_route', 'in_progress'].includes(r.status)).length;
  const searching = lastMonthRequests.filter(r => ['searching', 'pending_pro'].includes(r.status)).length;
  const disputed = lastMonthRequests.filter(r => r.status === 'disputed').length;
  const urgent = lastMonthRequests.filter(r => r.is_urgent).length;

  const totalRevenue = lastMonthRequests.filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
  const avgRevenue = completed > 0 ? (totalRevenue / completed).toFixed(2) : 0;

  const catCount = {};
  lastMonthRequests.forEach(r => {
    if (r.category_name) catCount[r.category_name] = (catCount[r.category_name] || 0) + 1;
  });
  const topCategoriesHtml = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => `<li style="margin-bottom:4px;"><strong>${name}</strong> — ${count} demande${count > 1 ? 's' : ''}</li>`)
    .join('');

  const uniqueClients = new Set(lastMonthRequests.map(r => r.customer_email).filter(Boolean)).size;
  const uniquePros = new Set(lastMonthRequests.filter(r => r.professional_email).map(r => r.professional_email)).size;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

  const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 200);
  const newSubs = allSubs.filter(s => {
    if (!s.created_date) return false;
    const d = new Date(s.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });
  const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trial').length;
  const subRevenue = newSubs.reduce((sum, s) => sum + (s.price || 0), 0);

  const allReviews = await base44.asServiceRole.entities.Review.list('-created_date', 200);
  const monthReviews = allReviews.filter(r => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });
  const avgRating = monthReviews.length > 0
    ? (monthReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / monthReviews.length).toFixed(2)
    : 'N/A';

  const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);

  const html = buildEmailHtml({
    title: `Rapport mensuel — ${lastMonthName.charAt(0).toUpperCase() + lastMonthName.slice(1)}`,
    body: `
      <p>Voici le récapitulatif des performances ServiGo pour le mois de <strong>${lastMonthName}</strong>.</p>

      <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:24px 0;border-left:3px solid #0F0F0F;">
        <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Missions</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Total demandes</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${total}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Complétées</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${completed} (${completionRate}%)</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">En cours</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${inProgress}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Annulées</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${cancelled}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Litiges</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${disputed}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Urgentes (SOS)</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${urgent}</td></tr>
        </table>
      </div>

      <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:16px 0;border-left:3px solid #0F0F0F;">
        <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Chiffre d'affaires</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">CA missions complétées</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${totalRevenue.toFixed(2)} €</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Panier moyen</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${avgRevenue} €</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Revenus abonnements</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${subRevenue.toFixed(2)} €</td></tr>
        </table>
      </div>

      <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:16px 0;border-left:3px solid #0F0F0F;">
        <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Utilisateurs & satisfaction</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Clients actifs</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${uniqueClients}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Pros ayant répondu</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${uniquePros}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Abonnements actifs</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${activeSubs}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Nouveaux abonnements</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${newSubs.length}</td></tr>
          <tr><td style="font-size:14px;color:#3D3D3D;padding:3px 0;">Note moyenne</td><td style="font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;">${avgRating}/5 (${monthReviews.length} avis)</td></tr>
        </table>
      </div>

      ${topCategoriesHtml ? `
      <div style="background:#F7F7F7;border-radius:10px;padding:18px 22px;margin:16px 0;border-left:3px solid #0F0F0F;">
        <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#0F0F0F;text-transform:uppercase;letter-spacing:0.5px;">Top catégories</p>
        <ol style="margin:0;padding-left:18px;font-size:14px;color:#3D3D3D;line-height:1.8;">${topCategoriesHtml}</ol>
      </div>` : ''}

      <p style="margin-top:28px;font-size:12px;color:#8C8C8C;">Rapport généré automatiquement le ${now.toLocaleString('fr-FR')}</p>
    `,
    ctaText: 'Voir le tableau de bord',
    ctaUrl: 'https://servigo.be/AdminDashboard',
  });

  let emailsSent = 0;
  for (const admin of admins) {
    if (!admin.email) continue;
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'ServiGo',
      to: admin.email,
      subject: `Rapport mensuel ServiGo — ${lastMonthName}`,
      body: html,
    }).catch(e => console.error(`Failed to send to ${admin.email}:`, e.message));
    emailsSent++;
  }

  for (const admin of admins) {
    if (!admin.email) continue;
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: admin.email, recipient_type: 'admin',
      type: 'payment_received',
      title: `Rapport mensuel ${lastMonthName}`,
      body: `${total} demandes · ${completed} complétées · ${completionRate}% · CA: ${totalRevenue.toFixed(2)}€`,
      action_url: '/AdminDashboard',
    }).catch(() => {});
  }

  console.log(`Monthly report sent to ${emailsSent} admin(s) for ${lastMonthName}`);
  return Response.json({ ok: true, month: lastMonthName, total, completed, emailsSent });
});