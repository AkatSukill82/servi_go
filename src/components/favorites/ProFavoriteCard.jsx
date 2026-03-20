import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import FavoriteButton from './FavoriteButton';

export default function ProFavoriteCard({ pro, categories, index }) {
  const navigate = useNavigate();

  // Find category to get categoryId for the request
  const category = categories?.find(c => c.name === pro.category_name);

  const handleRequest = () => {
    if (category) {
      navigate(`/ServiceRequest?categoryId=${category.id}&priorityProId=${pro.id}`);
    } else {
      navigate('/Home');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg shrink-0 overflow-hidden">
          {pro.photo_url
            ? <img src={pro.photo_url} alt={pro.full_name} className="w-full h-full object-cover" />
            : pro.full_name?.[0] || 'P'
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold truncate">{pro.full_name}</p>
                {pro.verification_status === 'verified' && (
                  <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{pro.category_name}</p>
            </div>
            <FavoriteButton proId={pro.id} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            {pro.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium">{pro.rating.toFixed(1)}</span>
                {pro.reviews_count && <span className="text-xs text-muted-foreground">({pro.reviews_count})</span>}
              </div>
            )}
            <Badge
              variant="secondary"
              className={pro.available !== false
                ? 'bg-green-100 text-green-700 text-xs'
                : 'bg-gray-100 text-gray-500 text-xs'
              }
            >
              {pro.available !== false ? 'Disponible' : 'Indisponible'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action */}
      <Button
        onClick={handleRequest}
        disabled={pro.available === false || !category}
        className="w-full mt-3 h-10 rounded-xl text-sm"
      >
        Demande prioritaire <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}