import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_PAYMENT_WEBHOOK_SECRET')
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { request_id, professional_email } = session.metadata || {};

      // Only handle service payments (not subscription payments)
      if (request_id && !professional_email) {
        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: request_id });
        const request = requests[0];

        if (request) {
          // Update request payment status
          await base44.asServiceRole.entities.ServiceRequestV2.update(request_id, {
            payment_status: 'paid',
          });

          // Create Invoice
          const estimatedPrice = request.estimated_price || 0;
          const commission = Math.round(estimatedPrice * 0.1 * 100) / 100;
          await base44.asServiceRole.entities.Invoice.create({
            request_id,
            invoice_number: `INV-${Date.now()}`,
            category_name: request.category_name,
            professional_name: request.professional_name,
            professional_email: request.professional_email,
            base_price: estimatedPrice,
            commission,
            total_price: (session.amount_total || 0) / 100,
            payment_method: 'stripe',
            payment_status: 'paid',
            customer_name: request.customer_name,
            customer_email: request.customer_email,
          });

          // Notify customer
          if (request.customer_email) {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: request.customer_email,
              recipient_type: 'particulier',
              type: 'payment_received',
              title: 'Paiement confirmé ✅',
              body: `Votre paiement pour ${request.category_name} a été confirmé.`,
              request_id,
              action_url: `/Chat?requestId=${request_id}`,
            });
          }

          // Notify professional
          if (request.professional_email) {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: request.professional_email,
              recipient_type: 'professionnel',
              type: 'payment_received',
              title: 'Paiement reçu 💶',
              body: `Paiement reçu pour la mission ${request.category_name}.`,
              request_id,
              action_url: `/Chat?requestId=${request_id}`,
            });
          }

          console.log(`Payment processed for request ${request_id}`);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const { request_id, professional_email } = session.metadata || {};

      if (request_id && !professional_email) {
        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: request_id });
        const request = requests[0];
        if (request?.customer_email) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: request.customer_email,
            recipient_type: 'particulier',
            type: 'payment_failed',
            title: 'Session de paiement expirée',
            body: `Votre session de paiement pour ${request.category_name} a expiré.`,
            request_id,
            action_url: `/Chat?requestId=${request_id}`,
          });
        }
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return Response.json({ received: true });
});