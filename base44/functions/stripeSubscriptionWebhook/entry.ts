import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const proEmail = session.metadata?.professional_email;
    if (!proEmail) return Response.json({ received: true });

    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: proEmail }, '-created_date', 1);
    const startDate = new Date().toISOString().split('T')[0];
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (subs.length > 0) {
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, {
        status: 'active',
        started_date: startDate,
        renewal_date: renewalDate,
        stripe_subscription_id: session.subscription || session.id,
        payment_method: 'stripe',
        auto_renew: true,
      });
    } else {
      await base44.asServiceRole.entities.ProSubscription.create({
        professional_email: proEmail,
        professional_name: session.metadata?.professional_name || '',
        plan: 'monthly',
        price: 10,
        status: 'active',
        started_date: startDate,
        renewal_date: renewalDate,
        stripe_subscription_id: session.subscription || session.id,
        payment_method: 'stripe',
        auto_renew: true,
        missions_received: 0,
      });
    }

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: proEmail,
      subject: '✅ Abonnement Pro ServiGo activé !',
      body: `Bonjour,\n\nVotre abonnement Pro ServiGo est maintenant actif. Vous pouvez recevoir des missions dès aujourd'hui.\n\nVotre abonnement se renouvellera automatiquement le ${renewalDate}.\n\nBienvenue dans la communauté ServiGo Pro !\n\nL'équipe ServiGo`,
    }).catch(() => {});

    console.log(`Subscription activated for ${proEmail}`);
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    const obj = event.data.object;
    const customerEmail = obj.customer_email || obj.metadata?.professional_email;
    if (!customerEmail) return Response.json({ received: true });

    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, {
        status: event.type === 'customer.subscription.deleted' ? 'cancelled' : 'expired',
      });
    }
    console.log(`Subscription expired/cancelled for ${customerEmail}`);
  }

  return Response.json({ received: true });
});