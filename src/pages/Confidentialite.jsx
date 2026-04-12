import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: "1. Responsable du traitement",
    content: `ServiGo, dont le siège social est établi en Belgique. Contact DPO : privacy@servigo.be`
  },
  {
    title: "2. Données collectées",
    content: `ServiGo collecte les données suivantes :\n\n• Données d'identité : nom, prénom, date de naissance, numéro national (pour vérification eID), photo.\n• Données de contact : adresse email, numéro de téléphone, adresse postale.\n• Données professionnelles (Pros uniquement) : numéro BCE, attestation d'assurance, documents ONSS.\n• Données de géolocalisation : coordonnées GPS lors des demandes de service (avec consentement explicite).\n• Données de navigation : adresse IP, données de connexion, logs techniques.\n• Données financières : historique des paiements d'abonnement (aucune donnée de carte bancaire n'est stockée sur nos serveurs — traitement exclusif via Stripe).`
  },
  {
    title: "3. Finalités et bases légales",
    content: `• Exécution du contrat : mise en relation Client/Pro, gestion des missions, facturation.\n• Obligation légale : conservation des factures (7 ans — Code belge des sociétés), vérification d'identité (lutte contre la fraude).\n• Intérêt légitime : amélioration de la Plateforme, prévention des abus, sécurité.\n• Consentement : envoi de notifications marketing, géolocalisation.`
  },
  {
    title: "4. Durée de conservation",
    content: `• Données de compte actif : durée de la relation contractuelle + 2 ans.\n• Factures et données financières : 7 ans (obligation légale belge).\n• Documents d'identité : supprimés 30 jours après vérification ou rejet.\n• Données de géolocalisation : non conservées au-delà de la durée de la mission.\n• Données de navigation : 13 mois maximum.`
  },
  {
    title: "5. Destinataires des données",
    content: `• Stripe Inc. : traitement des paiements (certifié PCI-DSS).\n• Base44 : hébergement de la Plateforme (infrastructure cloud sécurisée).\n• Autorités compétentes : uniquement sur réquisition judiciaire.\n\nAucune vente ou cession de données à des tiers à des fins commerciales.`
  },
  {
    title: "6. Droits des personnes concernées",
    content: `Conformément au RGPD, vous disposez des droits suivants :\n\n• Droit d'accès (art. 15)\n• Droit de rectification (art. 16)\n• Droit à l'effacement (art. 17)\n• Droit à la limitation du traitement (art. 18)\n• Droit à la portabilité (art. 20)\n• Droit d'opposition (art. 21)\n\nPour exercer vos droits : privacy@servigo.be — Réponse sous 30 jours maximum.\n\nVous pouvez également introduire une réclamation auprès de l'Autorité de Protection des Données (APD) belge : www.autoriteprotectiondonnees.be`
  },
  {
    title: "7. Sécurité des données",
    content: `ServiGo met en œuvre les mesures techniques et organisationnelles appropriées :\n\n• Chiffrement des données en transit (TLS 1.3)\n• Authentification à deux facteurs disponible\n• Journalisation des accès aux données sensibles\n• Revue régulière des droits d'accès internes`
  },
  {
    title: "8. Cookies",
    content: `La Plateforme utilise des cookies strictement nécessaires au fonctionnement (pas de cookies publicitaires tiers). Un bandeau de consentement informe les utilisateurs lors de la première visite.`
  },
];

export default function Confidentialite() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Politique de Confidentialité</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-sm font-semibold text-foreground">Politique de Confidentialité et Protection des Données Personnelles</p>
          <p className="text-xs text-muted-foreground">Conformément au Règlement (UE) 2016/679 (RGPD) — Version en vigueur au 12 avril 2026</p>
        </div>

        {SECTIONS.map((section, i) => (
          <div key={i} className="space-y-2">
            <h3 className="font-bold text-sm text-foreground">{section.title}</h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</div>
          </div>
        ))}

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 ServiGo — Tous droits réservés
        </div>
      </div>
    </div>
  );
}