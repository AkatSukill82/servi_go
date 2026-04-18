import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ARTICLES = [
  {
    title: "Article 1 — Objet",
    content: "La société ServiGo (SRL en cours de constitution, ci-après « la Plateforme ») met en relation des particuliers (ci-après « Clients ») avec des prestataires de services indépendants (ci-après « Professionnels ») pour la réalisation de services à domicile (plomberie, électricité, serrurerie, déménagement, etc.) sur le territoire belge. Les présentes CGU régissent l'ensemble des relations entre ServiGo, les Clients et les Professionnels. Toute utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU."
  },
  {
    title: "Article 2 — Accès à la Plateforme",
    content: "L'accès à la Plateforme est réservé aux personnes physiques majeures (18 ans ou plus) ou aux personnes morales dûment représentées. L'inscription est gratuite pour les Clients. Les Professionnels doivent souscrire un abonnement mensuel de 10 € HT pour recevoir des missions. ServiGo se réserve le droit de refuser l'accès à toute personne ne satisfaisant pas aux conditions d'inscription."
  },
  {
    title: "Article 3 — Inscription et vérification d'identité",
    content: "Lors de l'inscription, l'utilisateur fournit des informations exactes et à jour. ServiGo procède à une vérification d'identité via carte d'identité électronique belge (eID). Les Professionnels doivent également fournir une attestation d'assurance professionnelle en cours de validité et leur numéro BCE valide. Tout document falsifié entraîne la résiliation immédiate du compte et peut faire l'objet de poursuites judiciaires."
  },
  {
    title: "Article 4 — Rôle de ServiGo",
    content: "ServiGo agit en qualité d'intermédiaire de mise en relation et non de prestataire de services. ServiGo n'est pas partie au contrat de prestation conclu entre le Client et le Professionnel. Les Professionnels exercent leur activité en toute indépendance. ServiGo ne peut être tenu responsable de la qualité des prestations réalisées, sauf faute prouvée dans le processus de vérification des Professionnels."
  },
  {
    title: "Article 5 — Obligations des Clients",
    content: "Le Client s'engage à : fournir des informations exactes lors de l'inscription ; être présent ou représenté lors de l'intervention du Professionnel ; payer la prestation selon les modalités convenues dans le contrat de mission ; ne pas contacter directement un Professionnel rencontré via la Plateforme en dehors de celle-ci à des fins de contournement de commission ; traiter les Professionnels avec respect."
  },
  {
    title: "Article 6 — Obligations des Professionnels",
    content: "Le Professionnel s'engage à : fournir des informations exactes sur son identité, ses qualifications et son assurance ; réaliser les prestations conformément au contrat signé ; détenir les assurances et agréments requis par la loi belge ; respecter les règles d'hygiène, de sécurité et de déontologie professionnelle ; ne pas solliciter directement les Clients rencontrés via la Plateforme."
  },
  {
    title: "Article 7 — Contrat de mission",
    content: "Avant toute intervention, un contrat de mission électronique est généré par la Plateforme et doit être signé numériquement par les deux parties. Ce contrat mentionne : la description détaillée de la prestation, la date et l'heure d'intervention, le prix convenu, les conditions d'annulation. La signature électronique est effectuée conformément au Règlement eIDAS (UE) n°910/2014 et a valeur juridique contraignante."
  },
  {
    title: "Article 8 — Prix et facturation",
    content: "Les prix affichés sont indiqués en euros TTC. ServiGo perçoit une commission sur chaque mission réalisée. Les Professionnels s'acquittent d'un abonnement mensuel de 10 € HT prélevé automatiquement via Stripe. Les factures sont disponibles dans l'espace personnel de l'utilisateur et conservées conformément aux obligations légales belges (10 ans)."
  },
  {
    title: "Article 9 — Annulation et remboursement",
    content: "Annulation plus de 24h avant la mission : gratuite. Annulation entre 0h et 24h avant la mission : 50% du montant dû selon la politique choisie lors de la signature du contrat. No-show du Professionnel : remboursement intégral du Client et pénalité appliquée au Professionnel."
  },
  {
    title: "Article 10 — Propriété intellectuelle",
    content: "L'ensemble du contenu de la Plateforme (textes, graphismes, logos, logiciels) est la propriété exclusive de ServiGo et est protégé par les lois belges et internationales relatives à la propriété intellectuelle. Toute reproduction sans autorisation préalable est strictement interdite."
  },
  {
    title: "Article 11 — Responsabilité limitée",
    content: "ServiGo ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation de la Plateforme, de l'inexécution ou de la mauvaise exécution des prestations par les Professionnels, ou d'une interruption technique de la Plateforme. La responsabilité de ServiGo est limitée au montant de la commission perçue sur la transaction concernée."
  },
  {
    title: "Article 12 — Suspension et résiliation",
    content: "ServiGo se réserve le droit de suspendre ou résilier tout compte sans préavis en cas de : violation des présentes CGU, comportement frauduleux, fourniture de fausses informations, non-paiement des abonnements. L'utilisateur peut résilier son compte à tout moment depuis les paramètres de l'application."
  },
  {
    title: "Article 13 — Données personnelles",
    content: "Le traitement des données personnelles est régi par la Politique de Confidentialité de ServiGo, accessible sur la Plateforme, conformément au Règlement Général sur la Protection des Données (RGPD) — Règlement UE 2016/679."
  },
  {
    title: "Article 14 — Droit applicable et juridiction",
    content: "Les présentes CGU sont régies par le droit belge. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de l'arrondissement judiciaire de Bruxelles, sauf disposition légale contraire impérative."
  },
  {
    title: "Article 15 — Modification des CGU",
    content: "ServiGo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs sont informés de toute modification substantielle par email au moins 30 jours avant son entrée en vigueur. L'utilisation continue de la Plateforme après modification vaut acceptation des nouvelles CGU."
  },
];

export default function CGUFull() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Conditions Générales d'Utilisation</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-sm font-semibold">Conditions Générales d'Utilisation</p>
          <p className="text-xs text-muted-foreground">Version en vigueur au 18 avril 2026</p>
        </div>

        {ARTICLES.map((a, i) => (
          <div key={i} className="space-y-2">
            <h3 className="font-bold text-sm text-foreground">{a.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{a.content}</p>
          </div>
        ))}

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 ServiGo — SRL en cours de constitution — BCE : en cours
        </div>
      </div>
    </div>
  );
}