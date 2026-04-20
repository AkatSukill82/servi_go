import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = base44.asServiceRole;

  // Create demo service requests
  const requests = await Promise.all([
    db.entities.ServiceRequestV2.create({
      category_name: 'Plombier',
      professional_name: 'Jean-Pierre Dubois',
      professional_email: 'jp.dubois@demo.com',
      customer_name: 'Demo User',
      customer_first_name: 'Demo',
      customer_last_name: 'User',
      customer_email: 'demo@apple-review.com',
      customer_address: 'Rue de la Loi 16, 1000 Bruxelles',
      scheduled_date: '2026-04-25',
      scheduled_time: '10:00',
      answers: [
        { question: 'Type de problème ?', answer: 'Fuite sous l\'évier de cuisine' },
        { question: 'Urgence ?', answer: 'Non, dans les 48h' }
      ],
      estimated_price: 120,
      status: 'contract_signed',
      is_urgent: false,
    }),
    db.entities.ServiceRequestV2.create({
      category_name: 'Électricien',
      professional_name: 'Marc Lecomte',
      professional_email: 'marc.lecomte@demo.com',
      customer_name: 'Demo User',
      customer_first_name: 'Demo',
      customer_last_name: 'User',
      customer_email: 'demo@apple-review.com',
      customer_address: 'Avenue Louise 54, 1050 Ixelles',
      scheduled_date: '2026-04-10',
      scheduled_time: '14:00',
      answers: [
        { question: 'Type de panne ?', answer: 'Disjoncteur qui saute régulièrement' },
        { question: 'Nombre de pièces ?', answer: '3' }
      ],
      estimated_price: 150,
      status: 'completed',
      is_urgent: false,
      review_requested: true,
    }),
    db.entities.ServiceRequestV2.create({
      category_name: 'Peintre',
      professional_name: 'Sophie Renard',
      professional_email: 'sophie.renard@demo.com',
      customer_name: 'Demo User',
      customer_first_name: 'Demo',
      customer_last_name: 'User',
      customer_email: 'demo@apple-review.com',
      customer_address: 'Chaussée de Waterloo 120, 1060 Saint-Gilles',
      scheduled_date: '2026-05-05',
      scheduled_time: '09:00',
      answers: [
        { question: 'Surface à peindre ?', answer: 'Salon + salle à manger, environ 40m²' },
        { question: 'Nombre de couleurs ?', answer: '2 couleurs' }
      ],
      estimated_price: 350,
      status: 'accepted',
      is_urgent: false,
    }),
    db.entities.ServiceRequestV2.create({
      category_name: 'Plombier',
      professional_name: 'Jean-Pierre Dubois',
      professional_email: 'jp.dubois@demo.com',
      customer_name: 'Demo User',
      customer_first_name: 'Demo',
      customer_last_name: 'User',
      customer_email: 'demo@apple-review.com',
      customer_address: 'Rue de la Loi 16, 1000 Bruxelles',
      scheduled_date: '2026-04-18',
      scheduled_time: '08:00',
      answers: [
        { question: 'Type de problème ?', answer: 'Chauffe-eau en panne' },
        { question: 'Urgence ?', answer: 'Oui, pas d\'eau chaude' }
      ],
      estimated_price: 200,
      status: 'completed',
      is_urgent: true,
      review_requested: true,
    }),
  ]);

  // Create conversations
  const convos = await Promise.all(
    requests.map((req, i) => {
      const pros = [
        { email: 'jp.dubois@demo.com', name: 'Jean-Pierre Dubois' },
        { email: 'marc.lecomte@demo.com', name: 'Marc Lecomte' },
        { email: 'sophie.renard@demo.com', name: 'Sophie Renard' },
        { email: 'jp.dubois@demo.com', name: 'Jean-Pierre Dubois' },
      ];
      return db.entities.Conversation.create({
        customer_email: 'demo@apple-review.com',
        customer_name: 'Demo User',
        professional_email: pros[i].email,
        professional_name: pros[i].name,
        request_id: req.id,
        last_message_at: new Date(Date.now() - i * 3600000).toISOString(),
        last_message_preview: 'Bonjour, je confirme ma disponibilité pour votre demande.',
        unread_count_customer: i === 0 ? 2 : 0,
        unread_count_pro: 0,
      });
    })
  );

  // Create messages for each conversation
  const messageGroups = [
    [
      { sender: 'customer', content: 'Bonjour, j\'ai une fuite sous mon évier. Pouvez-vous intervenir cette semaine ?' },
      { sender: 'pro', content: 'Bonjour ! Oui bien sûr, je suis disponible vendredi 25 avril à 10h. Cela vous convient ?' },
      { sender: 'customer', content: 'Parfait, je vous attends à cette heure-là !' },
      { sender: 'pro', content: 'Très bien, j\'apporte tout le matériel nécessaire. À vendredi !' },
    ],
    [
      { sender: 'customer', content: 'Bonjour Marc, mon disjoncteur saute tout le temps. C\'est urgent ?' },
      { sender: 'pro', content: 'Bonjour, ça peut indiquer un surcharge ou un problème sur le circuit. Je suis passé le 10 avril et tout est réglé maintenant.' },
      { sender: 'customer', content: 'Merci beaucoup, ça fonctionne parfaitement maintenant !' },
    ],
    [
      { sender: 'customer', content: 'Bonjour Sophie, j\'aimerais faire peindre mon salon. Vous êtes disponible en mai ?' },
      { sender: 'pro', content: 'Bonjour ! Oui, je peux venir le 5 mai. Je passerai d\'abord faire un devis gratuit si vous le souhaitez.' },
      { sender: 'customer', content: 'Super, le devis est parfait, on go pour le 5 mai !' },
      { sender: 'pro', content: 'Excellent ! Je confirme ma disponibilité pour le 5 mai à 9h.' },
    ],
    [
      { sender: 'customer', content: 'SOS ! Plus d\'eau chaude depuis ce matin, c\'est urgent !' },
      { sender: 'pro', content: 'Je comprends l\'urgence. J\'arrive demain matin à 8h. Votre chauffe-eau est électrique ou gaz ?' },
      { sender: 'customer', content: 'Électrique, 150L, marque Ariston.' },
      { sender: 'pro', content: 'Parfait, j\'apporte les pièces nécessaires. Mission terminée, tout est réparé !' },
    ],
  ];

  for (let i = 0; i < convos.length; i++) {
    const conv = convos[i];
    const req = requests[i];
    const proEmails = ['jp.dubois@demo.com', 'marc.lecomte@demo.com', 'sophie.renard@demo.com', 'jp.dubois@demo.com'];
    const proNames = ['Jean-Pierre Dubois', 'Marc Lecomte', 'Sophie Renard', 'Jean-Pierre Dubois'];
    const msgs = messageGroups[i];

    for (let j = 0; j < msgs.length; j++) {
      const isCustomer = msgs[j].sender === 'customer';
      await db.entities.Message.create({
        request_id: req.id,
        conversation_id: conv.id,
        sender_email: isCustomer ? 'demo@apple-review.com' : proEmails[i],
        recipient_email: isCustomer ? proEmails[i] : 'demo@apple-review.com',
        sender_name: isCustomer ? 'Demo User' : proNames[i],
        sender_type: isCustomer ? 'particulier' : 'professionnel',
        content: msgs[j].content,
        message_type: 'text',
      });
    }
  }

  // Create some reviews
  await Promise.all([
    db.entities.Review.create({
      request_id: requests[1].id,
      professional_email: 'marc.lecomte@demo.com',
      customer_name: 'Demo User',
      customer_email: 'demo@apple-review.com',
      rating: 5,
      comment: 'Marc est très professionnel et efficace. Problème résolu en moins d\'une heure. Je recommande vivement !',
      category_name: 'Électricien',
    }),
    db.entities.Review.create({
      request_id: requests[3].id,
      professional_email: 'jp.dubois@demo.com',
      customer_name: 'Demo User',
      customer_email: 'demo@apple-review.com',
      rating: 4,
      comment: 'Intervention rapide malgré l\'urgence. Jean-Pierre est ponctuel et soigneux. Très satisfait du résultat.',
      category_name: 'Plombier',
    }),
  ]);

  return Response.json({ success: true, requests: requests.length, convos: convos.length });
});