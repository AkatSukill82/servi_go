import React from 'react';

export default function PageFooter() {
  return (
    <div className="text-center pb-4 text-xs text-muted-foreground">
      <a href="/cgu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CGU</a>
      {" · "}
      <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Confidentialité</a>
      {" · "}
      <span>© 2026 ServiGo</span>
    </div>
  );
}