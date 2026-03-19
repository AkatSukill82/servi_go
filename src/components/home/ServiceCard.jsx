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
  Wrench: 'from-blue-500 to-blue-600',
  Truck: 'from-orange-400 to-orange-500',
  Construction: 'from-amber-500 to-amber-600',
  Pipette: 'from-cyan-500 to-cyan-600',
  Paintbrush: 'from-violet-500 to-violet-600',
  Zap: 'from-yellow-400 to-yellow-500',
  Thermometer: 'from-red-400 to-red-500',
  Lock: 'from-slate-500 to-slate-600',
  TreePine: 'from-green-500 to-green-600',
  Hammer: 'from-stone-500 to-stone-600',
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
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-300 group-active:scale-95">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{category.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
          {category.base_price && (
            <p className="text-xs font-semibold text-primary mt-2">
              À partir de {category.base_price}€
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}