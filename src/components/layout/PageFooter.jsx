import React from 'react';

export default function PageFooter() {
  return (
    <div className="text-center pb-10 pt-6 text-xs text-muted-foreground space-y-1.5">
      <div>
        <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Mentions légales</a>
        {" · "}
        <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
        {" · "}
        <a href="/cgv" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGV</a>
        {" · "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
        {" · "}
        <a href="/cookies" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Cookies</a>
      </div>
      <div>ServiGo — SRL en cours de constitution — BCE : en cours · © 2026</div>
    </div>
  );
}