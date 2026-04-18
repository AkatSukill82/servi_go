import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: "1. Identité du responsable de traitement",
    content: "Le responsable du traitement de vos données personnelles est ServiGo (SRL en cours de constitution), représentée par Mehdi El Meski. Contact : contact@servigo.be — [Adresse à compléter]. Pour toute question relative à la protection de vos données : privacy@servigo.be"
  },
  {
    title: "2. Données collectées",
    content: "ServiGo collecte les données suivantes : Données d'identification (nom, prénom, date de naissance, photo) — Coordonnées (email, téléphone, adresse postale) — Données de vérification d'identité (carte eID recto/verso, selfie avec eID) — Données de localisation (adresse GPS) — Données professionnelles (numéro BCE, numéro TVA, IBAN, attestations d'assurance) — Données de navigation (adresse IP, user-agent, cookies) — Données transactionnelles (historique des missions, contrats, factures) — Données de communication (messages échangés sur la plateforme)."
  },
  {
    title: "3. Finalités et bases légales",
    content: "Exécution du contrat (Art. 6.1.b RGPD) : création et gestion de compte, mise en relation clients/professionnels, gestion des missions et contrats, traitement des paiements. — Obligation légale (Art. 6.1.c RGPD) : vérification d'identité (loi anti-blanchiment), conservation des factures (10 ans, loi comptable belge), déclarations fiscales. — Intérêt légitime (Art. 6.1.f RGPD) : sécurité de la plateforme, prévention de la fraude, amélioration des services, statistiques d'usage anonymisées. — Consentement (Art. 6.1.a RGPD) : cookies analytiques et marketing, newsletter, géolocalisation."
  },
  {
    title: "4. Destinataires des données",
    content: "Vos données sont accessibles aux seules personnes habilitées de ServiGo. Elles peuvent être partagées avec : les professionnels avec lesquels vous concluez un contrat de mission (données strictement nécessaires à l'exécution) ; les prestataires techniques de ServiGo (hébergement Base44 Ltd, paiement Stripe Inc.) dans le cadre de contrats de sous-traitance conformes au RGPD ; les autorités compétentes en cas d'obligation légale."
  },
  {
    title: "5. Transferts hors Union européenne",
    content: "ServiGo utilise les services de Base44 Ltd et Stripe Inc., dont les serveurs peuvent être localisés en dehors de l'UE, notamment aux États-Unis. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types approuvées par la Commission européenne, décision d'adéquation). Vous pouvez obtenir une copie de ces garanties en contactant privacy@servigo.be."
  },
  {
    title: "6. Durées de conservation",
    content: "Données de compte : pendant toute la durée du compte, puis 3 ans après la dernière activité. — Documents d'identité (eID) : 5 ans après la fin de la relation contractuelle (obligations réglementaires). — Contrats et factures : 10 ans (obligation comptable et fiscale belge). — Messages : 2 ans après la fin de la mission. — Logs de connexion : 12 mois (obligation légale). — Données de consentement : 5 ans."
  },
  {
    title: "7. Vos droits (RGPD)",
    content: "Conformément au RGPD (Règlement UE 2016/679), vous disposez des droits suivants : Droit d'accès (Art. 15) : obtenir une copie de vos données. — Droit de rectification (Art. 16) : corriger des données inexactes. — Droit à l'effacement (Art. 17) : demander la suppression de vos données (« droit à l'oubli »), sous réserve des obligations légales de conservation. — Droit à la portabilité (Art. 20) : recevoir vos données dans un format structuré. — Droit d'opposition (Art. 21) : vous opposer à certains traitements. — Droit à la limitation (Art. 18) : limiter le traitement de vos données. Pour exercer ces droits : privacy@servigo.be. Nous répondrons dans un délai d'un mois (prolongeable de 2 mois pour les demandes complexes)."
  },
  {
    title: "8. Droit de réclamation auprès de l'APD",
    content: "Si vous estimez que le traitement de vos données personnelles constitue une violation du RGPD, vous avez le droit d'introduire une réclamation auprès de l'Autorité de Protection des Données (APD) belge : Autorité de Protection des Données — Rue de la Presse, 35 — 1000 Bruxelles — Tél : +32 2 274 48 00 — contact@apd-gba.be — www.autoriteprotectiondonnees.be"
  },
  {
    title: "9. Sécurité des données",
    content: "ServiGo met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre la perte, l'accès non autorisé, la divulgation ou la modification : chiffrement des données en transit (HTTPS/TLS), contrôle d'accès basé sur les rôles (RLS), authentification sécurisée, journalisation des accès."
  },
  {
    title: "10. Modifications",
    content: "ServiGo se réserve le droit de modifier la présente politique à tout moment. Toute modification substantielle vous sera notifiée par email au moins 30 jours avant son entrée en vigueur. La date de dernière mise à jour est indiquée en haut de ce document."
  },
];

export default function Confidentialite() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Politique de Confidentialité</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-sm font-semibold">Politique de Confidentialité — Conforme RGPD</p>
          <p className="text-xs text-muted-foreground">Version en vigueur au 18 avril 2026</p>
        </div>

        {SECTIONS.map((s, i) => (
          <div key={i} className="space-y-2">
            <h3 className="font-bold text-sm text-foreground">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
          </div>
        ))}

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 ServiGo — SRL en cours de constitution — BCE : en cours
        </div>
      </div>
    </div>
  );
}