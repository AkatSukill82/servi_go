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

    // Use the calling admin's email as the test customer
    const CUST = user.email;
    const CUST_NAME = user.full_name || 'Utilisateur Test';
    const CUST_PHONE = '+32 470 00 11 22';
    const CUST_ADDR = 'Rue de la Loi 16, 1000 Bruxelles';

    const P1 = 'jp.dubois@demo.com';
    const P2 = 'marc.lecomte@demo.com';
    const P3 = 'sophie.renard@demo.com';

    console.log('Starting seed for:', CUST);

    // --- ServiceRequestV2 ---
    const sr1 = await db.entities.ServiceRequestV2.create({
      category_name: 'Plombier',
      professional_email: P1, professional_name: 'Jean-Pierre Dubois',
      customer_email: CUST, customer_name: CUST_NAME,
      customer_first_name: CUST_NAME.split(' ')[0], customer_last_name: CUST_NAME.split(' ')[1] || '',
      customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      scheduled_date: '2026-04-25', scheduled_time: '10:00',
      estimated_price: 120, status: 'contract_signed',
      answers: [{ question: 'Type de problème ?', answer: "Fuite sous l'évier" }],
    });
    const sr2 = await db.entities.ServiceRequestV2.create({
      category_name: 'Électricien',
      professional_email: P2, professional_name: 'Marc Lecomte',
      customer_email: CUST, customer_name: CUST_NAME,
      customer_first_name: CUST_NAME.split(' ')[0], customer_last_name: CUST_NAME.split(' ')[1] || '',
      customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      scheduled_date: '2026-04-28', scheduled_time: '14:00',
      estimated_price: 90, status: 'contract_pending',
      answers: [{ question: 'Type de panne ?', answer: 'Disjoncteur qui saute' }],
    });
    const sr3 = await db.entities.ServiceRequestV2.create({
      category_name: 'Plombier',
      professional_email: P1, professional_name: 'Jean-Pierre Dubois',
      customer_email: CUST, customer_name: CUST_NAME,
      customer_first_name: CUST_NAME.split(' ')[0], customer_last_name: CUST_NAME.split(' ')[1] || '',
      customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      scheduled_date: '2026-04-10', scheduled_time: '09:00',
      estimated_price: 210, final_price: 210, status: 'completed',
      review_requested: true,
      answers: [{ question: 'Type de travaux ?', answer: 'Remplacement chauffe-eau 150L' }],
    });
    const sr4 = await db.entities.ServiceRequestV2.create({
      category_name: 'Nettoyage',
      professional_email: P3, professional_name: 'Sophie Renard',
      customer_email: CUST, customer_name: CUST_NAME,
      customer_first_name: CUST_NAME.split(' ')[0], customer_last_name: CUST_NAME.split(' ')[1] || '',
      customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      scheduled_date: '2026-03-15', scheduled_time: '09:00',
      estimated_price: 80, final_price: 80, status: 'completed',
      review_requested: true,
      answers: [{ question: 'Surface approximative ?', answer: '80m²' }],
    });
    console.log('ServiceRequests done');

    // --- Contracts ---
    await db.entities.MissionContract.create({
      request_id: sr1.id, contract_number: `CTR-2026-${Date.now()}-1`,
      customer_email: CUST, customer_name: CUST_NAME, customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      professional_email: P1, professional_name: 'Jean-Pierre Dubois', professional_phone: '+32 470 12 34 56', professional_bce: '0789.123.456',
      category_name: 'Plombier', service_description: "Réparation fuite d'eau sous l'évier de la cuisine.",
      scheduled_date: '2026-04-25', scheduled_time: '10:00', estimated_duration_hours: 2, agreed_price: 120,
      price_includes_materials: true, payment_terms: 'after_completion', status: 'signed_both',
      signature_customer: SIG, signature_customer_date: '2026-04-22T09:15:00Z',
      signature_pro: SIG, signature_pro_date: '2026-04-22T10:00:00Z',
      cancellation_policy: 'free_24h', completion_confirmed_customer: false, completion_confirmed_pro: false,
      governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2'
    });
    await db.entities.MissionContract.create({
      request_id: sr2.id, contract_number: `CTR-2026-${Date.now()}-2`,
      customer_email: CUST, customer_name: CUST_NAME, customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      professional_email: P2, professional_name: 'Marc Lecomte', professional_phone: '+32 478 98 76 54', professional_bce: '0654.789.012',
      category_name: 'Électricien', service_description: 'Diagnostic et réparation panne électrique.',
      scheduled_date: '2026-04-28', scheduled_time: '14:00', estimated_duration_hours: 3, agreed_price: 90,
      price_includes_materials: false, payment_terms: 'after_completion', status: 'sent_to_customer',
      signature_pro: SIG, signature_pro_date: '2026-04-21T15:00:00Z',
      cancellation_policy: 'free_24h', completion_confirmed_customer: false, completion_confirmed_pro: false,
      governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2'
    });
    await db.entities.MissionContract.create({
      request_id: sr3.id, contract_number: `CTR-2026-${Date.now()}-3`,
      customer_email: CUST, customer_name: CUST_NAME, customer_phone: CUST_PHONE, customer_address: CUST_ADDR,
      professional_email: P1, professional_name: 'Jean-Pierre Dubois', professional_phone: '+32 470 12 34 56', professional_bce: '0789.123.456',
      category_name: 'Plombier', service_description: 'Remplacement chauffe-eau électrique 150L.',
      scheduled_date: '2026-04-10', scheduled_time: '09:00', estimated_duration_hours: 4, agreed_price: 210,
      price_includes_materials: true, payment_terms: 'cash_on_site', status: 'completed',
      signature_customer: SIG, signature_customer_date: '2026-04-09T18:00:00Z',
      signature_pro: SIG, signature_pro_date: '2026-04-09T18:30:00Z',
      completion_confirmed_customer: true, completion_confirmed_pro: true, completion_date: '2026-04-10T13:00:00Z',
      cancellation_policy: 'free_24h', governing_law: 'Droit belge', jurisdiction: 'Tribunaux de Bruxelles', terms_version: 'v1.2'
    });
    console.log('Contracts done');

    // --- Reviews (from admin user + others for display) ---
    await db.entities.Review.create({ request_id: sr3.id, professional_email: P1, customer_name: CUST_NAME, customer_email: CUST, rating: 5, comment: "Excellent ! Chauffe-eau remplacé en 2h. Je recommande vivement.", category_name: 'Plombier' });
    await db.entities.Review.create({ request_id: sr4.id, professional_email: P3, customer_name: CUST_NAME, customer_email: CUST, rating: 5, comment: "Sophie est fantastique ! Appartement impeccable en moins de 3h.", category_name: 'Nettoyage' });
    await db.entities.Review.create({ request_id: 'rnd1', professional_email: P2, customer_name: 'Thomas Bernard', customer_email: 'thomas.bernard@test.com', rating: 5, comment: "Marc est très compétent. Tarifs corrects.", category_name: 'Électricien' });
    await db.entities.Review.create({ request_id: 'rnd2', professional_email: P1, customer_name: 'Marie Leclerc', customer_email: 'marie.leclerc@test.com', rating: 4, comment: "Bon travail, résultat parfait.", category_name: 'Plombier' });
    await db.entities.Review.create({ request_id: 'rnd3', professional_email: P2, customer_name: 'Emma Rousseau', customer_email: 'emma.rousseau@test.com', rating: 5, comment: "Tableau électrique mis à jour en une journée.", category_name: 'Électricien' });
    await db.entities.Review.create({ request_id: 'rnd4', professional_email: P3, customer_name: 'Lucas Fontaine', customer_email: 'lucas.fontaine@test.com', rating: 4, comment: "Très bonne prestation, appartement nickel.", category_name: 'Nettoyage' });
    await db.entities.Review.create({ request_id: 'rnd5', professional_email: P1, customer_name: 'Julien Moreau', customer_email: 'julien.moreau@test.com', rating: 5, comment: "Fuite réparée en 1h30. Très pro !", category_name: 'Plombier' });
    console.log('Reviews done');

    // --- Subscriptions ---
    await db.entities.ProSubscription.create({ professional_email: P1, professional_name: 'Jean-Pierre Dubois', plan: 'monthly', price: 10, status: 'active', started_date: '2026-03-01', renewal_date: '2026-05-01', missions_received: 12, auto_renew: true, payment_method: 'stripe' });
    await db.entities.ProSubscription.create({ professional_email: P2, professional_name: 'Marc Lecomte', plan: 'monthly', price: 10, status: 'active', started_date: '2026-03-01', renewal_date: '2026-05-01', missions_received: 8, auto_renew: true, payment_method: 'stripe' });
    await db.entities.ProSubscription.create({ professional_email: P3, professional_name: 'Sophie Renard', plan: 'annual', price: 100, status: 'active', started_date: '2026-01-01', renewal_date: '2027-01-01', missions_received: 34, auto_renew: true, payment_method: 'stripe' });
    console.log('Subscriptions done');

    // --- Conversations ---
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: CUST_NAME, professional_email: P1, professional_name: 'Jean-Pierre Dubois', request_id: sr1.id, last_message_at: new Date().toISOString(), last_message_preview: "Je serai là à 10h pile 👍", unread_count_customer: 1, unread_count_pro: 0 });
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: CUST_NAME, professional_email: P2, professional_name: 'Marc Lecomte', request_id: sr2.id, last_message_at: new Date(Date.now() - 3600000).toISOString(), last_message_preview: 'Le contrat a été envoyé, merci de le signer 😊', unread_count_customer: 2, unread_count_pro: 0 });
    await db.entities.Conversation.create({ customer_email: CUST, customer_name: CUST_NAME, professional_email: P1, professional_name: 'Jean-Pierre Dubois', request_id: sr3.id, last_message_at: new Date(Date.now() - 86400000 * 11).toISOString(), last_message_preview: "Merci ! Bonne journée 🔧", unread_count_customer: 0, unread_count_pro: 0 });
    console.log('Conversations done');

    // --- Messages ---
    await db.entities.Message.create({ request_id: sr1.id, sender_email: P1, sender_name: 'Jean-Pierre Dubois', sender_type: 'professionnel', recipient_email: CUST, content: "Bonjour ! Je confirme ma venue demain à 10h pour la réparation de la fuite.", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr1.id, sender_email: CUST, sender_name: CUST_NAME, sender_type: 'particulier', recipient_email: P1, content: "Parfait, merci ! La porte d'entrée code est 1234.", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr1.id, sender_email: P1, sender_name: 'Jean-Pierre Dubois', sender_type: 'professionnel', recipient_email: CUST, content: "Je serai là à 10h pile 👍", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr2.id, sender_email: P2, sender_name: 'Marc Lecomte', sender_type: 'professionnel', recipient_email: CUST, content: "Bonjour, j'ai envoyé le contrat pour signature. Pouvez-vous le signer dès que possible ?", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr2.id, sender_email: P2, sender_name: 'Marc Lecomte', sender_type: 'professionnel', recipient_email: CUST, content: "Le contrat a été envoyé, merci de le signer 😊", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr3.id, sender_email: CUST, sender_name: CUST_NAME, sender_type: 'particulier', recipient_email: P1, content: "Bonjour, le chauffe-eau a rendu l'âme cette nuit...", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr3.id, sender_email: P1, sender_name: 'Jean-Pierre Dubois', sender_type: 'professionnel', recipient_email: CUST, content: "Pas de panique ! Je vous installe un modèle 150L aujourd'hui même.", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr3.id, sender_email: CUST, sender_name: CUST_NAME, sender_type: 'particulier', recipient_email: P1, content: "Super, merci infiniment pour votre rapidité !", message_type: 'text' });
    await db.entities.Message.create({ request_id: sr3.id, sender_email: P1, sender_name: 'Jean-Pierre Dubois', sender_type: 'professionnel', recipient_email: CUST, content: "Merci ! Bonne journée 🔧", message_type: 'text' });
    console.log('Messages done');

    // --- Invoice ---
    await db.entities.Invoice.create({
      request_id: sr3.id, invoice_number: `FAC-2026-${Date.now()}`,
      invoice_date: '2026-04-10', service_date: '2026-04-10', payment_due_date: '2026-04-24',
      payment_terms: '30 jours fin de mois', category_name: 'Plombier',
      professional_name: 'Jean-Pierre Dubois', professional_email: P1,
      professional_bce: '0789.123.456', professional_tva: 'BE 0789.123.456',
      professional_address: 'Rue du Midi 42, 1000 Bruxelles',
      customer_name: CUST_NAME, customer_email: CUST, customer_address: CUST_ADDR,
      currency: 'EUR',
      line_items: [{ description: 'Remplacement chauffe-eau 150L + installation', quantity: 1, unit_price: 173.55, vat_rate: 21, line_total: 210 }],
      subtotal_ht: 173.55, total_vat: 36.45, total_ttc: 210,
      base_price: 210, total_price: 210, payment_method: 'cash', payment_status: 'paid'
    });
    console.log('Invoice done');

    // --- Notifications ---
    await db.entities.Notification.create({ recipient_email: CUST, recipient_type: 'particulier', type: 'contract_to_sign', title: 'Contrat à signer — Électricien', body: 'Marc Lecomte a envoyé un contrat pour votre mission du 28 avril. Signez-le pour confirmer.', request_id: sr2.id, is_read: false, action_url: `/Chat?requestId=${sr2.id}` });
    await db.entities.Notification.create({ recipient_email: CUST, recipient_type: 'particulier', type: 'mission_accepted', title: 'Mission acceptée — Plombier', body: 'Jean-Pierre Dubois a accepté votre demande de plomberie pour le 25 avril à 10h.', request_id: sr1.id, is_read: false, action_url: `/Chat?requestId=${sr1.id}` });
    await db.entities.Notification.create({ recipient_email: CUST, recipient_type: 'particulier', type: 'review_request', title: "Comment s'est passée votre mission ?", body: "Évaluez Jean-Pierre Dubois pour sa prestation Plombier.", request_id: sr3.id, is_read: true, action_url: `/Chat?requestId=${sr3.id}` });
    console.log('Notifications done');

    return Response.json({ success: true, message: `All test data created successfully for ${CUST}` });
  } catch (error) {
    console.error('Seed error:', error.message, JSON.stringify(error.data || {}));
    return Response.json({ error: error.message }, { status: 500 });
  }
});