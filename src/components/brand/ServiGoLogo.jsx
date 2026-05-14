import React from 'react';

export function ServiGoIcon({ size = 32, className = '', white = false, dark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill={white ? '#FFFFFF' : '#6C5CE7'} />
      <path d="M9 12l2 2 4-4" stroke={white ? '#6C5CE7' : 'white'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ServiGoLogo({ size = 'md', className = '', dark = false }) {
  const cfg = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
    xl: { icon: 52, text: 'text-3xl' },
  };
  const s = cfg[size] || cfg.md;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ServiGoIcon size={s.icon} />
      <span className={`font-black ${s.text}`} style={{ color: dark ? '#FFFFFF' : '#1A1A2E' }}>
        ServiGo
      </span>
    </div>
  );
}