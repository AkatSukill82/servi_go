import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get pro subscription to find stripe_customer_id
    const subs = await base44.asServiceRole.entities.ProSubscription.filter(
      { professional_email: user.email }, '-created_date', 1
    );

    if (subs.length === 0) return Response.json({ invoices: [] });

    const sub = subs[0];
    let customerId = sub.stripe_customer_id;

    // Fallback: find customer by email if no stored ID
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) return Response.json({ invoices: [] });
      customerId = customers.data[0].id;
      // Store for future use
      await base44.asServiceRole.entities.ProSubscription.update(sub.id, { stripe_customer_id: customerId });
    }

    const invoicesList = await stripe.invoices.list({ customer: customerId, limit: 24 });

    const invoices = invoicesList.data.map(inv => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString().split('T')[0],
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      pdf_url: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString().split('T')[0] : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString().split('T')[0] : null,
    }));

    return Response.json({ invoices });
  } catch (error) {
    console.error('getStripeInvoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});