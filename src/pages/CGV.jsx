import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ARTICLES = [
  {
    title: "Article 1 — Objet",
    content: "Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre ServiGo (SRL en cours de constitution, ci-après « ServiGo ») et toute personne physique ou morale (ci-après « le Client ») effectuant une demande de service via la plateforme ServiGo. Toute commande implique l'acceptation pleine et entière des présentes CGV."
  },
  {
    title: "Article 2 — Commande de service",
    content: "La commande est validée lorsque le Client confirme sa demande de service, choisit un professionnel et signe le contrat de mission électronique. ServiGo se réserve le droit de refuser toute commande pour des motifs légitimes (fraude, indisponibilité, etc.)."
  },
  {
    title: "Article 3 — Prix et commission ServiGo",
    content: "Les prix affichés sont indicatifs et établis en euros TTC. Le prix définitif est celui convenu dans le contrat de mission signé par les deux parties. ServiGo perçoit une commission sur chaque mission réalisée, dont le montant est communiqué transparemment avant toute commande. Les professionnels sont soumis à un abonnement mensuel de 10 € HT (TVA si applicable)."
  },
  {
    title: "Article 4 — Paiement",
    content: "Le paiement s'effectue directement au professionnel selon les modalités convenues dans le contrat de mission (espèces, virement bancaire, paiement en ligne via Stripe). ServiGo n'encaisse pas les paiements pour les prestations réalisées. Les frais d'abonnement Pro sont prélevés via Stripe selon les conditions d'abonnement."
  },
  {
    title: "Article 5 — Droit de rétractation (Art. VI.47 CDE)",
    content: "Conformément à l'article VI.47 du Code de droit économique belge, le Client dispose d'un délai de 14 jours calendriers à compter de la conclusion du contrat pour exercer son droit de rétractation, sans avoir à justifier sa décision ni à supporter d'autres coûts que ceux prévus aux articles VI.50 et VI.51 CDE. Pour exercer ce droit, le Client doit notifier sa décision par email à contact@servigo.be ou via le formulaire ci-dessous avant l'expiration du délai."
  },
  {
    title: "Formulaire de rétractation (Annexe A — Art. VI.47 CDE)",
    content: "À l'attention de ServiGo, contact@servigo.be — Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous : — Commandée le (*) / reçue le (*) : — Nom du/des consommateur(s) : — Adresse du/des consommateur(s) : — Signature du/des consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) : — Date : (*) Rayez la mention inutile."
  },
  {
    title: "Article 6 — Exceptions au droit de rétractation",
    content: "Conformément à l'article VI.53, 1° du CDE, le droit de rétractation ne s'applique pas aux contrats de prestation de services après la pleine exécution si l'exécution a commencé avec l'accord exprès préalable du consommateur, qui a également reconnu qu'il perdra son droit de rétractation une fois le contrat pleinement exécuté. Cette renonciation est expressément enregistrée lors de la signature du contrat de mission."
  },
  {
    title: "Article 7 — Garantie légale",
    content: "Les Professionnels sont seuls responsables de la qualité et de la conformité des services qu'ils réalisent. En tant qu'intermédiaire, ServiGo ne peut être tenu responsable des défauts d'exécution imputable au Professionnel. En cas de litige, ServiGo propose une procédure de médiation interne accessible depuis l'application."
  },
  {
    title: "Article 8 — Responsabilité",
    content: "ServiGo ne saurait être tenu responsable des dommages de toute nature, qu'ils soient matériels, immatériels ou corporels, résultant d'un dysfonctionnement ou d'une mauvaise utilisation de la plateforme. La responsabilité de ServiGo est en tout état de cause limitée au montant de la commission perçue sur la transaction concernée."
  },
  {
    title: "Article 9 — Médiation et règlement des litiges",
    content: "En cas de litige non résolu à l'amiable, le Client peut recourir au Service de Médiation pour le Consommateur (Belgique) ou à la plateforme de règlement en ligne des litiges (RLL) de la Commission européenne accessible à l'adresse : https://ec.europa.eu/consumers/odr. Les tribunaux de Bruxelles sont compétents pour tout litige relevant du droit belge."
  },
  {
    title: "Article 10 — Droit applicable",
    content: "Les présentes CGV sont régies par le droit belge, notamment le Code de droit économique (CDE) et le Code civil. Tout litige sera soumis aux tribunaux de l'arrondissement judiciaire de Bruxelles."
  },
];

export default function CGV() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Conditions Générales de Vente</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-sm font-semibold">Conditions Générales de Vente</p>
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