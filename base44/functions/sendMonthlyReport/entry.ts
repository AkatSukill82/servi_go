import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduler or admin only
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const isScheduler = req.headers.get('x-base44-scheduler') === 'true';
  if (!isAdmin && !isScheduler) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Date range: last full month
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthName = firstOfLastMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  console.log(`Generating monthly report for ${lastMonthName}`);

  // Fetch all requests
  const allRequests = await base44.asServiceRole.entities.ServiceRequestV2.list('-created_date', 500);

  // Filter to last month
  const lastMonthRequests = allRequests.filter(r => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });

  // Compute stats
  const total = lastMonthRequests.length;
  const completed = lastMonthRequests.filter(r => r.status === 'completed').length;
  const cancelled = lastMonthRequests.filter(r => r.status === 'cancelled').length;
  const inProgress = lastMonthRequests.filter(r => ['accepted', 'contract_signed', 'pro_en_route', 'in_progress'].includes(r.status)).length;
  const searching = lastMonthRequests.filter(r => ['searching', 'pending_pro'].includes(r.status)).length;
  const disputed = lastMonthRequests.filter(r => r.status === 'disputed').length;
  const urgent = lastMonthRequests.filter(r => r.is_urgent).length;

  // Revenue estimate (completed missions with final_price or estimated_price)
  const totalRevenue = lastMonthRequests
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.final_price || r.estimated_price || 0), 0);
  const avgRevenue = completed > 0 ? (totalRevenue / completed).toFixed(2) : 0;

  // Top categories
  const catCount = {};
  lastMonthRequests.forEach(r => {
    if (r.category_name) catCount[r.category_name] = (catCount[r.category_name] || 0) + 1;
  });
  const topCategories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `  • ${name} : ${count} demande${count > 1 ? 's' : ''}`)
    .join('\n');

  // Unique clients and pros
  const uniqueClients = new Set(lastMonthRequests.map(r => r.customer_email).filter(Boolean)).size;
  const uniquePros = new Set(lastMonthRequests.filter(r => r.professional_email).map(r => r.professional_email)).size;

  // Completion rate
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

  // New subscriptions this month
  const allSubs = await base44.asServiceRole.entities.ProSubscription.list('-created_date', 200);
  const newSubs = allSubs.filter(s => {
    if (!s.created_date) return false;
    const d = new Date(s.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });
  const activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'trial').length;
  const subRevenue = newSubs.reduce((sum, s) => sum + (s.price || 0), 0);

  // Reviews this month
  const allReviews = await base44.asServiceRole.entities.Review.list('-created_date', 200);
  const monthReviews = allReviews.filter(r => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return d >= firstOfLastMonth && d < firstOfThisMonth;
  });
  const avgRating = monthReviews.length > 0
    ? (monthReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / monthReviews.length).toFixed(2)
    : 'N/A';

  // Get admin users
  const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);

  const reportBody = `
📊 RAPPORT MENSUEL SERVIGO — ${lastMonthName.toUpperCase()}
${'='.repeat(50)}

📋 MISSIONS
-----------
• Total demandes reçues       : ${total}
• Missions complétées         : ${completed} (${completionRate}%)
• En cours / acceptées        : ${inProgress}
• Annulées                    : ${cancelled}
• En recherche                : ${searching}
• Litiges ouverts             : ${disputed}
• Missions urgentes (SOS)     : ${urgent}

💰 CHIFFRE D'AFFAIRES ESTIMÉ
-----------------------------
• CA total missions complétées : ${totalRevenue.toFixed(2)} €
• Panier moyen par mission     : ${avgRevenue} €

👥 UTILISATEURS
---------------
• Clients uniques actifs       : ${uniqueClients}
• Professionnels ayant répondu : ${uniquePros}

🏆 TOP CATÉGORIES
-----------------
${topCategories || '  Aucune donnée'}

💳 ABONNEMENTS PRO
------------------
• Nouveaux abonnements         : ${newSubs.length}
• Revenus abonnements          : ${subRevenue.toFixed(2)} €
• Total abonnements actifs     : ${activeSubs}

⭐ AVIS & SATISFACTION
----------------------
• Avis reçus ce mois           : ${monthReviews.length}
• Note moyenne                 : ${avgRating}/5

${'='.repeat(50)}
Rapport généré automatiquement le ${now.toLocaleString('fr-FR')}
ServiGo — Plateforme de mise en relation artisans/clients
`.trim();

  // Send to all admins
  let emailsSent = 0;
  for (const admin of admins) {
    if (!admin.email) continue;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: admin.email,
      subject: `📊 Rapport mensuel ServiGo — ${lastMonthName}`,
      body: reportBody,
    }).catch(e => console.error(`Failed to send to ${admin.email}:`, e.message));
    emailsSent++;
  }

  // Also create an in-app notification for each admin
  for (const admin of admins) {
    if (!admin.email) continue;
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: admin.email,
      recipient_type: 'admin',
      type: 'payment_received',
      title: `📊 Rapport mensuel ${lastMonthName}`,
      body: `${total} demandes · ${completed} complétées · ${completionRate}% · CA: ${totalRevenue.toFixed(2)}€`,
      action_url: '/AdminDashboard',
    }).catch(() => {});
  }

  console.log(`Monthly report sent to ${emailsSent} admin(s) for ${lastMonthName}`);
  return Response.json({ ok: true, month: lastMonthName, total, completed, emailsSent });
});