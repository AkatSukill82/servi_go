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

const PALETTES = [
  { bg: '#F0EEFF', icon: '#6C5CE7' },
  { bg: '#E6F9F4', icon: '#00897B' },
  { bg: '#FFF8E6', icon: '#E2A000' },
  { bg: '#FFF0ED', icon: '#E17055' },
  { bg: '#E8F4FF', icon: '#0984E3' },
  { bg: '#F5E6FF', icon: '#8E44AD' },
  { bg: '#E6FFF9', icon: '#00B894' },
  { bg: '#FFEBE8', icon: '#E17055' },
];

export default function ServiceCard({ category, index, onSearch }) {
  const Icon = ICON_MAP[category.icon] || Wrench;
  const palette = PALETTES[index % PALETTES.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => onSearch?.(category.name)}
      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white active:scale-95 transition-transform text-center"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: palette.bg }}
      >
        <Icon style={{ color: palette.icon, width: 26, height: 26 }} strokeWidth={1.7} />
      </div>
      <span className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2 w-full">
        {category.name}
      </span>
    </motion.button>
  );
}
