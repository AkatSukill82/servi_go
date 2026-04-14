import React from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Truck, Construction, Pipette, Paintbrush,
  Zap, Thermometer, Lock, TreePine, Hammer
} from 'lucide-react';

const iconMap = {
  Wrench, Truck, Construction, Pipette, Paintbrush,
  Zap, Thermometer, Lock, TreePine, Hammer
};

export default function ServiceCard({ category, index, unavailable = false, onSearch }) {
  const hasAvailablePros = !unavailable;
  const IconComponent = iconMap[category.icon] || Wrench;

  if (!hasAvailablePros) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.25 }}
        className="relative"
      >
        <div className="bg-card rounded-xl p-4 border border-border opacity-60 cursor-not-allowed">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <IconComponent className="w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{category.name}</p>
          <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            Bientôt disponible
          </span>
        </div>
      </motion.div>
    );
  }

  const handleClick = () => {
    if (onSearch) {
      onSearch(category.name);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <button onClick={handleClick} className="block w-full text-left group">
        <div className="bg-card rounded-xl p-4 border border-border active:scale-[0.97] transition-all duration-150 hover:border-foreground/20">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <IconComponent className="w-5 h-5 text-foreground" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{category.name}</p>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
}