import React from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Settings, Building2,
  SprayCan, Package, Lightbulb, Key, Thermometer,
  PaintBucket, Sofa, Bug, Fence, Trees
} from 'lucide-react';

const ICON_MAP = {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf,
  Hammer, Plug, Home, Zap, Settings, Building2,
  SprayCan, Package, Lightbulb, Key, Thermometer,
  PaintBucket, Sofa, Bug, Fence, Trees
};

export default function ServiceCard({ category, index, onSearch }) {
  const Icon = ICON_MAP[category.icon] || Wrench;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSearch?.(category.name)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 tap-scale hover:shadow-card transition-shadow"
    >
      <div className="w-14 h-14 rounded-full bg-chip flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-foreground" strokeWidth={1.6} />
      </div>
      <span className="text-xs font-medium text-center leading-tight line-clamp-2">
        {category.name}
      </span>
    </motion.button>
  );
}