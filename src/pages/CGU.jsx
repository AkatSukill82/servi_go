import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CGU() {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'hsl(var(--background))' }}>
    <div className="px-5 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-2xl font-bold mb-2">Conditions Générales d'Utilisation</h1>
      <p className="text-xs text-muted-foreground mb-8">Dernière mise à jour : mars 2025</p>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">1. Objet</h2>
          <p>ServiGo est une plateforme de mise en relation entre particuliers (clients) et professionnels indépendants (prestataires de services) opérant en Belgique. Les présentes CGU régissent l'utilisation de la plateforme.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">2. Inscription et compte</h2>
          <p>L'utilisation de ServiGo nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants. ServiGo se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">3. Rôle de la plateforme</h2>
          <p>ServiGo agit en tant qu'intermédiaire et ne peut être tenu responsable de la qualité des prestations fournies par les professionnels. Les professionnels sont des indépendants enregistrés à la Banque Carrefour des Entreprises (BCE/KBO) et disposent de leur propre assurance RC professionnelle.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">4. Prix et paiements</h2>
          <p>Tous les prix affichés sont en euros (€) et incluent la TVA belge de 21%. Le paiement est sécurisé via Stripe. Une commission de 10% (HTVA) est prélevée par ServiGo sur chaque transaction.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">5. Droit de rétractation</h2>
          <p>Conformément au droit belge de la consommation (Livre VI du Code de droit économique), le client dispose d'un délai de 14 jours pour se rétracter, sauf si le service a été intégralement exécuté avec son accord explicite préalable.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">6. Responsabilité des professionnels</h2>
          <p>Tout professionnel inscrit sur ServiGo atteste être légalement enregistré en Belgique (numéro BCE obligatoire), disposer d'une assurance RC professionnelle valide, et respecter la législation belge applicable à son activité.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">7. Litiges</h2>
          <p>En cas de litige entre un client et un prestataire, ServiGo met à disposition un système de médiation interne. Le droit belge est applicable. Toute action judiciaire relève de la compétence des tribunaux de Bruxelles.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">8. Protection des données</h2>
          <p>Le traitement des données personnelles est décrit dans notre <button onClick={() => navigate('/PrivacyPolicy')} className="underline text-primary">Politique de confidentialité</button>. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">9. Modification des CGU</h2>
          <p>ServiGo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par email de toute modification substantielle.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">10. Contact</h2>
          <p>Pour toute question relative aux présentes CGU : <strong>legal@servigo.be</strong></p>
        </section>
      </div>
    </div>
    </div>
  );
}