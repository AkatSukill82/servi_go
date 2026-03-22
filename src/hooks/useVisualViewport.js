import { useState, useEffect } from 'react';

/**
 * Sur Android Chrome, le clavier virtuel réduit le visualViewport.
 * Ce hook retourne la hauteur réelle disponible pour éviter que
 * l'input bar soit cachée par le clavier.
 */
export function useVisualViewport() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight
  );

  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;

    const handler = () => setHeight(vp.height);
    vp.addEventListener('resize', handler);
    return () => vp.removeEventListener('resize', handler);
  }, []);

  return height;
}