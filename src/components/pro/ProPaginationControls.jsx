import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination controls component for pro pages
 * Used in ProDashboard, ProAgenda
 */
export default function ProPaginationControls({ pagination, currentPage, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNext, hasPrev } = pagination;

  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors hover:bg-muted"
      >
        <ChevronLeft className="w-4 h-4" />
        Précédent
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Page {page} / {totalPages}
        </span>
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors hover:bg-muted"
      >
        Suivant
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}