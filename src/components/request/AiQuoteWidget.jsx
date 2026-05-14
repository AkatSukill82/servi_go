import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronRight, RefreshCw } from 'lucide-react';
import { BRAND } from '@/lib/theme';

export default function AiQuoteWidget({ categoryName, answers = [], onAcceptQuote }) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [asked, setAsked] = useState(false);

  const generateQuote = async () => {
    setLoading(true);
    setAsked(true);
    try {
      const answersText = answers.map(a => `${a.question}: ${a.answer}`).join('; ');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert en services à domicile en Belgique. Génère un devis instantané pour ce service:

Service: ${categoryName}
Détails du client: ${answersText || 'Aucun détail supplémentaire'}

Réponds avec un devis réaliste pour la Belgique (tarifs belges) avec:
- min_price: prix minimum en euros (nombre entier)
- max_price: prix maximum en euros (nombre entier)  
- recommended_price: prix recommandé en euros (nombre entier)
- duration_hours: durée estimée en heures (nombre décimal)
- includes: liste de 3 éléments inclus dans le prix (strings courts)
- excludes: liste de 2 éléments non inclus (strings courts)
- confidence: "haute" | "moyenne" | "basse"
- note: une phrase courte d'explication`,
        response_json_schema: {
          type: 'object',
          properties: {
            min_price: { type: 'number' },
            max_price: { type: 'number' },
            recommended_price: { type: 'number' },
            duration_hours: { type: 'number' },
            includes: { type: 'array', items: { type: 'string' } },
            excludes: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'string' },
            note: { type: 'string' },
          },
        },
      });
      setQuote(result);
    } catch (e) {
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(108,92,231,0.12)', border: `1px solid ${BRAND}20` }}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: `${BRAND}08` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Devis IA instantané</p>
          <p className="text-xs text-muted-foreground">Estimation en 3 secondes</p>
        </div>
        {asked && !loading && (
          <button onClick={generateQuote} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {!asked && (
            <motion.button
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={generateQuote}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
            >
              <Sparkles className="w-4 h-4" />
              Obtenir mon devis gratuit
            </motion.button>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${BRAND}10` }}>
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: BRAND }} />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ background: BRAND }} />
              </div>
              <p className="text-sm text-muted-foreground">Analyse en cours…</p>
              <div className="flex gap-1">
                {['Tarifs Belgique', 'Durée', 'Matériaux'].map((label, i) => (
                  <motion.span
                    key={label}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${BRAND}10`, color: BRAND }}
                  >
                    {label}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {!loading && quote && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Price range */}
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground font-medium mb-1">Estimation pour {categoryName}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-black" style={{ color: BRAND }}>{quote.recommended_price} €</span>
                  <span className="text-sm text-muted-foreground">recommandé</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fourchette : {quote.min_price} € – {quote.max_price} €
                  {quote.duration_hours && ` · ~${quote.duration_hours}h`}
                </p>
                {quote.confidence && (
                  <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    quote.confidence === 'haute' ? 'bg-emerald-50 text-emerald-700' :
                    quote.confidence === 'moyenne' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    Confiance {quote.confidence}
                  </span>
                )}
              </div>

              {/* Includes/excludes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold text-emerald-700 mb-1.5">✅ Inclus</p>
                  {quote.includes?.map((item, i) => (
                    <p key={i} className="text-[11px] text-emerald-800 leading-snug">• {item}</p>
                  ))}
                </div>
                <div className="bg-red-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold text-red-600 mb-1.5">❌ Non inclus</p>
                  {quote.excludes?.map((item, i) => (
                    <p key={i} className="text-[11px] text-red-700 leading-snug">• {item}</p>
                  ))}
                </div>
              </div>

              {quote.note && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 leading-relaxed">
                  💡 {quote.note}
                </p>
              )}

              {onAcceptQuote && (
                <button
                  onClick={() => onAcceptQuote(quote.recommended_price)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
                >
                  Continuer avec ce devis <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}