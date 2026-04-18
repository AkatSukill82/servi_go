import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function MentionsLegales() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Mentions Légales</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-xs text-muted-foreground">Mentions légales — Version en vigueur au 18 avril 2026</p>
        </div>

        {[
          {
            title: "Éditeur de la plateforme",
            content: [
              "Dénomination sociale : ServiGo (SRL en cours de constitution)",
              "Siège social : [À compléter]",
              "Numéro BCE : En cours d'immatriculation",
              "Numéro de TVA intracommunautaire : En cours d'immatriculation",
              "Numéro de compte bancaire (IBAN) : [À compléter]",
              "Email : contact@servigo.be",
              "Téléphone : [À compléter]",
              "Responsable de publication : Mehdi El Meski",
            ]
          },
          {
            title: "Hébergement",
            content: [
              "Hébergeur : Base44 Ltd",
              "La plateforme ServiGo est hébergée par Base44 Ltd, société éditrice de la plateforme de développement éponyme. Les serveurs sont localisés au sein de l'Union européenne.",
            ]
          },
          {
            title: "Propriété intellectuelle",
            content: [
              "L'ensemble du contenu de la plateforme ServiGo (textes, graphismes, logos, icônes, images, sons, logiciels) est la propriété exclusive de ServiGo ou de ses partenaires et est protégé par les lois belges et internationales relatives à la propriété intellectuelle.",
              "Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments de la plateforme est interdite sans autorisation préalable écrite de ServiGo.",
            ]
          },
          {
            title: "Limitation de responsabilité",
            content: [
              "ServiGo agit en qualité d'intermédiaire de mise en relation et ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation de la plateforme ou de l'exécution des prestations par les professionnels.",
              "ServiGo s'efforce d'assurer la disponibilité de la plateforme 24h/24 et 7j/7, mais ne garantit pas l'absence d'interruptions liées à des opérations de maintenance ou à des incidents techniques.",
            ]
          },
          {
            title: "Droit applicable",
            content: [
              "Les présentes mentions légales sont régies par le droit belge. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de l'arrondissement judiciaire de Bruxelles.",
            ]
          },
        ].map((section, i) => (
          <div key={i} className="space-y-2">
            <h3 className="font-bold text-sm text-foreground">{section.title}</h3>
            <ul className="space-y-1">
              {section.content.map((line, j) => (
                <li key={j} className="text-sm text-muted-foreground leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 ServiGo — SRL en cours de constitution — BCE : en cours
        </div>
      </div>
    </div>
  );
}