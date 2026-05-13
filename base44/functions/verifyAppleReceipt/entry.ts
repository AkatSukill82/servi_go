import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APPLE_VERIFY_URL_PROD    = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Votre shared secret Apple (App Store Connect → Mon App → Abonnements → Shared Secret)
const APPLE_SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET') || '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiptData, productId, plan, userEmail } = await req.json();

    if (!receiptData) {
      return Response.json({ success: false, error: 'receiptData manquant' }, { status: 400 });
    }

    const email = userEmail || user.email;

    // ── Vérification Apple (prod d'abord, sandbox si status=21007) ────────────
    const verifyWithApple = async (url) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          password: APPLE_SHARED_SECRET,
          'exclude-old-transactions': true,
        }),
      });
      return res.json();
    };

    let appleResponse = await verifyWithApple(APPLE_VERIFY_URL_PROD);
    console.log('[verifyAppleReceipt] Apple status prod:', appleResponse.status);

    // 21007 = receipt du sandbox soumis à l'env prod → retry sandbox
    if (appleResponse.status === 21007) {
      appleResponse = await verifyWithApple(APPLE_VERIFY_URL_SANDBOX);
      console.log('[verifyAppleReceipt] Apple status sandbox:', appleResponse.status);
    }

    if (appleResponse.status !== 0) {
      console.error('[verifyAppleReceipt] Échec Apple, status:', appleResponse.status);
      return Response.json({ success: false, error: `Apple status ${appleResponse.status}` });
    }

    // ── Trouver la transaction la plus récente pour ce produit ────────────────
    const latestReceipts = appleResponse.latest_receipt_info || appleResponse.receipt?.in_app || [];
    const relevant = latestReceipts
      .filter(t => !productId || t.product_id === productId)
      .sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms));

    if (relevant.length === 0) {
      return Response.json({ success: false, error: 'Aucune transaction trouvée pour ce produit' });
    }

    const latest = relevant[0];
    const expiresMs = Number(latest.expires_date_ms);
    const now = Date.now();

    if (expiresMs < now) {
      console.warn('[verifyAppleReceipt] Abonnement expiré :', new Date(expiresMs).toISOString());
      return Response.json({ success: false, error: 'Abonnement expiré' });
    }

    // ── Mettre à jour l'abonnement en base ────────────────────────────────────
    const resolvedPlan = plan || (latest.product_id?.includes('year') ? 'annual' : 'monthly');
    const renewalDate  = new Date(expiresMs).toISOString().split('T')[0];
    const startedDate  = new Date(Number(latest.purchase_date_ms)).toISOString().split('T')[0];

    const subData = {
      professional_email: email,
      professional_name:  user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      status:             'active',
      plan:               resolvedPlan,
      price:              resolvedPlan === 'annual' ? 90 : 9.99,
      started_date:       startedDate,
      renewal_date:       renewalDate,
      auto_renew:         true,
      payment_method:     'stripe', // on garde le champ existant
    };

    const existing = await base44.asServiceRole.entities.ProSubscription
      .filter({ professional_email: email }, '-created_date', 1)
      .then(r => r[0]);

    if (existing) {
      await base44.asServiceRole.entities.ProSubscription.update(existing.id, subData);
      console.log('[verifyAppleReceipt] Abonnement mis à jour pour', email);
    } else {
      await base44.asServiceRole.entities.ProSubscription.create(subData);
      console.log('[verifyAppleReceipt] Abonnement créé pour', email);
    }

    return Response.json({ success: true, plan: resolvedPlan, renewal_date: renewalDate });

  } catch (error) {
    console.error('[verifyAppleReceipt] Erreur:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});