import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'hsl(var(--background))' }}>
    <div className="px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-2xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-xs text-muted-foreground mb-8">Dernière mise à jour : mars 2025 — Conforme au RGPD</p>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">1. Responsable du traitement</h2>
          <p>ServiGo SRL — Belgique. Contact DPO : <strong>privacy@servigo.be</strong></p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">2. Données collectées</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Données d'identité : nom, prénom, email</li>
            <li>Données de localisation (adresse d'intervention)</li>
            <li>Données de paiement (traitées par Stripe — non stockées par ServiGo)</li>
            <li>Documents professionnels (carte d'identité, attestations)</li>
            <li>Historique des missions et évaluations</li>
            <li>Données de connexion et cookies techniques</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">3. Finalités du traitement</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Fourniture du service de mise en relation</li>
            <li>Vérification de l'identité des professionnels</li>
            <li>Traitement des paiements et émission de factures</li>
            <li>Amélioration de la plateforme (données anonymisées)</li>
            <li>Obligations légales et fiscales</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">4. Base légale</h2>
          <p>Le traitement repose sur l'exécution du contrat (art. 6.1.b RGPD), le consentement de l'utilisateur (art. 6.1.a), et les obligations légales (art. 6.1.c).</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">5. Conservation des données</h2>
          <p>Les données de compte sont conservées pendant toute la durée de la relation contractuelle + 3 ans. Les données de facturation sont conservées 7 ans (obligation légale belge).</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">6. Vos droits (RGPD)</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement ("droit à l'oubli")</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition au traitement</li>
          </ul>
          <p className="mt-2">Exercer vos droits : <strong>privacy@servigo.be</strong> — Réponse sous 30 jours.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">7. Cookies</h2>
          <p>Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement de la plateforme (session, préférences). Aucun cookie publicitaire tiers n'est utilisé.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">8. Transferts de données</h2>
          <p>Les données sont hébergées dans l'Union Européenne. Stripe (prestataire de paiement) est certifié PCI-DSS et traite les données conformément au RGPD.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">9. Réclamation</h2>
          <p>Vous pouvez introduire une réclamation auprès de l'<strong>Autorité de Protection des Données (APD)</strong> belge : <a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" className="text-primary underline">dataprotectionauthority.be</a></p>
        </section>
      </div>
    </div>
    </div>
  );
}