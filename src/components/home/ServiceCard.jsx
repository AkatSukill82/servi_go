import React from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Settings, Building2,
  SprayCan, Package, Lightbulb, Key, Thermometer,
  PaintBucket, Sofa, Bug, Fence, Trees
} from 'lucide-react';
import { BRAND } from '@/lib/theme';

const ICON_MAP = {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Settings, Building2,
  SprayCan, Package, Lightbulb, Key, Thermometer,
  PaintBucket, Sofa, Bug, Fence, Trees
};

// Soft pastel palettes cycling through categories
const PALETTES = [
  { bg: 'rgba(108,92,231,0.1)', icon: '#6C5CE7' },
  { bg: 'rgba(0,184,148,0.1)',  icon: '#00B894' },
  { bg: 'rgba(253,203,110,0.15)', icon: '#E2A000' },
  { bg: 'rgba(225,112,85,0.1)', icon: '#E17055' },
  { bg: 'rgba(116,185,255,0.12)', icon: '#0984E3' },
  { bg: 'rgba(162,155,254,0.12)', icon: '#6C5CE7' },
  { bg: 'rgba(85,239,196,0.12)', icon: '#00B894' },
  { bg: 'rgba(250,177,160,0.12)', icon: '#E17055' },
];

export default function ServiceCard({ category, index, onSearch }) {
  const Icon = ICON_MAP[category.icon] || Wrench;
  const palette = PALETTES[index % PALETTES.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, ease: 'easeOut' }}
      onClick={() => onSearch?.(category.name)}
      className="flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-card border border-border/50 tap-scale hover:border-border transition-all"
      style={{ boxShadow: '0 2px 8px rgba(108,92,231,0.04)' }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform"
        style={{ background: palette.bg }}>
        <Icon className="w-6 h-6" style={{ color: palette.icon }} strokeWidth={1.8} />
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight text-foreground line-clamp-2 w-full">
        {category.name}
      </span>
    </motion.button>
  );
}