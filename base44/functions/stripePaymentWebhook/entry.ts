import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_PAYMENT_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const requestId = session.metadata?.request_id;
    const proEmail = session.metadata?.professional_email;

    // Only handle service payments (not subscription payments)
    if (!requestId || proEmail) return Response.json({ received: true });

    try {
      const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
      const request = requests[0];
      if (!request) {
        console.error(`ServiceRequestV2 not found: ${requestId}`);
        return Response.json({ received: true });
      }

      // Update payment status
      await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, { payment_status: 'paid' });

      // Create Invoice
      const estimatedPrice = request.estimated_price || 0;
      const commission = Math.round(estimatedPrice * 0.1 * 100) / 100;
      await base44.asServiceRole.entities.Invoice.create({
        request_id: requestId,
        invoice_number: `INV-${Date.now()}`,
        category_name: request.category_name,
        professional_name: request.professional_name || '',
        professional_email: request.professional_email || '',
        base_price: estimatedPrice,
        commission,
        total_price: (session.amount_total || 0) / 100,
        payment_method: 'stripe',
        payment_status: 'paid',
        customer_name: request.customer_name || '',
        customer_email: request.customer_email || '',
      });

      // Notify customer
      if (request.customer_email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: request.customer_email,
          recipient_type: 'particulier',
          type: 'payment_received',
          title: 'Paiement confirmé ✅',
          body: `Votre paiement pour la mission ${request.category_name} a bien été reçu.`,
          request_id: requestId,
          action_url: `/Chat?requestId=${requestId}`,
        });
      }

      // Notify professional
      if (request.professional_email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: request.professional_email,
          recipient_type: 'professionnel',
          type: 'payment_received',
          title: 'Paiement reçu 💶',
          body: `Le client a payé pour la mission ${request.category_name} — ${((session.amount_total || 0) / 100).toFixed(2)}€.`,
          request_id: requestId,
          action_url: `/Chat?requestId=${requestId}`,
        });
      }

      console.log(`Payment confirmed for request ${requestId}`);
    } catch (err) {
      console.error('checkout.session.completed error:', err.message);
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const requestId = session.metadata?.request_id;
    const proEmail = session.metadata?.professional_email;

    if (!requestId || proEmail) return Response.json({ received: true });

    try {
      const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
      const request = requests[0];
      if (request?.customer_email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: request.customer_email,
          recipient_type: 'particulier',
          type: 'payment_failed',
          title: 'Session de paiement expirée',
          body: `La session de paiement pour la mission ${request.category_name} a expiré.`,
          request_id: requestId,
          action_url: `/Chat?requestId=${requestId}`,
        });
      }
      console.log(`Payment session expired for request ${requestId}`);
    } catch (err) {
      console.error('checkout.session.expired error:', err.message);
    }
  }

  return Response.json({ received: true });
});