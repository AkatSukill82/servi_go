import React, { useState } from 'react';
import { getSubsidies, REGIONS } from '@/lib/subsidies';
import { useI18n } from '@/hooks/useI18n';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const COLOR_MAP = {
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
};

function detectRegion() {
  const saved = localStorage.getItem('servigo_region');
  if (saved) return saved;
  const lang = localStorage.getItem('servigo_lang') || 'fr';
  if (lang === 'nl') return 'flandre';
  if (lang === 'de') return 'wallonie'; // Liège area
  return 'bruxelles'; // default
}

export default function SubsidiesPanel({ categoryName }) {
  const { t, lang } = useI18n();
  const [region, setRegion] = useState(detectRegion);
  const [expanded, setExpanded] = useState(false);

  const subsidies = getSubsidies(categoryName, region);
  if (subsidies.length === 0) return null;

  const regionLabel = (r) => {
    const found = REGIONS.find(x => x.id === r);
    if (!found) return r;
    if (lang === 'nl') return found.label_nl;
    if (lang === 'de') return found.label_de;
    return found.label_fr;
  };

  const totalMax = subsidies.reduce((s, x) => s + (x.max_amount || 0), 0);

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-bold text-green-900">{t('subsidies_title')}</p>
          <p className="text-xs text-green-700 mt-0.5">
            {subsidies.length} prime{subsidies.length > 1 ? 's' : ''} disponible{subsidies.length > 1 ? 's' : ''} — jusqu\'à <strong>{totalMax.toLocaleString()} €</strong>
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-green-700 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-green-700 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Region selector */}
          <div>
            <p className="text-xs font-semibold text-green-800 mb-1.5">{t('subsidies_region')}</p>
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRegion(r.id);
                    localStorage.setItem('servigo_region', r.id);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    region === r.id
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-green-700 border-green-300 hover:bg-green-100'
                  }`}
                >
                  {regionLabel(r.id)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-green-700">{t('subsidies_subtitle')}</p>

          {/* Subsidies list */}
          <div className="space-y-2">
            {subsidies.map(s => {
              const c = COLOR_MAP[s.color] || COLOR_MAP.green;
              return (
                <div key={s.id} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${c.text}`}>{s.name}</p>
                      <p className={`text-xs mt-0.5 ${c.text} opacity-80`}>{s.description}</p>
                    </div>
                    <span className={`text-xs font-black rounded-full px-2 py-0.5 shrink-0 ${c.badge}`}>
                      {s.max_amount?.toLocaleString()} €
                    </span>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-2 underline underline-offset-2 ${c.text}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('subsidies_more')}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}