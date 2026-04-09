import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_type !== 'professionnel') return Response.json({ error: 'Réservé aux professionnels' }, { status: 403 });

    const body = await req.json();
    const plan = body.plan === 'annual' ? 'annual' : 'monthly';
    const isAnnual = plan === 'annual';
    const successUrl = body.successUrl || `${req.headers.get('origin')}/ProSubscription?success=true&plan=${plan}`;
    const cancelUrl = body.cancelUrl || `${req.headers.get('origin')}/ProSubscription`;

    const lineItem = isAnnual
      ? { price_data: { currency: 'eur', unit_amount: 10000, product_data: { name: 'ServiGo Pro — Abonnement Annuel', description: '~8,33€/mois · Économisez 17%' } } }
      : { price_data: { currency: 'eur', unit_amount: 1000, product_data: { name: 'ServiGo Pro — Abonnement Mensuel', description: 'Accès illimité aux missions' } } };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ ...lineItem, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        professional_email: user.email,
        professional_name: user.full_name || '',
        professional_id: user.id,
        plan,
      },
    });

    console.log(`Checkout session created for ${user.email} plan=${plan} session=${session.id}`);

    // Create or update ProSubscription as pending_payment
    const existing = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1);
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

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Pro subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});