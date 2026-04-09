import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        Deno.env.get('STRIPE_PAYMENT_WEBHOOK_SECRET')
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const session = event.data?.object;
    const meta = session?.metadata || {};

    if (event.type === 'checkout.session.completed') {
      // Only handle service payments (has request_id but NOT professional_email)
      if (meta.request_id && !meta.professional_email) {
        const requestId = meta.request_id;

        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
        const request = requests[0];

        if (request) {
          // Update request payment status
          await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, {
            payment_status: 'paid',
          });

          const estimatedPrice = request.estimated_price || 0;
          const commission = Math.round(estimatedPrice * 0.1 * 100) / 100;
          const totalPrice = session.amount_total ? session.amount_total / 100 : estimatedPrice;

          // Create invoice
          await base44.asServiceRole.entities.Invoice.create({
            request_id: requestId,
            invoice_number: `INV-${Date.now()}`,
            category_name: request.category_name,
            professional_name: request.professional_name || '',
            professional_email: request.professional_email || '',
            base_price: estimatedPrice,
            commission,
            total_price: totalPrice,
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
              body: `Votre paiement de ${totalPrice}€ pour ${request.category_name} a été confirmé.`,
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
              body: `Paiement de ${totalPrice}€ reçu pour la mission ${request.category_name}.`,
              request_id: requestId,
              action_url: `/Chat?requestId=${requestId}`,
            });
          }
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      if (meta.request_id && !meta.professional_email) {
        const requestId = meta.request_id;
        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
        const request = requests[0];

        if (request?.customer_email) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: request.customer_email,
            recipient_type: 'particulier',
            type: 'payment_failed',
            title: 'Session de paiement expirée',
            body: 'Votre session de paiement a expiré. Veuillez réessayer.',
            request_id: requestId,
            action_url: `/Chat?requestId=${requestId}`,
          });
        }
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('stripePaymentWebhook error:', error);
    return Response.json({ received: true });
  }
});