import React from 'react';
import { motion } from 'framer-motion';
import { Star, BadgeCheck } from 'lucide-react';
import { BRAND } from '@/lib/theme';

export default function NearbyProCard({ pro, index, onPress }) {
  const initials = (pro.full_name || pro.email || 'P')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onPress}
      className="snap-start shrink-0 w-[185px] bg-white rounded-2xl overflow-hidden text-left active:scale-95 transition-transform cursor-pointer"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}
    >
      {/* Photo */}
      <div className="relative h-[110px] w-full overflow-hidden bg-gray-100">
        {pro.photo_url ? (
          <img
            src={pro.photo_url}
            alt={pro.full_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-black text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}
          >
            {initials}
          </div>
        )}

        {/* Verified badge */}
        {pro.verification_status === 'verified' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 rounded-full px-2 py-1 shadow-sm">
            <BadgeCheck className="w-3 h-3" style={{ color: BRAND }} />
            <span className="text-[9px] font-bold" style={{ color: BRAND }}>Vérifié</span>
          </div>
        )}

        {/* Rating overlay */}
        {pro.rating >= 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 rounded-full px-2 py-1 shadow-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-900">{pro.rating?.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 truncate leading-tight">
          {pro.full_name || pro.name || 'Professionnel'}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{pro.category_name}</p>

        <div className="flex items-center justify-between mt-2">
          {pro.reviews_count > 0 ? (
            <span className="text-[10px] text-gray-400">{pro.reviews_count} avis</span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-600">Nouveau ✦</span>
          )}
          {pro.base_price > 0 && (
            <span className="text-[11px] font-bold text-gray-900">
              {String(pro.base_price).replace('.', ',')} €
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}