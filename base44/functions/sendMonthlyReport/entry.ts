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
  return `<div style="background:#F5F5F5;border-radius:12px;padding:18px 22px;margin:16px 0;border-left:3px solid #0F0F0F;">${label ? `<p style="margin:0 0 8px;font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:#0F0F0F;text-transform:uppercase;letter-spacing:1px;">${label}</p>` : ''}<div style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;line-height:1.8;">${contentHtml}</div></div>`;
}

function statRow(label, value) {
  return `<tr><td style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:14px;color:#555555;padding:4px 0;">${label}</td><td style="font-family:'Bricolage Grotesque','Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#0F0F0F;text-align:right;padding:4px 0;">${value}</td></tr>`;
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
  const disputed = lastMonthRequests.filter(r => r.status === 'disputed').length;
  const urgent = lastMonthRequests.filter(r => r.is_urgent).length;
  const totalRevenue = lastMonthRequests.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
  const avgRevenue = completed > 0 ? (totalRevenue / completed).toFixed(2) : 0;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  const uniqueClients = new Set(lastMonthRequests.map(r => r.customer_email).filter(Boolean)).size;
  const uniquePros = new Set(lastMonthRequests.filter(r => r.professional_email).map(r => r.professional_email)).size;

  const catCount = {};
  lastMonthRequests.forEach(r => { if (r.category_name) catCount[r.category_name] = (catCount[r.category_name] || 0) + 1; });
  const topCategoriesHtml = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => `<li style="margin-bottom:4px;"><strong>${name}</strong> — ${count} demande${count > 1 ? 's' : ''}</li>`).join('');

  const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 200);
  const newSubs = allSubs.filter(s => { const d = new Date(s.created_date); return d >= firstOfLastMonth && d < firstOfThisMonth; });
  const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trial').length;
  const subRevenue = newSubs.reduce((sum, s) => sum + (s.price || 0), 0);

  const allReviews = await base44.asServiceRole.entities.Review.list('-created_date', 200);
  const monthReviews = allReviews.filter(r => { const d = new Date(r.created_date); return d >= firstOfLastMonth && d < firstOfThisMonth; });
  const avgRating = monthReviews.length > 0 ? (monthReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / monthReviews.length).toFixed(2) : 'N/A';

  const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);

  const monthLabel = lastMonthName.charAt(0).toUpperCase() + lastMonthName.slice(1);

  const html = buildEmailHtml({
    title: `Rapport mensuel — ${monthLabel}`,
    body: `
      <p>Voici le récapitulatif des performances ServiGo pour <strong>${lastMonthName}</strong>.</p>

      ${infoBlock('Missions', `<table width="100%" cellpadding="0" cellspacing="0">
        ${statRow('Total demandes', total)}
        ${statRow('Complétées', `${completed} (${completionRate}%)`)}
        ${statRow('En cours', inProgress)}
        ${statRow('Annulées', cancelled)}
        ${statRow('Litiges', disputed)}
        ${statRow('Urgentes (SOS)', urgent)}
      </table>`)}

      ${infoBlock('Chiffre d\'affaires', `<table width="100%" cellpadding="0" cellspacing="0">
        ${statRow('CA missions complétées', `${totalRevenue.toFixed(2)} €`)}
        ${statRow('Panier moyen', `${avgRevenue} €`)}
        ${statRow('Revenus abonnements', `${subRevenue.toFixed(2)} €`)}
      </table>`)}

      ${infoBlock('Utilisateurs & satisfaction', `<table width="100%" cellpadding="0" cellspacing="0">
        ${statRow('Clients actifs', uniqueClients)}
        ${statRow('Pros actifs', uniquePros)}
        ${statRow('Abonnements actifs', activeSubs)}
        ${statRow('Nouveaux abonnements', newSubs.length)}
        ${statRow('Note moyenne', `${avgRating}/5 (${monthReviews.length} avis)`)}
      </table>`)}

      ${topCategoriesHtml ? infoBlock('Top catégories', `<ol style="margin:0;padding-left:18px;line-height:1.8;">${topCategoriesHtml}</ol>`) : ''}

      <p style="margin-top:28px;font-size:12px;color:#AAAAAA;">Rapport généré le ${now.toLocaleString('fr-FR')}</p>
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