import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Siren, Heart, Shield, AlertTriangle } from 'lucide-react';

const emergencyNumbers = [
  {
    label: 'SAMU (Urgences médicales)',
    number: '15',
    icon: Heart,
    color: 'bg-red-500',
    description: 'Pour toute urgence médicale'
  },
  {
    label: 'Police / Gendarmerie',
    number: '17',
    icon: Shield,
    color: 'bg-blue-600',
    description: 'En cas de danger immédiat'
  },
  {
    label: 'Pompiers',
    number: '18',
    icon: Siren,
    color: 'bg-orange-500',
    description: 'Incendie, accident, secours'
  },
];

export default function Emergency() {
  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-1">Urgence</h1>
        <p className="text-muted-foreground text-sm">Appuyez pour appeler</p>
      </div>

      {/* BIG 112 BUTTON */}
      <motion.a
        href="tel:112"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center justify-center w-full bg-destructive rounded-3xl py-8 shadow-xl shadow-destructive/30 mb-6 active:scale-95 transition-transform"
      >
        <Phone className="w-12 h-12 text-white mb-2" />
        <span className="text-5xl font-black text-white">112</span>
        <span className="text-white/80 text-sm mt-1">Numéro d'urgence européen</span>
      </motion.a>

      {/* Emergency Buttons */}
      <div className="space-y-3">
        {emergencyNumbers.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <a href={`tel:${item.number}`} className="block">
                <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm active:scale-95 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${item.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.label}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-foreground">{item.number}</span>
                    </div>
                  </div>
                </div>
              </a>
            </motion.div>
          );
        })}
      </div>

      {/* Warning */}
      <div className="mt-8 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
        <p className="text-sm text-center text-destructive font-medium">
          ⚠️ N'utilisez ces numéros qu'en cas de réelle urgence
        </p>
      </div>
    </div>
  );
}