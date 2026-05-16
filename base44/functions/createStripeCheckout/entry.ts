import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { requestId, totalPrice, categoryName, proName, successUrl, cancelUrl } = await req.json();

    // Validation des paramètres
    if (!requestId || totalPrice === undefined || totalPrice === null) {
      console.warn('[createStripeCheckout] Paramètres manquants:', { requestId, totalPrice });
      return Response.json({ error: 'Paramètres manquants (requestId, totalPrice)' }, { status: 400 });
    }

    if (totalPrice <= 0) {
      console.warn('[createStripeCheckout] Prix invalide:', totalPrice);
      return Response.json({ error: 'Prix invalide (doit être > 0)' }, { status: 400 });
    }

    console.log('[createStripeCheckout] Creating session:', { requestId, totalPrice, categoryName });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: categoryName || 'Service',
              description: proName ? `Professionnel : ${proName}` : undefined,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get('origin')}/Invoices?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/Home`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        request_id: requestId,
      },
    });

    console.log('[createStripeCheckout] Session créée avec succès:', { sessionId: session.id, requestId });
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[createStripeCheckout] ERREUR:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    return Response.json({ error: error.message || 'Erreur Stripe' }, { status: 500 });
  }
});