import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MissionContractFull from './MissionContractFull';

export default function ContractPanel({ requestId, userEmail, userType }) {
  const queryClient = useQueryClient();

  const { data: contract } = useQuery({
    queryKey: ['contract', requestId],
    queryFn: () => base44.entities.MissionContract.filter({ request_id: requestId }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!requestId,
    refetchInterval: 8000,
  });

  if (!contract) return null;

  return (
    <div className="mx-2 my-2 rounded-2xl overflow-hidden border border-border shadow-sm bg-white">
      <MissionContractFull
        contract={contract}
        userEmail={userEmail}
        userType={userType}
        onContractUpdate={() => queryClient.invalidateQueries({ queryKey: ['contract', requestId] })}
      />
    </div>
  );
}