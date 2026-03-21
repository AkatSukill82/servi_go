import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { requestId, totalPrice, categoryName, proName, successUrl, cancelUrl } = await req.json();

    if (!requestId || !totalPrice) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
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

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});