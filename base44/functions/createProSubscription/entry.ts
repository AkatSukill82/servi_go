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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_type !== 'professionnel') return Response.json({ error: 'Réservé aux professionnels' }, { status: 403 });

    const body = await req.json();
    const plan = body.plan === 'annual' ? 'annual' : 'monthly';
    const successUrl = body.successUrl || `${req.headers.get('origin')}/ProSubscription?success=true&plan=${plan}`;
    const cancelUrl = body.cancelUrl || `${req.headers.get('origin')}/ProSubscription`;

    const isAnnual = plan === 'annual';

    // Récupérer les prix depuis Stripe pour utiliser les bons price IDs
    let priceId;
    try {
      const prices = await stripe.prices.list({ active: true, limit: 20 });
      // Chercher le bon prix selon l'intervalle
      const match = prices.data.find(p =>
        p.recurring &&
        (isAnnual ? p.recurring.interval === 'year' : p.recurring.interval === 'month')
      );
      priceId = match?.id;
    } catch (e) {
      console.error('Erreur récupération prix Stripe:', e.message);
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
      console.warn('Aucun prix récurrent trouvé, fallback one-time payment');
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
    } else {
      await base44.asServiceRole.entities.ProSubscription.update(existing[0].id, subData);
    }

    console.log(`Session Stripe créée: ${session.id} pour ${user.email} (plan: ${plan})`);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Pro subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});