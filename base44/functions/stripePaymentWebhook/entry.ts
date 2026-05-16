import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    console.log('[stripePaymentWebhook] Webhook validé:', { type: event.type, id: event.id });
  } catch (err) {
    console.error('[stripePaymentWebhook] Signature failed:', {
      message: err.message,
      code: err.code,
    });
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const requestId = session.metadata?.request_id;
    const proEmail = session.metadata?.professional_email;

    // Only handle service payment sessions (not subscription sessions)
    if (requestId && !proEmail) {
      try {
        console.log('[stripePaymentWebhook] Processing payment completion:', { requestId, sessionId: session.id });
        
        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
        const request = requests[0];
        if (!request) {
          console.error('[stripePaymentWebhook] ServiceRequestV2 not found:', requestId);
          return Response.json({ received: true });
        }

        // Update request payment status
        await base44.asServiceRole.entities.ServiceRequestV2.update(requestId, { payment_status: 'paid' });
        console.log('[stripePaymentWebhook] Payment status updated:', { requestId, status: 'paid' });

        const estimatedPrice = request.estimated_price || 0;
        const commission = estimatedPrice * 0.10;
        const totalPrice = (session.amount_total || 0) / 100;

        // Create invoice record
        try {
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
          console.log('[stripePaymentWebhook] Invoice créée:', { requestId, totalPrice });
        } catch (invoiceErr) {
          console.error('[stripePaymentWebhook] Invoice creation failed:', { requestId, error: invoiceErr.message });
        }

        // Notify customer
        if (request.customer_email) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: request.customer_email,
              recipient_type: 'particulier',
              type: 'payment_received',
              title: 'Paiement confirmé ✅',
              body: `Votre paiement de ${totalPrice.toFixed(2)} € pour ${request.category_name} a été reçu.`,
              request_id: requestId,
              action_url: `/Chat?requestId=${requestId}`,
            });
            console.log('[stripePaymentWebhook] Notification client créée:', request.customer_email);
          } catch (notifErr) {
            console.error('[stripePaymentWebhook] Customer notification failed:', { email: request.customer_email, error: notifErr.message });
          }
        }

        // Notify professional
        if (request.professional_email) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: request.professional_email,
              recipient_type: 'professionnel',
              type: 'payment_received',
              title: 'Paiement reçu 💶',
              body: `Paiement de ${totalPrice.toFixed(2)} € reçu pour la mission ${request.category_name}.`,
              request_id: requestId,
              action_url: `/Chat?requestId=${requestId}`,
            });
            console.log('[stripePaymentWebhook] Notification pro créée:', request.professional_email);
          } catch (notifErr) {
            console.error('[stripePaymentWebhook] Pro notification failed:', { email: request.professional_email, error: notifErr.message });
          }
        }

        console.log('[stripePaymentWebhook] Payment completed successfully:', { requestId, totalPrice, sessionId: session.id });
      } catch (err) {
        console.error('[stripePaymentWebhook] checkout.session.completed error:', {
          requestId,
          message: err.message,
          stack: err.stack,
        });
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const requestId = session.metadata?.request_id;
    const proEmail = session.metadata?.professional_email;

    if (requestId && !proEmail) {
      try {
        console.log('[stripePaymentWebhook] Processing session expiration:', { requestId, sessionId: session.id });
        
        const requests = await base44.asServiceRole.entities.ServiceRequestV2.filter({ id: requestId });
        const request = requests[0];
        if (request?.customer_email) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: request.customer_email,
              recipient_type: 'particulier',
              type: 'payment_failed',
              title: 'Session de paiement expirée',
              body: 'Votre session de paiement a expiré. Veuillez relancer le paiement.',
              request_id: requestId,
              action_url: `/Chat?requestId=${requestId}`,
            });
            console.log('[stripePaymentWebhook] Expiration notification sent:', request.customer_email);
          } catch (notifErr) {
            console.error('[stripePaymentWebhook] Expiration notification failed:', { email: request.customer_email, error: notifErr.message });
          }
        }
        console.log('[stripePaymentWebhook] Payment session expired processed:', { requestId, sessionId: session.id });
      } catch (err) {
        console.error('[stripePaymentWebhook] checkout.session.expired error:', {
          requestId,
          message: err.message,
          stack: err.stack,
        });
      }
    }
  }

  return Response.json({ received: true });
});