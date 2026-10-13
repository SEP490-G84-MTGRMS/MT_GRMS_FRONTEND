import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INITIAL_TRANSFERS } from '../services/mockData';
import type { TransferOrder } from '../types';
import { TransferDetailModal } from '../components/TransferDetailModal';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const foundTransfer = INITIAL_TRANSFERS.find((t) => t.id === id) || INITIAL_TRANSFERS[0];
  const [transfer, setTransfer] = useState<TransferOrder>(foundTransfer);

  return (
    <div style={{ minHeight: '80vh', position: 'relative' }}>
      <TransferDetailModal
        isOpen={true}
        transfer={transfer}
        onClose={() => navigate('/store-owner/transfers')}
        onUpdateTransfer={(updated) => setTransfer(updated)}
      />
    </div>
  );
};
