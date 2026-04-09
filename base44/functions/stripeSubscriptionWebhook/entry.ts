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

  // Helper: resolve customer email from Stripe object
  async function resolveEmail(obj) {
    let email = obj.customer_email || obj.metadata?.professional_email;
    if (!email && obj.customer) {
      try {
        const customer = await stripe.customers.retrieve(obj.customer);
        email = customer.email;
      } catch (e) { console.error('Customer lookup error:', e.message); }
    }
    return email;
  }

  // invoice.payment_succeeded → activate + PaymentHistory + notification
  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
    const inv = event.data.object;
    const customerEmail = await resolveEmail(inv);
    if (!customerEmail) return Response.json({ received: true });

    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      const sub = subs[0];
      await base44.asServiceRole.entities.ProSubscription.update(sub.id, { status: 'active', auto_renew: true });
      await syncUserProfile(customerEmail, true);

      // PaymentHistory record — deduplicate by stripe_payment_intent_id
      const paymentIntentId = inv.payment_intent || inv.id;
      const existing = await base44.asServiceRole.entities.PaymentHistory.filter({ stripe_payment_intent_id: paymentIntentId }, '-created_date', 1).catch(() => []);
      if (existing.length === 0) {
        await base44.asServiceRole.entities.PaymentHistory.create({
          professional_email: customerEmail,
          professional_name: sub.professional_name || '',
          subscription_id: sub.id,
          amount: (inv.amount_paid || 0) / 100,
          status: 'paid',
          payment_date: new Date(inv.created * 1000).toISOString(),
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntentId,
          invoice_ref: inv.id,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString().split('T')[0] : '',
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString().split('T')[0] : '',
        }).catch(e => console.error('PaymentHistory create error:', e.message));
      } else {
        console.log(`PaymentHistory already exists for payment_intent ${paymentIntentId}, skipping.`);
      }

      // Notification in-app
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: customerEmail,
        recipient_type: 'professionnel',
        type: 'payment_received',
        title: '✅ Paiement reçu',
        body: `Abonnement ServiGo Pro renouvelé — ${((inv.amount_paid || 0) / 100).toFixed(2)}€`,
        action_url: '/ProSubscription',
      }).catch(() => {});
    }
    console.log(`Invoice paid / subscription active for ${customerEmail}`);
  }

  // invoice.payment_failed → expire + PaymentHistory + email + notification
  if (event.type === 'invoice.payment_failed' || event.type === 'payment_intent.payment_failed') {
    const obj = event.data.object;
    const customerEmail = await resolveEmail(obj);
    if (!customerEmail) return Response.json({ received: true });

    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      const sub = subs[0];
      await base44.asServiceRole.entities.ProSubscription.update(sub.id, { status: 'expired' });
      await syncUserProfile(customerEmail, false);

      // PaymentHistory record
      await base44.asServiceRole.entities.PaymentHistory.create({
        professional_email: customerEmail,
        professional_name: sub.professional_name || '',
        subscription_id: sub.id,
        amount: (obj.amount || obj.amount_due || 0) / 100,
        status: 'failed',
        payment_date: new Date().toISOString(),
        payment_method: 'stripe',
        failure_reason: obj.last_payment_error?.message || obj.failure_message || 'Paiement refusé',
      }).catch(e => console.error('PaymentHistory create error:', e.message));

      // Email to pro
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customerEmail,
        subject: '⚠️ Échec de paiement — Abonnement ServiGo Pro',
        body: `Bonjour,\n\nLe renouvellement de votre abonnement ServiGo Pro a échoué. Votre accès aux missions est suspendu.\n\nMettez à jour votre moyen de paiement dès que possible pour continuer à recevoir des missions.\n\nL'équipe ServiGo`,
      }).catch(() => {});

      // Notification in-app
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: customerEmail,
        recipient_type: 'professionnel',
        type: 'payment_failed',
        title: '⚠️ Échec de paiement',
        body: 'Votre abonnement est suspendu. Mettez à jour votre moyen de paiement.',
        action_url: '/ProSubscription',
      }).catch(() => {});
    }
    console.log(`Payment failed for ${customerEmail}`);
  }

  // customer.subscription.deleted → cancelled + notification
  if (event.type === 'customer.subscription.deleted') {
    const stripeSub = event.data.object;
    const customerEmail = await resolveEmail(stripeSub);
    if (!customerEmail) return Response.json({ received: true });

    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      await base44.asServiceRole.entities.ProSubscription.update(subs[0].id, { status: 'cancelled', auto_renew: false });
    }
    await syncUserProfile(customerEmail, false);

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: customerEmail,
      recipient_type: 'professionnel',
      type: 'subscription_expired',
      title: 'Abonnement annulé',
      body: 'Votre abonnement ServiGo Pro a été annulé. Réabonnez-vous pour recevoir des missions.',
      action_url: '/ProSubscription',
    }).catch(() => {});

    console.log(`Subscription cancelled for ${customerEmail}`);
  }

  // charge.refunded → PaymentHistory refund + notify admin
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const customerEmail = await resolveEmail(charge);
    const refundAmount = (charge.amount_refunded || 0) / 100;

    if (customerEmail) {
      await base44.asServiceRole.entities.PaymentHistory.create({
        professional_email: customerEmail,
        amount: refundAmount,
        status: 'refunded',
        payment_date: new Date().toISOString(),
        payment_method: 'stripe',
        invoice_ref: charge.id,
      }).catch(e => console.error('PaymentHistory refund error:', e.message));
    }

    // Notify admin (broadcast)
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: 'admin',
      recipient_type: 'admin',
      type: 'payment_received',
      title: `💸 Remboursement — ${refundAmount}€`,
      body: `Client: ${customerEmail || 'inconnu'} — Charge: ${charge.id}`,
      action_url: '/AdminDashboard',
    }).catch(() => {});

    console.log(`Charge refunded: ${refundAmount}€ for ${customerEmail || 'unknown'}`);
  }

  // customer.subscription.updated — handle status changes
  if (event.type === 'customer.subscription.updated') {
    const stripeSub = event.data.object;
    const customerEmail = await resolveEmail(stripeSub);
    if (!customerEmail) return Response.json({ received: true });
    const subs = await base44.asServiceRole.entities.ProSubscription.filter({ professional_email: customerEmail }, '-created_date', 1);
    if (subs.length > 0) {
      const stripeStatus = stripeSub.status;
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