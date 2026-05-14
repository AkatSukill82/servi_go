import React from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/69bbc3e356f9677752ffb476/6c123ce9f_26d5d0eb5_logo-removebg-preview.png';

export function ServiGoIcon({ size = 32, className = '' }) {
  return (
    <img 
      src={LOGO_URL} 
      alt="Logo" 
      width={size} 
      height={size} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

export default function ServiGoLogo({ size = 'md', className = '', showText = true }) {
  const cfg = {
    sm: { icon: 24 },
    md: { icon: 32 },
    lg: { icon: 40 },
    xl: { icon: 52 },
  };
  const s = cfg[size] || cfg.md;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={LOGO_URL} 
        alt="Logo" 
        width={s.icon} 
        height={s.icon}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <span className={`font-black`} style={{ color: '#1A1A2E' }}>
          ServiGo
        </span>
      )}
    </div>
  );
}