import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Eye, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MissionContractFull from '@/components/mission/MissionContractFull';

export default function ProContractsTab({ user }) {
  const [selectedContract, setSelectedContract] = useState(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['proContracts', user?.email],
    queryFn: () => base44.entities.MissionContract.filter({ professional_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Aucun contrat pour l'instant</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {contracts.map((contract, i) => {
          const bothSigned = !!(contract.signature_customer && contract.signature_pro);
          const proSigned = !!contract.signature_pro;
          const isCompleted = contract.status === 'completed';

          return (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{contract.contract_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{contract.category_name} · {contract.customer_name}</p>
                    {contract.scheduled_date && (
                      <p className="text-xs text-muted-foreground">
                        📅 {format(new Date(contract.scheduled_date), 'dd MMM yyyy', { locale: fr })}
                        {contract.scheduled_time ? ` à ${contract.scheduled_time}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    isCompleted ? 'bg-gray-100 text-gray-600' :
                    bothSigned ? 'bg-green-100 text-green-700' :
                    proSigned ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isCompleted ? '✓ Terminé' : bothSigned ? '✓ Signé' : proSigned ? 'En attente client' : 'À signer'}
                  </span>
                </div>

                {/* Signatures */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    {contract.signature_pro
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">Votre signature</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {contract.signature_customer
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">Client</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedContract(contract)}
                  className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {!proSigned ? 'Voir & Signer le contrat' : 'Voir le contrat'}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Contract fullscreen modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-card flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <p className="font-semibold text-sm">Contrat {selectedContract.contract_number}</p>
            <button onClick={() => setSelectedContract(null)} className="p-2 rounded-xl hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MissionContractFull
              contract={selectedContract}
              userEmail={user.email}
              userType="professionnel"
              onContractUpdate={() => setSelectedContract(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}