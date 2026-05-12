import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="text-3xl font-black text-foreground mb-6 tracking-tight">À propos de ServiGo</h1>

        <div className="prose prose-sm max-w-none space-y-5 text-foreground/80 leading-relaxed">
          <p>
            <strong className="text-foreground">ServiGo</strong> est une plateforme belge qui met en relation des particuliers avec des professionnels du service à domicile — plombiers, électriciens, déménageurs, jardiniers, et bien d'autres métiers du quotidien. Notre mission est simple : rendre l'accès aux artisans de confiance rapide, transparent et sécurisé pour tout le monde.
          </p>
          <p>
            Pour les <strong className="text-foreground">particuliers</strong>, ServiGo permet de trouver en quelques minutes un professionnel disponible près de chez vous, de consulter ses avis, de convenir d'un tarif, et de signer un contrat de mission numérique avant le début des travaux. Plus besoin de chercher des heures sur internet ou de faire confiance à des inconnus sans références vérifiées.
          </p>
          <p>
            Pour les <strong className="text-foreground">professionnels indépendants</strong>, ServiGo est un outil de développement d'activité. Recevez des demandes de mission correspondant à votre métier et à votre zone géographique, gérez votre agenda, signez des contrats électroniques, émettez des factures et suivez vos paiements — tout depuis une seule application mobile.
          </p>
          <p>
            Chaque professionnel inscrit sur ServiGo est soumis à une <strong className="text-foreground">vérification d'identité</strong> (carte eID + selfie) et doit fournir une attestation d'assurance responsabilité civile professionnelle. Nous vérifions également les numéros BCE pour garantir que chaque prestataire exerce légalement en Belgique.
          </p>
          <p>
            ServiGo est développé et opéré depuis Bruxelles. Notre équipe croit en une économie de services locale, équitable et bien encadrée — où les artisans sont respectés et où les clients sont protégés. Nous améliorons l'application en continu grâce aux retours de notre communauté.
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link to="/contact" className="text-primary font-medium hover:underline">Nous contacter</Link>
          <Link to="/cgu" className="text-muted-foreground hover:underline">CGU</Link>
          <Link to="/confidentialite" className="text-muted-foreground hover:underline">Confidentialité</Link>
        </div>
      </div>
    </div>
  );
}