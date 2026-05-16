import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Lazy-loading grid for professional cards
 * Implements intersection observer for efficient rendering of 10k+ items
 */
export default function LazyProGrid({ items, renderItem, columns = 3, gap = 'gap-3' }) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 12 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && containerRef.current) {
            // Load more items as user scrolls
            const newEnd = Math.min(visibleRange.end + 12, items.length);
            setVisibleRange((prev) => ({ ...prev, end: newEnd }));
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [items.length]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className={`grid grid-cols-${columns} md:grid-cols-${Math.min(columns + 1, 5)} ${gap}`}
    >
      <AnimatePresence>
        {visibleItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: (index % 12) * 0.04 }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}