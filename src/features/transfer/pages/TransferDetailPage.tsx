import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { TransferOrder } from '../types';
import { TransferDetailModal } from '../components/TransferDetailModal';
import { transferService } from '../services/transferService';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<TransferOrder | null>(null);

  useEffect(() => {
    if (id) transferService.get(id).then(setTransfer).catch(() => setTransfer(null));
  }, [id]);

  if (!transfer) return <div className="transfer-container">Đang tải phiếu chuyển hoặc không tìm thấy phiếu.</div>;

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
