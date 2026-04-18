import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const COOKIES = [
  {
    category: "Cookies strictement nécessaires",
    description: "Ces cookies sont indispensables au fonctionnement de la plateforme. Ils permettent l'authentification, la sécurité et la mémorisation de vos préférences de session. Ils ne peuvent pas être désactivés.",
    examples: [
      { name: "session_token", purpose: "Authentification de l'utilisateur", duration: "Session (fermeture du navigateur)" },
      { name: "servigo_cookies_accepted", purpose: "Mémorisation de vos choix de cookies", duration: "12 mois" },
    ]
  },
  {
    category: "Cookies analytiques",
    description: "Ces cookies nous permettent de mesurer l'audience de la plateforme et d'analyser les performances pour améliorer l'expérience utilisateur. Ils collectent des données anonymisées.",
    examples: [
      { name: "analytics_session", purpose: "Mesure d'audience anonymisée", duration: "13 mois" },
    ]
  },
  {
    category: "Cookies marketing",
    description: "Ces cookies sont utilisés pour vous proposer des publicités et communications adaptées à vos centres d'intérêt. ServiGo n'utilise actuellement pas de cookies marketing tiers.",
    examples: []
  },
];

export default function PolitiqueCookies() {
  const navigate = useNavigate();

  const clearCookieConsent = () => {
    localStorage.removeItem('servigo_cookies_accepted');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Politique de Cookies</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-border">
          <h2 className="text-xl font-bold">SERVI GO</h2>
          <p className="text-sm font-semibold">Politique de Cookies</p>
          <p className="text-xs text-muted-foreground">Version en vigueur au 18 avril 2026</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-sm">Qu'est-ce qu'un cookie ?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Un cookie est un petit fichier texte déposé sur votre appareil lors de la consultation d'un site web ou d'une application. Il permet de mémoriser des informations relatives à votre navigation pour améliorer votre expérience. Conformément à la loi belge du 13 juin 2005 relative aux communications électroniques et au RGPD, nous vous informons de l'utilisation des cookies sur ServiGo.
          </p>
        </div>

        {COOKIES.map((c, i) => (
          <div key={i} className="space-y-3 bg-muted/30 rounded-2xl p-4 border border-border">
            <h3 className="font-bold text-sm">{c.category}</h3>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            {c.examples.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold">Nom</th>
                      <th className="text-left py-2 pr-4 font-semibold">Finalité</th>
                      <th className="text-left py-2 font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.examples.map((e, j) => (
                      <tr key={j} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-muted-foreground">{e.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{e.purpose}</td>
                        <td className="py-2 text-muted-foreground">{e.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2">
          <h3 className="font-bold text-sm">Comment gérer vos préférences ?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous pouvez à tout moment modifier vos préférences en matière de cookies en cliquant sur le bouton ci-dessous, ou en configurant votre navigateur pour refuser les cookies. Notez que le refus des cookies strictement nécessaires peut altérer le fonctionnement de la plateforme.
          </p>
          <button
            onClick={clearCookieConsent}
            className="mt-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Réinitialiser mes préférences cookies
          </button>
        </div>

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 ServiGo — SRL en cours de constitution — BCE : en cours
        </div>
      </div>
    </div>
  );
}