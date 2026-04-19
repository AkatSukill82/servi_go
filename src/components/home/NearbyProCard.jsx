import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';

export default function NearbyProCard({ pro, index, onPress }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onPress}
      className="snap-start shrink-0 w-[200px] bg-card rounded-xl border border-border/50 p-4 text-left shadow-card tap-scale"
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
            {pro.photo_url ? (
              <img
                src={pro.photo_url}
                alt={pro.full_name || pro.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                {(pro.full_name || pro.email || 'P')[0].toUpperCase()}
              </div>
            )}
          </div>
          {pro.verification_status === 'verified' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center border-2 border-card">
              <CheckCircle className="w-3 h-3 text-white fill-white" strokeWidth={0} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{pro.full_name || pro.name || 'Professionnel'}</p>
          <p className="text-xs text-muted-foreground truncate">{pro.category_name}</p>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {pro.rating >= 4.5 ? (
            <span className="flex items-center gap-1 bg-yellow-400/15 text-yellow-600 font-bold text-xs px-2 py-0.5 rounded-full border border-yellow-400/30">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {pro.rating?.toFixed(1)}
            </span>
          ) : pro.rating > 0 ? (
            <>
              <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="text-xs font-semibold">{pro.rating?.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Nouveau</span>
          )}
          {pro.reviews_count > 0 && (
            <span className="text-xs text-muted-foreground">({pro.reviews_count})</span>
          )}
        </div>
        {pro.base_price > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            dès {String(pro.base_price).replace('.', ',')} €
          </span>
        )}
      </div>
    </motion.button>
  );
}