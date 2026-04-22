import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const BRAND = '#6C5CE7';

function StarRow({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${sz} ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

function ProReviewsSheet({ pro, onClose }) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['proAllReviews', pro.email],
    queryFn: () => base44.entities.Review.filter({ professional_email: pro.email }, '-created_date', 100),
    enabled: !!pro.email,
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="px-5 pb-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">{pro.full_name || pro.name}</h2>
                <p className="text-sm text-gray-500">{pro.category_name}</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-black text-yellow-700">{pro.rating?.toFixed(1) || '—'}</span>
              </div>
              <span className="text-sm text-gray-500">{reviews.length} avis</span>
            </div>
          </div>

          {/* Reviews list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun avis pour l'instant</p>
              </div>
            ) : reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
                      {(review.customer_name || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{review.customer_name || 'Client'}</p>
                      {review.created_date && (
                        <p className="text-[11px] text-gray-400">
                          {format(new Date(review.created_date), 'd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <StarRow rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed">"{review.comment}"</p>
                )}
                {review.category_name && (
                  <span className="inline-block mt-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: `${BRAND}10`, color: BRAND }}>
                    {review.category_name}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProReviews() {
  const navigate = useNavigate();
  const [selectedPro, setSelectedPro] = useState(null);

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['allProfessionals'],
    queryFn: () => base44.entities.Professional.list('-rating', 100),
    staleTime: 3 * 60 * 1000,
  });

  return (
    <div className="min-h-full bg-white pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center tap-scale">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">Techniciens & Avis</h1>
          <p className="text-xs text-gray-500">{pros.length} professionnel{pros.length !== 1 ? 's' : ''} sur la plateforme</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 shimmer rounded-2xl" />
            ))}
          </div>
        ) : pros.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-bold text-gray-700">Aucun professionnel</p>
            <p className="text-sm text-gray-400 mt-1">Les techniciens inscrits apparaîtront ici</p>
          </div>
        ) : (
          pros.map((pro, i) => (
            <motion.button
              key={pro.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedPro(pro)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 text-left tap-scale"
              style={{ boxShadow: '0 2px 12px rgba(108,92,231,0.07)' }}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black text-lg text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
                {pro.photo_url
                  ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" />
                  : (pro.full_name || pro.email || 'P')[0].toUpperCase()
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{pro.full_name || pro.name || 'Professionnel'}</p>
                <p className="text-sm text-gray-500 truncate">{pro.category_name || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {pro.rating >= 1 ? (
                    <>
                      <StarRow rating={Math.round(pro.rating)} size="sm" />
                      <span className="text-xs font-bold text-gray-700">{pro.rating.toFixed(1)}</span>
                      {pro.reviews_count > 0 && (
                        <span className="text-xs text-gray-400">({pro.reviews_count} avis)</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: BRAND }}>Nouveau · pas encore d'avis</span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </motion.button>
          ))
        )}
      </div>

      {selectedPro && (
        <ProReviewsSheet pro={selectedPro} onClose={() => setSelectedPro(null)} />
      )}
    </div>
  );
}