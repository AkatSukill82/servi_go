import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* ok */ }
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const REQ1 = '69e7d2359a0161fc1a09b0ee';
    const REQ2 = '69e7d2359a0161fc1a09b0ef';
    const REQ3 = '69e7d2359a0161fc1a09b0f0';
    const REQ4 = '69e7d2359a0161fc1a09b0f1';
    const CUST = 'apple.test.user@icloud.com';
    const P1 = 'jp.dubois@demo.com';
    const P2 = 'marc.lecomte@demo.com';
    const P3 = 'sophie.renard@demo.com';

    console.log('Starting seed...');

    // Contracts — skipped (RLS strict, created via app flow)
    // await db.entities.MissionContract.create({ request_id: REQ1, contract_number: 'CTR-2026-TEST-001', customer_email: CUST, customer_name: 'Alice Martin', customer_phone: '+32 470 00 11 22', customer_address: 'Rue de la Loi 16, 1000 Bruxelles', professional_email: P1, professional_name: 'Jean-Pierre Dubois', professional_phone: '+32 470 12 34 56', professional_bce: '0789.123.456', category_name: 'Plombier', service_description: "Réparation fuite d'eau sous l'évier de la cuisine.", scheduled_date: '2026-04-25', scheduled_time: '10:00', estimated_duration_hours: 2, agreed_price: 120, price_includes_materials: true, payment_terms: 'after_completion', status: 'signed_both', signature_customer: SIG, signature_customer_date: '2026-04-22T09:15:00Z', signature_pro: SIG, signature_pro_date: '2026-04-22T10:00:00Z', cancellation_policy: 'free_24h', completion_confirmed_customer: false, completion_confirmed_pro: false, governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2' });
    console.log('Contract 1 done');
    await db.entities.MissionContract.create({ request_id: REQ2, contract_number: 'CTR-2026-TEST-002', customer_email: CUST, customer_name: 'Alice Martin', customer_phone: '+32 470 00 11 22', customer_address: 'Rue de la Loi 16, 1000 Bruxelles', professional_email: P2, professional_name: 'Marc Lecomte', professional_phone: '+32 478 98 76 54', professional_bce: '0654.789.012', category_name: 'Électricien', service_description: 'Diagnostic et réparation panne électrique.', scheduled_date: '2026-04-28', scheduled_time: '14:00', estimated_duration_hours: 3, agreed_price: 90, price_includes_materials: false, payment_terms: 'after_completion', status: 'signed_both', signature_customer: SIG, signature_customer_date: '2026-04-21T14:30:00Z', signature_pro: SIG, signature_pro_date: '2026-04-21T15:00:00Z', cancellation_policy: 'free_24h', completion_confirmed_customer: false, completion_confirmed_pro: false, governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2' });
    console.log('Contract 2 done');
    await db.entities.MissionContract.create({ request_id: REQ3, contract_number: 'CTR-2026-TEST-003', customer_email: CUST, customer_name: 'Alice Martin', customer_phone: '+32 470 00 11 22', customer_address: 'Rue de la Loi 16, 1000 Bruxelles', professional_email: P1, professional_name: 'Jean-Pierre Dubois', professional_phone: '+32 470 12 34 56', professional_bce: '0789.123.456', category_name: 'Plombier', service_description: 'Remplacement chauffe-eau électrique 150L.', scheduled_date: '2026-04-10', scheduled_time: '09:00', estimated_duration_hours: 4, agreed_price: 210, price_includes_materials: true, payment_terms: 'cash_on_site', status: 'completed', signature_customer: SIG, signature_customer_date: '2026-04-09T18:00:00Z', signature_pro: SIG, signature_pro_date: '2026-04-09T18:30:00Z', completion_confirmed_customer: true, completion_confirmed_pro: true, completion_date: '2026-04-10T13:00:00Z', cancellation_policy: 'free_24h', governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2' });
    console.log('Contract 3 done');

    // Reviews
    await db.entities.Review.create({ request_id: REQ3, professional_email: P1, customer_name: 'Alice Martin', customer_email: CUST, rating: 5, comment: "Excellent ! Chauffe-eau remplacé en 2h. Je recommande vivement.", category_name: 'Plombier' });
    await db.entities.Review.create({ request_id: REQ4, professional_email: P2, customer_name: 'Thomas Bernard', customer_email: 'thomas.bernard@test.com', rating: 5, comment: "Marc est très compétent. Tarifs corrects.", category_name: 'Électricien' });
    await db.entities.Review.create({ request_id: 'rnd1', professional_email: P3, customer_name: 'Claire Dupont', customer_email: 'claire.dupont@test.com', rating: 5, comment: "Sophie est fantastique ! Appartement impeccable.", category_name: 'Nettoyage' });
    await db.entities.Review.create({ request_id: 'rnd2', professional_email: P1, customer_name: 'Marie Leclerc', customer_email: 'marie.leclerc@test.com', rating: 4, comment: "Bon travail, résultat parfait.", category_name: 'Plombier' });
    await db.entities.Review.create({ request_id: 'rnd3', professional_email: P2, customer_name: 'Alice Martin', customer_email: CUST, rating: 5, comment: "Tableau électrique mis à jour en une journée.", category_name: 'Électricien' });
    await db.entities.Review.create({ request_id: 'rnd4', professional_email: P3, customer_name: 'Lucas Fontaine', customer_email: 'lucas.fontaine@test.com', rating: 4, comment: "Très bonne prestation, appartement nickel.", category_name: 'Nettoyage' });
    await db.entities.Review.create({ request_id: 'rnd5', professional_email: P1, customer_name: 'Emma Rousseau', customer_email: 'emma.rousseau@test.com', rating: 5, comment: "Fuite réparée en 1h30. Très pro !", category_name: 'Plombier' });
    await db.entities.Review.create({ request_id: 'rnd6', professional_email: P2, customer_name: 'Julien Moreau', customer_email: 'julien.moreau@test.com', rating: 5, comment: "Installation impeccable, respect des délais.", category_name: 'Électricien' });
    console.log('Reviews done');

    // Subscriptions
    await db.entities.ProSubscription.create({ professional_email: P1, professional_name: 'Jean-Pierre Dubois', plan: 'monthly', price: 10, status: 'active', started_date: '2026-03-01', renewal_date: '2026-05-01', missions_received: 12, auto_renew: true, payment_method: 'stripe' });
    await db.entities.ProSubscription.create({ professional_email: P2, professional_name: 'Marc Lecomte', plan: 'monthly', price: 10, status: 'active', started_date: '2026-03-01', renewal_date: '2026-05-01', missions_received: 8, auto_renew: true, payment_method: 'stripe' });
    await db.entities.ProSubscription.create({ professional_email: P3, professional_name: 'Sophie Renard', plan: 'annual', price: 100, status: 'active', started_date: '2026-01-01', renewal_date: '2027-01-01', missions_received: 34, auto_renew: true, payment_method: 'stripe' });
    console.log('Subscriptions done');

    // Conversations
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: 'Alice Martin', professional_email: P1, professional_name: 'Jean-Pierre Dubois', request_id: REQ1, last_message_at: new Date().toISOString(), last_message_preview: "Je serai là à 10h pile 👍", unread_count_customer: 1, unread_count_pro: 0 });
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: 'Alice Martin', professional_email: P2, professional_name: 'Marc Lecomte', request_id: REQ2, last_message_at: new Date(Date.now() - 3600000).toISOString(), last_message_preview: 'Le contrat a été envoyé, merci de le signer 😊', unread_count_customer: 2, unread_count_pro: 0 });
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: 'Alice Martin', professional_email: P1, professional_name: 'Jean-Pierre Dubois', request_id: REQ3, last_message_at: new Date(Date.now() - 86400000 * 11).toISOString(), last_message_preview: "Merci Alice ! Bonne journée 🔧", unread_count_customer: 0, unread_count_pro: 0 });
    console.log('Conversations done');

    // Invoice
    await db.entities.Invoice.create({ request_id: REQ3, invoice_number: 'FAC-2026-TEST-001', invoice_date: '2026-04-10', service_date: '2026-04-10', payment_due_date: '2026-04-24', payment_terms: '30 jours fin de mois', category_name: 'Plombier', professional_name: 'Jean-Pierre Dubois', professional_email: P1, professional_bce: '0789.123.456', professional_tva: 'BE 0789.123.456', professional_address: 'Rue du Midi 42, 1000 Bruxelles', customer_name: 'Alice Martin', customer_email: CUST, customer_address: 'Rue de la Loi 16, 1000 Bruxelles', currency: 'EUR', line_items: [{ description: 'Remplacement chauffe-eau 150L + installation', quantity: 1, unit_price: 173.55, vat_rate: 21, line_total: 210 }], subtotal_ht: 173.55, total_vat: 36.45, total_ttc: 210, base_price: 210, total_price: 210, payment_method: 'cash', payment_status: 'paid' });
    console.log('Invoice done');

    return Response.json({ success: true, message: 'All test data created successfully' });
  } catch (error) {
    console.error('Seed error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});