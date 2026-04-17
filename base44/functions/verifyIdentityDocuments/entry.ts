import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Maps document labels to their entity field names
const LABEL_TO_FIELD = {
  'Recto carte eID belge': 'eid_front_url',
  'Verso carte eID belge': 'eid_back_url',
  'Selfie avec carte eID': 'selfie_url',
  'Attestation assurance RC Pro': 'insurance_url',
  'Attestation ONSS / Indépendant': 'onss_url',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const verificationId = body.verificationId
      || body.event?.entity_id
      || body.data?.id;

    if (!verificationId) {
      return Response.json({ error: 'verificationId required' }, { status: 400 });
    }

    const records = await base44.asServiceRole.entities.IdentityVerification.filter({ id: verificationId });
    const verif = records[0];

    if (!verif) {
      return Response.json({ error: 'IdentityVerification not found' }, { status: 404 });
    }

    // Skip if already reviewed
    if (verif.status !== 'pending_review') {
      console.log(`[verifyIdentityDocuments] Skipping — already processed: ${verif.status}`);
      return Response.json({ message: `Already processed: ${verif.status}` });
    }

    const isPro = verif.user_type === 'professionnel';

    // Build list of documents to analyse
    const docsToAnalyse = [];
    if (verif.eid_front_url) docsToAnalyse.push({ label: 'Recto carte eID belge', url: verif.eid_front_url });
    if (verif.eid_back_url)  docsToAnalyse.push({ label: 'Verso carte eID belge', url: verif.eid_back_url });
    if (verif.selfie_url)    docsToAnalyse.push({ label: 'Selfie avec carte eID', url: verif.selfie_url });
    if (isPro) {
      if (verif.insurance_url) docsToAnalyse.push({ label: 'Attestation assurance RC Pro', url: verif.insurance_url });
      if (verif.onss_url)      docsToAnalyse.push({ label: 'Attestation ONSS / Indépendant', url: verif.onss_url });
    }

    if (docsToAnalyse.length === 0) {
      return Response.json({ message: 'No documents to analyse' });
    }

    const fileUrls = docsToAnalyse.map(d => d.url);
    const docLabels = docsToAnalyse.map((d, i) => `- Image ${i + 1} : ${d.label}`).join('\n');
    const userTypeLabel = isPro ? 'un professionnel' : 'un particulier';

    const prompt = `
Tu es un expert en vérification de documents d'identité pour une plateforme belge de services à domicile (ServiGo).
Tu vas analyser les documents soumis par ${userTypeLabel} pour vérifier leur authenticité.

Documents fournis (dans l'ordre des images) :
${docLabels}

Pour CHAQUE document, évalue :
1. Le document est-il lisible et visible ?
2. Les informations semblent-elles authentiques (pas de signes évidents de falsification) ?
3. Pour la carte eID : est-ce bien une carte d'identité belge (champs NOM, PRÉNOM, DATE DE NAISSANCE, N° NATIONAL, photo visible) ?
4. Pour le selfie : la personne tient-elle bien une carte d'identité visible ?
5. Pour l'assurance : y a-t-il un en-tête d'assureur, un numéro de police, une date de validité ? (un permis de conduire N'EST PAS une assurance)
6. Pour l'ONSS/indépendant : y a-t-il un en-tête officiel, un numéro BCE, une date ?

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "decision": "approved" | "rejected" | "manual_review",
  "confidence": 0.0 à 1.0,
  "documents": [{ "label": "...", "valid": true | false, "reason": "..." }],
  "rejection_reason": "..." (uniquement si decision = rejected),
  "summary": "Résumé en 1-2 phrases pour l'admin"
}

Critères :
- "approved" : tous les documents requis sont présents, lisibles et semblent authentiques (confidence >= 0.80)
- "rejected" : au moins un document est clairement falsifié, illisible, ou ne correspond pas au type attendu
- "manual_review" : documents présents mais qualité insuffisante pour décider automatiquement
`.trim();

    console.log(`[verifyIdentityDocuments] Analysing ${fileUrls.length} docs for ${verificationId} (${verif.user_type})`);

    // Mark as in-progress to prevent duplicate runs
    await base44.asServiceRole.entities.IdentityVerification.update(verificationId, {
      rejection_reason: '[IA en cours d\'analyse...]',
    });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          decision: { type: 'string' },
          confidence: { type: 'number' },
          documents: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, valid: { type: 'boolean' }, reason: { type: 'string' } } } },
          rejection_reason: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    });

    console.log(`[verifyIdentityDocuments] AI result for ${verificationId}:`, JSON.stringify(result));

    const { decision, summary = '', rejection_reason: rejectionReason = '', confidence = 0, documents = [] } = result;

    // Build per-doc results with field mapping
    const aiDocumentResults = documents.map(doc => ({
      label: doc.label,
      field: LABEL_TO_FIELD[doc.label] || null,
      valid: doc.valid,
      reason: doc.reason,
    }));

    if (decision === 'approved') {
      await base44.asServiceRole.entities.IdentityVerification.update(verificationId, {
        status: 'approved',
        reviewed_by: 'IA ServiGo',
        reviewed_date: new Date().toISOString(),
        rejection_reason: null,
        ai_document_results: aiDocumentResults,
        ai_summary: summary,
      });

      const users = await base44.asServiceRole.entities.User.filter({ email: verif.user_email });
      if (users[0]) {
        const updateData = { eid_status: 'verified' };
        if (isPro) updateData.verification_status = 'verified';
        await base44.asServiceRole.entities.User.update(users[0].id, updateData);
      }

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: verif.user_email,
        recipient_type: isPro ? 'professionnel' : 'particulier',
        type: 'subscription_activated',
        title: '✅ Identité vérifiée automatiquement !',
        body: `Vos documents ont été validés par notre système IA. ${summary}`,
        action_url: isPro ? '/ProProfile' : '/Profile',
      });

      console.log(`[verifyIdentityDocuments] APPROVED ${verificationId} (confidence: ${confidence})`);

    } else if (decision === 'rejected') {
      const invalidDocs = aiDocumentResults.filter(d => !d.valid).map(d => d.label).join(', ');

      await base44.asServiceRole.entities.IdentityVerification.update(verificationId, {
        status: 'rejected',
        reviewed_by: 'IA ServiGo',
        reviewed_date: new Date().toISOString(),
        rejection_reason: rejectionReason || summary,
        ai_document_results: aiDocumentResults,
        ai_summary: summary,
      });

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: verif.user_email,
        recipient_type: isPro ? 'professionnel' : 'particulier',
        type: 'payment_failed',
        title: '❌ Documents à corriger',
        body: `Certains documents n'ont pas été acceptés : ${invalidDocs}. Veuillez les re-soumettre.`,
        action_url: isPro ? '/ProVerificationOnboarding' : '/EidVerification',
      });

      console.log(`[verifyIdentityDocuments] REJECTED ${verificationId}: ${rejectionReason}`);

    } else {
      // manual_review — save doc results too so admin/user can see the partial analysis
      await base44.asServiceRole.entities.IdentityVerification.update(verificationId, {
        rejection_reason: `[Révision manuelle requise] ${summary}`,
        ai_document_results: aiDocumentResults,
        ai_summary: summary,
      });

      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          recipient_type: 'admin',
          type: 'new_mission',
          title: '🔍 Vérification manuelle requise',
          body: `Le dossier de ${verif.user_name || verif.user_email} nécessite une vérification manuelle. ${summary}`,
          action_url: '/AdminVerification',
        });
      }

      console.log(`[verifyIdentityDocuments] MANUAL_REVIEW required for ${verificationId}`);
    }

    return Response.json({ verificationId, decision, confidence, summary, documentsAnalysed: docsToAnalyse.length, aiDocumentResults });

  } catch (error) {
    console.error('[verifyIdentityDocuments] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});