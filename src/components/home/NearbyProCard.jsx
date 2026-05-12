import React from 'react';
import { motion } from 'framer-motion';
import { Star, BadgeCheck } from 'lucide-react';
import { BRAND } from '@/lib/theme';

export default function NearbyProCard({ pro, index, onPress }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onPress}
      className="snap-start shrink-0 w-[168px] bg-card rounded-2xl border border-border/50 overflow-hidden text-left tap-scale"
      style={{ boxShadow: '0 2px 12px rgba(108,92,231,0.07)' }}
    >
      {/* Avatar area */}
      <div className="relative h-[88px] w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${BRAND}18, #a78bfa18)` }}>
        {pro.photo_url ? (
          <img
            src={pro.photo_url}
            alt={pro.full_name || pro.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-black"
            style={{ color: BRAND }}>
            {(pro.full_name || pro.email || 'P')[0].toUpperCase()}
          </div>
        )}
        {/* Verified badge */}
        {pro.verification_status === 'verified' && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
            <BadgeCheck className="w-4 h-4" style={{ color: BRAND }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-bold truncate text-foreground leading-tight">
          {pro.full_name || pro.name || 'Professionnel'}
        </p>
        <p className="text-xs text-muted-foreground truncate">{pro.category_name}</p>

        <div className="flex items-center justify-between pt-1">
          {pro.rating >= 1 ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-foreground">{pro.rating?.toFixed(1)}</span>
              {pro.reviews_count > 0 && (
                <span className="text-[10px] text-muted-foreground">({pro.reviews_count})</span>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-semibold" style={{ color: BRAND }}>Nouveau</span>
          )}
          {pro.base_price > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
              {String(pro.base_price).replace('.', ',')} €
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}