import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Receipt, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import MissionContractFull from '@/components/mission/MissionContractFull';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PAGE_SIZE = 20;

function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <button onClick={onPrev} disabled={page === 0}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Précédent
      </button>
      <span className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</span>
      <button onClick={onNext} disabled={page >= totalPages - 1}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors">
        Suivant <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AdminDocumentsTab() {
  const [subTab, setSubTab] = useState('contracts');
  const [selectedContract, setSelectedContract] = useState(null);
  const [search, setSearch] = useState('');
  const [contractPage, setContractPage] = useState(0);
  const [invoicePage, setInvoicePage] = useState(0);

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['adminAllContracts'],
    queryFn: () => base44.entities.MissionContract.list('-created_date', 1000),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['adminAllInvoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 1000),
  });

  const filteredContracts = useMemo(() => contracts.filter(c =>
    !search ||
    c.contract_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.professional_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.category_name?.toLowerCase().includes(search.toLowerCase())
  ), [contracts, search]);

  const filteredInvoices = useMemo(() => invoices.filter(i =>
    !search ||
    i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.professional_name?.toLowerCase().includes(search.toLowerCase())
  ), [invoices, search]);

  const contractTotalPages = Math.ceil(filteredContracts.length / PAGE_SIZE);
  const invoiceTotalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);

  const visibleContracts = filteredContracts.slice(contractPage * PAGE_SIZE, (contractPage + 1) * PAGE_SIZE);
  const visibleInvoices = filteredInvoices.slice(invoicePage * PAGE_SIZE, (invoicePage + 1) * PAGE_SIZE);

  // Reset page when search changes
  const handleSearch = (val) => {
    setSearch(val);
    setContractPage(0);
    setInvoicePage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['contracts', `Contrats (${contracts.length})`], ['invoices', `Factures (${invoices.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
              subTab === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Rechercher par nom, numéro..."
        className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {subTab === 'contracts' && (
        loadingContracts ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun contrat</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleContracts.map(c => {
                const bothSigned = !!(c.signature_customer && c.signature_pro);
                return (
                  <div key={c.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{c.contract_number}</p>
                        <p className="text-xs text-muted-foreground">{c.category_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.customer_name} ↔ {c.professional_name}</p>
                        {c.scheduled_date && (
                          <p className="text-xs text-muted-foreground">
                            📅 {format(new Date(c.scheduled_date), 'dd MMM yyyy', { locale: fr })}
                            {c.scheduled_time ? ` à ${c.scheduled_time}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                          bothSigned ? 'bg-green-100 text-green-700' :
                          c.signature_pro ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.status === 'completed' ? '✓ Terminé' : bothSigned ? '✓ Signé' : c.signature_pro ? 'Att. client' : 'En attente'}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{c.signature_customer ? '✅ Client' : '⏳ Client'}</span>
                          <span>{c.signature_pro ? '✅ Pro' : '⏳ Pro'}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedContract(c)}
                      className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Visualiser le contrat
                    </button>
                  </div>
                );
              })}
            </div>
            <Pagination
              page={contractPage}
              totalPages={contractTotalPages}
              onPrev={() => setContractPage(p => p - 1)}
              onNext={() => setContractPage(p => p + 1)}
            />
          </>
        )
      )}

      {subTab === 'invoices' && (
        loadingInvoices ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" /></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune facture</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleInvoices.map(inv => (
                <div key={inv.id} className="bg-card rounded-xl border border-border p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.customer_name} ↔ {inv.professional_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.category_name}</p>
                      {inv.created_date && <p className="text-xs text-muted-foreground">{format(new Date(inv.created_date), 'dd MMM yyyy', { locale: fr })}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base">{(inv.total_price || inv.total_ttc || 0).toFixed(2)} €</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.payment_status === 'paid' ? '✓ Payée' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={invoicePage}
              totalPages={invoiceTotalPages}
              onPrev={() => setInvoicePage(p => p - 1)}
              onNext={() => setInvoicePage(p => p + 1)}
            />
          </>
        )
      )}

      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-card flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <p className="font-semibold text-sm">Contrat {selectedContract.contract_number}</p>
            <button onClick={() => setSelectedContract(null)} className="p-2 rounded-xl hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MissionContractFull
              contract={selectedContract}
              userEmail="admin"
              userType="admin"
              onContractUpdate={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
