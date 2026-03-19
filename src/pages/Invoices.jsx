import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import InvoiceCard from '@/components/invoices/InvoiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

export default function Invoices() {
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['invoices'] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1">Mes factures</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Historique de vos services
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
              <div className="flex gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucune facture pour le moment</p>
          <p className="text-xs text-muted-foreground mt-1">Vos factures apparaîtront ici après une commande</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice, index) => (
            <InvoiceCard key={invoice.id} invoice={invoice} index={index} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}