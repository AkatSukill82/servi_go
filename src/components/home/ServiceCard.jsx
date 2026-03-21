import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench, Truck, Construction, Pipette, Paintbrush,
  Zap, Thermometer, Lock, TreePine, Hammer
} from 'lucide-react';

const iconMap = {
  Wrench, Truck, Construction, Pipette, Paintbrush,
  Zap, Thermometer, Lock, TreePine, Hammer
};

const colorMap = {
  Wrench: 'from-slate-700 to-slate-800',
  Truck: 'from-slate-600 to-slate-700',
  Construction: 'from-stone-600 to-stone-700',
  Pipette: 'from-slate-500 to-slate-600',
  Paintbrush: 'from-zinc-600 to-zinc-700',
  Zap: 'from-neutral-600 to-neutral-700',
  Thermometer: 'from-stone-500 to-stone-600',
  Lock: 'from-slate-700 to-slate-800',
  TreePine: 'from-zinc-500 to-zinc-600',
  Hammer: 'from-neutral-700 to-neutral-800',
};

export default function ServiceCard({ category, index }) {
  const IconComponent = iconMap[category.icon] || Wrench;
  const gradient = colorMap[category.icon] || 'from-primary to-primary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        to={`/ServiceRequest?categoryId=${category.id}`}
        className="block group"
      >
        <div className="bg-card rounded-2xl p-4 border border-border active:scale-95 transition-transform duration-150">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{category.name}</h3>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{category.description}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}