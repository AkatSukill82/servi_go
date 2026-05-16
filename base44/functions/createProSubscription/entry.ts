import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// IDs des prix Stripe existants (Live Mode)
const PRICE_IDS = {
  monthly: 'price_1RMuViFAPMkxlXSv0YENF1xF', // Sera résolu dynamiquement si absent
  annual:  'price_1RMuVoFAPMkxlXSv0kIFqNtB',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.warn('[createProSubscription] Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const plan = body.plan === 'annual' ? 'annual' : 'monthly';
    const successUrl = body.successUrl || `${req.headers.get('origin')}/ProSubscription?success=true&plan=${plan}`;
    const cancelUrl = body.cancelUrl || `${req.headers.get('origin')}/ProSubscription`;

    const isAnnual = plan === 'annual';
    console.log('[createProSubscription] Starting session creation:', { email: user.email, plan });

    // Récupérer les prix depuis Stripe pour utiliser les bons price IDs
    let priceId;
    try {
      const prices = await stripe.prices.list({ active: true, limit: 20 });
      const match = prices.data.find(p =>
        p.recurring &&
        (isAnnual ? p.recurring.interval === 'year' : p.recurring.interval === 'month')
      );
      priceId = match?.id;
      if (priceId) {
        console.log('[createProSubscription] Prix Stripe trouvé:', { priceId, interval: isAnnual ? 'year' : 'month' });
      }
    } catch (e) {
      console.error('[createProSubscription] Erreur récupération prix Stripe:', { error: e.message, code: e.code });
    }

    let sessionConfig;

    if (priceId) {
      // Mode abonnement récurrent avec prix Stripe existant
      sessionConfig = {
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          professional_email: user.email,
          professional_name: user.full_name || '',
          plan,
        },
      };
    } else {
      // Fallback : one-time payment si pas de prix récurrent trouvé
      console.warn('[createProSubscription] Aucun prix récurrent trouvé, utilisation fallback one-time payment');
      const amount = isAnnual ? 10000 : 1000;
      const name = isAnnual ? 'ServiGo Pro — Abonnement Annuel' : 'ServiGo Pro — Abonnement Mensuel';
      sessionConfig = {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          professional_email: user.email,
          professional_name: user.full_name || '',
          plan,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Créer ou mettre à jour ProSubscription en pending_payment
    const existing = await base44.asServiceRole.entities.ProSubscription.filter(
      { professional_email: user.email }, '-created_date', 1
    );
    const subData = {
      status: 'pending_payment',
      payment_method: 'stripe',
      stripe_subscription_id: session.id,
      plan,
      price: isAnnual ? 100 : 10,
    };
    if (existing.length === 0) {
      await base44.asServiceRole.entities.ProSubscription.create({
        professional_email: user.email,
        professional_name: user.full_name || '',
        missions_received: 0,
        auto_renew: true,
        ...subData,
      });
      console.log('[createProSubscription] Nouvelle ProSubscription créée:', { email: user.email, plan });
    } else {
      await base44.asServiceRole.entities.ProSubscription.update(existing[0].id, subData);
      console.log('[createProSubscription] ProSubscription mise à jour:', { email: user.email, id: existing[0].id, plan });
    }

    console.log('[createProSubscription] Session Stripe créée avec succès:', { sessionId: session.id, email: user.email, plan });
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[createProSubscription] ERREUR:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    return Response.json({ error: error.message || 'Erreur subscription' }, { status: 500 });
  }
});