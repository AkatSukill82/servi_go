import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { BRAND } from '@/lib/theme';

function StoryViewer({ story, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const [showAfter, setShowAfter] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
            {(story.professional_name || 'P')[0]}
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">{story.professional_name}</p>
            <p className="text-white/60 text-xs mt-0.5">{story.category_name}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={showAfter ? 'after' : 'before'}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            src={showAfter ? story.photo_after_url : (story.photo_before_url || story.photo_after_url)}
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
        </AnimatePresence>

        {/* Before/After toggle */}
        {story.photo_before_url && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex bg-black/50 backdrop-blur-sm rounded-full p-1 gap-1">
            <button
              onClick={() => setShowAfter(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!showAfter ? 'bg-white text-black' : 'text-white'}`}
            >
              Avant
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${showAfter ? 'bg-white text-black' : 'text-white'}`}
            >
              Après
            </button>
          </div>
        )}

        {/* Nav arrows */}
        {hasPrev && (
          <button onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {hasNext && (
          <button onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Caption */}
      {(story.title || story.description) && (
        <div className="px-4 py-4 shrink-0 bg-gradient-to-t from-black/80 to-transparent">
          {story.title && <p className="text-white font-bold text-base">{story.title}</p>}
          {story.description && <p className="text-white/70 text-sm mt-1 leading-relaxed">{story.description}</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <Eye className="w-3.5 h-3.5 text-white/50" />
            <span className="text-white/50 text-xs">{story.views_count || 0} vues</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ProStoriesCarousel() {
  const [activeIndex, setActiveIndex] = useState(null);

  const { data: stories = [] } = useQuery({
    queryKey: ['proStories'],
    queryFn: () => base44.entities.ProStory.list('-created_date', 12),
    staleTime: 5 * 60 * 1000,
  });

  if (stories.length === 0) return null;

  const openStory = async (index) => {
    setActiveIndex(index);
    // Increment views
    const story = stories[index];
    if (story?.id) {
      base44.entities.ProStory.update(story.id, { views_count: (story.views_count || 0) + 1 }).catch(() => {});
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-xl font-black text-foreground">Réalisations</h2>
          <span className="text-xs text-muted-foreground font-medium">Avant / Après</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {stories.map((story, i) => (
            <motion.button
              key={story.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => openStory(i)}
              className="shrink-0 snap-start relative rounded-2xl overflow-hidden"
              style={{ width: 120, height: 160 }}
            >
              <img src={story.photo_after_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {/* Ring indicator */}
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-black text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
                {(story.professional_name || '?')[0]}
              </div>
              {story.photo_before_url && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                  <span className="text-[9px] text-white font-bold">B/A</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{story.title || story.category_name}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeIndex !== null && (
          <StoryViewer
            story={stories[activeIndex]}
            onClose={() => setActiveIndex(null)}
            onPrev={() => setActiveIndex(i => Math.max(0, i - 1))}
            onNext={() => setActiveIndex(i => Math.min(stories.length - 1, i + 1))}
            hasPrev={activeIndex > 0}
            hasNext={activeIndex < stories.length - 1}
          />
        )}
      </AnimatePresence>
    </>
  );
}