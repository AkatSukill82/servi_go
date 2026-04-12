import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <div className="w-full border-t border-border bg-background py-3 px-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
      <Link to="/cgu" className="hover:text-foreground transition-colors underline underline-offset-2">CGU</Link>
      <span>·</span>
      <Link to="/confidentialite" className="hover:text-foreground transition-colors underline underline-offset-2">Confidentialité</Link>
      <span>·</span>
      <span>© 2026 ServiGo</span>
    </div>
  );
}