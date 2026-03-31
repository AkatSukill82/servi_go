import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${req.headers.get('origin')}/ProSubscription`;

    // Get stored customer ID or look up by email
    const subs = await base44.asServiceRole.entities.ProSubscription.filter(
      { professional_email: user.email }, '-created_date', 1
    );

    let customerId = subs[0]?.stripe_customer_id;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        return Response.json({ error: 'Aucun compte Stripe trouvé. Souscrivez d\'abord un abonnement.' }, { status: 404 });
      }
      customerId = customers.data[0].id;
      if (subs.length > 0) {
        await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, { stripe_customer_id: customerId });
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createBillingPortal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});