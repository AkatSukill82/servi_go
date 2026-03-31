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

  // Helper: sync User profile subscription status
  async function syncUserProfile(email, isActive) {
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 1);
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { subscription_active: isActive });
      }
    } catch (e) {
      console.error('syncUserProfile error:', e.message);
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const proEmail = session.metadata?.professional_email;
    if (!proEmail) return Response.json({ received: true });

    const plan = session.metadata?.plan || 'monthly';
    const isAnnual = plan === 'annual';
    const planPrice = isAnnual ? 100 : 10;
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: proEmail }, '-created_date', 1);
    const startDate = new Date().toISOString().split('T')[0];
    const msOffset = isAnnual ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const renewalDate = new Date(Date.now() + msOffset).toISOString().split('T')[0];

    const stripeCustomerId = session.customer || null;

    if (subs.length > 0) {
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, {
        status: 'active',
        plan,
        price: planPrice,
        started_date: startDate,
        renewal_date: renewalDate,
        stripe_subscription_id: session.subscription || session.id,
        stripe_customer_id: stripeCustomerId,
        payment_method: 'stripe',
        auto_renew: true,
      });
    } else {
      await base44.asServiceRole.entities.ProSubscription.create({
        professional_email: proEmail,
        professional_name: session.metadata?.professional_name || '',
        plan,
        price: planPrice,
        status: 'active',
        started_date: startDate,
        renewal_date: renewalDate,
        stripe_subscription_id: session.subscription || session.id,
        stripe_customer_id: stripeCustomerId,
        payment_method: 'stripe',
        auto_renew: true,
        missions_received: 0,
      });
    }

    // Sync user profile
    await syncUserProfile(proEmail, true);

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
    // Resolve email: try customer email from Stripe
    let customerEmail = obj.customer_email || obj.metadata?.professional_email;
    if (!customerEmail && obj.customer) {
      try {
        const customer = await stripe.customers.retrieve(obj.customer);
        customerEmail = customer.email;
      } catch (e) { console.error('Customer lookup error:', e.message); }
    }
    if (!customerEmail) return Response.json({ received: true });

    const newStatus = event.type === 'customer.subscription.deleted' ? 'cancelled' : 'expired';
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, { status: newStatus, auto_renew: false });
    }
    // Sync user profile
    await syncUserProfile(customerEmail, false);
    console.log(`Subscription ${newStatus} for ${customerEmail}`);
  }

  // invoice.paid — log payment history
  if (event.type === 'invoice.paid') {
    const inv = event.data.object;
    let customerEmail = inv.customer_email;
    if (!customerEmail && inv.customer) {
      try {
        const customer = await stripe.customers.retrieve(inv.customer);
        customerEmail = customer.email;
      } catch (e) { console.error('Customer lookup error:', e.message); }
    }
    if (!customerEmail) return Response.json({ received: true });
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      const sub = subs[0];
      const history = sub.payment_history || [];
      const newEntry = {
        date: new Date(inv.created * 1000).toISOString().split('T')[0],
        amount: (inv.amount_paid / 100),
        status: 'paid',
        invoice_ref: inv.id,
      };
      // Avoid duplicates
      if (!history.find(h => h.invoice_ref === inv.id)) {
        await base44.asServiceRole.entities.ProSubscription.update(sub.id, {
          payment_history: [newEntry, ...history].slice(0, 24),
        });
      }
    }
    console.log(`Invoice paid logged for ${customerEmail}`);
  }

  // customer.subscription.updated — handle status changes (past_due, paused, etc.)
  if (event.type === 'customer.subscription.updated') {
    const stripeSub = event.data.object;
    let customerEmail = stripeSub.customer_email;
    if (!customerEmail && stripeSub.customer) {
      try {
        const customer = await stripe.customers.retrieve(stripeSub.customer);
        customerEmail = customer.email;
      } catch (e) { console.error('Customer lookup error:', e.message); }
    }
    if (!customerEmail) return Response.json({ received: true });
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      const stripeStatus = stripeSub.status; // active, past_due, canceled, paused, etc.
      const mappedStatus = stripeStatus === 'active' ? 'active' : stripeStatus === 'canceled' ? 'cancelled' : 'expired';
      const renewalDate = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000).toISOString().split('T')[0]
        : subs[0].renewal_date;
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, {
        status: mappedStatus,
        renewal_date: renewalDate,
        auto_renew: !stripeSub.cancel_at_period_end,
      });
      await syncUserProfile(customerEmail, mappedStatus === 'active');
    }
    console.log(`Subscription updated for ${customerEmail}: ${stripeSub.status}`);
  }

  return Response.json({ received: true });
});