import React from 'react';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

export default function Emergency() {
  return (
    <div className="px-4 pt-6 flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-1">Urgence</h1>
        <p className="text-muted-foreground text-sm">Appuyez pour appeler</p>
      </div>

      <motion.a
        href="tel:112"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center justify-center w-full bg-destructive rounded-3xl py-12 shadow-xl shadow-destructive/30 mb-8 active:scale-95 transition-transform"
      >
        <Phone className="w-14 h-14 text-white mb-3" />
        <span className="text-6xl font-black text-white">112</span>
        <span className="text-white/80 text-sm mt-2">Numéro d'urgence européen</span>
      </motion.a>

      <div className="w-full p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
        <p className="text-sm text-center text-destructive font-medium">
          ⚠️ N'utilisez ce numéro qu'en cas de réelle urgence
        </p>
      </div>
    </div>
  );
}