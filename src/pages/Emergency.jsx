import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Siren, Heart, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  {
    label: 'Numéro d\'urgence européen',
    number: '112',
    icon: Phone,
    color: 'bg-green-600',
    description: 'Urgence générale'
  },
];

export default function Emergency() {
  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
        >
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </motion.div>
        <h1 className="text-2xl font-bold">Urgence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Appuyez pour appeler les services d'urgence
        </p>
      </div>

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