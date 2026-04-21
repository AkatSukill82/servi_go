import React from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Sparkles, Drill, Package, Star
} from 'lucide-react';

const ICON_MAP = {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Sparkles, Drill, Package, Star
};

const EMOJI_MAP = {
  Wrench: '🔧', Droplets: '💧', Paintbrush: '🖌️', Truck: '🚚',
  Scissors: '✂️', Leaf: '🌿', Hammer: '🔨', Plug: '⚡',
  Home: '🏠', Zap: '⚡', Sparkles: '✨', Drill: '🔩',
  Package: '📦', Star: '⭐',
};

// Color palettes for cards — cycles through them
const PALETTES = [
  { bg: '#F0EDFF', icon: '#6C5CE7' },
  { bg: '#FFF0F3', icon: '#E84393' },
  { bg: '#EDFFF5', icon: '#00B894' },
  { bg: '#FFF8E7', icon: '#F59E0B' },
  { bg: '#E8F4FF', icon: '#3B82F6' },
  { bg: '#FFF0EB', icon: '#FF6B35' },
];

export default function ServiceCard({ category, index, onSearch }) {
  const palette = PALETTES[index % PALETTES.length];
  const emoji = EMOJI_MAP[category.icon] || '🛠️';

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.96 }}
      onClick={onSearch}
      className="flex flex-col items-start p-4 rounded-2xl text-left w-full transition-shadow active:shadow-none"
      style={{ background: palette.bg }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl">
        {emoji}
      </div>
      <p className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2">{category.name}</p>
      {category.base_price && (
        <p className="text-[11px] font-medium mt-1.5" style={{ color: palette.icon }}>
          dès {category.base_price}€
        </p>
      )}
    </motion.button>
  );
}