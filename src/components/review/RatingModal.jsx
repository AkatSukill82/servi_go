import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

export default function RatingModal({ request, onSubmit, onClose, isSubmitting }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const dragControls = useDragControls();

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({ rating, comment });
  };

  return (
    <AnimatePresence>
      {/* Overlay — z-40 so navbar (z-50) stays on top */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet — z-40 so navbar stays visible */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) onClose();
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-card rounded-t-3xl w-full max-w-md mx-auto"
        style={{ touchAction: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onPointerDown={e => dragControls.start(e)}
        >
          <div className="w-10 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">Évaluer la mission</h2>
            <p className="text-sm text-muted-foreground">
              {request?.professional_name || 'Le professionnel'} · {request?.category_name}
            </p>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hovered || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted stroke-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-sm font-medium text-muted-foreground">
              {['', 'Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Excellent !'][rating]}
            </p>
          )}

          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Laissez un commentaire (optionnel)..."
            className="rounded-xl resize-none"
            rows={3}
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12">
              Passer
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1 rounded-xl h-12 bg-primary"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}