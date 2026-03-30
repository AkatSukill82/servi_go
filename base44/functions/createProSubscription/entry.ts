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
    const successUrl = body.successUrl || `${req.headers.get('origin')}/ProSubscription?success=true`;
    const cancelUrl = body.cancelUrl || `${req.headers.get('origin')}/ProSubscription`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Abonnement Pro ServiGo',
            description: 'Accès illimité aux missions clients — renouvellement mensuel automatique',
          },
          unit_amount: 1000,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        professional_email: user.email,
        professional_name: user.full_name,
        professional_id: user.id,
      },
    });

    // Create or update ProSubscription record as pending_payment
    const existing = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: user.email }, '-created_date', 1);
    if (existing.length === 0) {
      await base44.asServiceRole.entities.ProSubscription.create({
        professional_email: user.email,
        professional_name: user.full_name,
        plan: 'monthly',
        price: 10,
        status: 'pending_payment',
        payment_method: 'stripe',
        stripe_subscription_id: session.id,
      });
    } else {
      await base44.asServiceRole.entities.ProSubscription.update(existing[0].id, {
        status: 'pending_payment',
        stripe_subscription_id: session.id,
      });
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Pro subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});