import React, { useState, useRef } from 'react';
import { Camera, Loader2, Sparkles, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

const COMPLEXITY_STYLES = {
  simple:   { label: 'Simple',   color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  standard: { label: 'Standard', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  complexe: { label: 'Complexe', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
};

export default function PhotoAnalysisStep({ categoryName, basePrice, onResult, onSkip }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleSkip = async () => {
    setSkipping(true);
    await onSkip();
    setSkipping(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert en services à domicile. Analyse cette photo d'une intervention de type "${categoryName}".
Évalue la complexité du travail visible et estime un prix indicatif en euros.
Prix de base habituel pour ce service : ${basePrice} €.

Réponds uniquement avec ce JSON :
{
  "complexity": "simple" | "standard" | "complexe",
  "price_estimate": <number>,
  "explanation": "<phrase courte expliquant ton estimation>",
  "detected_issues": ["<problème 1>", "<problème 2>"]
}`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          complexity: { type: 'string' },
          price_estimate: { type: 'number' },
          explanation: { type: 'string' },
          detected_issues: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    setResult(analysis);
    setAnalyzing(false);
  };

  const style = result ? (COMPLEXITY_STYLES[result.complexity] || COMPLEXITY_STYLES.standard) : null;

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        onClick={() => !analyzing && fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 transition-colors cursor-pointer
          ${photoUrl ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Photo du problème" className="w-full max-h-52 object-cover rounded-xl" />
        ) : (
          <>
            <Camera className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-medium text-sm">Prenez une photo du problème</p>
              <p className="text-xs text-muted-foreground mt-1">L'IA estimera la complexité et le prix</p>
            </div>
          </>
        )}
        {analyzing && (
          <div className="absolute inset-0 bg-background/80 rounded-2xl flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyse en cours...</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      </div>

      {/* AI Result */}
      <AnimatePresence>
        {result && style && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 space-y-3 ${style.bg}`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${style.color}`} />
              <p className={`text-sm font-bold ${style.color}`}>Analyse IA · Complexité {style.label}</p>
              <span className={`ml-auto text-xl font-bold ${style.color}`}>{result.price_estimate?.toFixed(0)} €</span>
            </div>
            <p className="text-sm text-foreground">{result.explanation}</p>
            {result.detected_issues?.length > 0 && (
              <ul className="space-y-1">
                {result.detected_issues.map((issue, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="mt-0.5">•</span> {issue}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {result && (
          <Button onClick={() => onResult({ photoUrl, ...result })} className="w-full h-14 rounded-xl text-base">
            <Sparkles className="w-4 h-4 mr-2" />
            Utiliser ce devis IA ({result.price_estimate?.toFixed(0)} €)
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        )}
        <button onClick={handleSkip} disabled={skipping || analyzing} className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 py-2 flex items-center justify-center gap-2 disabled:opacity-50">
          {result ? 'Continuer sans l\'analyse IA' : 'Passer cette étape'}
        </button>
      </div>
    </div>
  );
}