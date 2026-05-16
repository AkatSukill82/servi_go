import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({ pagination, currentPage, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasMore } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Précédent
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">
          Page {page} sur {totalPages}
        </span>
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore || page >= totalPages}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50 transition-colors"
      >
        Suivant
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}