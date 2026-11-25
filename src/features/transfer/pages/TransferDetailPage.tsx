import { isAxiosError } from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import type { TransferOrder } from '../types';
import { TransferDetailModal } from '../components/TransferDetailModal';
import { getTransferErrorMessage, transferService } from '../services/transferService';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const transferBasePath = window.location.pathname.startsWith('/employee') ? '/employee/transfers' : '/store-owner/transfers';

  const [transfer, setTransfer] = useState<TransferOrder | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoadState('missing');
      return;
    }

    let disposed = false;
    setLoadState('loading');
    setErrorMessage('');
    transferService
      .get(id)
      .then((result) => {
        if (disposed) return;
        setTransfer(result);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setTransfer(null);
        if (isAxiosError(error) && error.response?.status === 404) {
          setLoadState('missing');
        } else {
          setErrorMessage(getTransferErrorMessage(error));
          setLoadState('error');
        }
      });

    return () => {
      disposed = true;
    };
  }, [id, loadAttempt]);

  if (loadState === 'loading') {
    return (
      <div className="transfer-container" role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#0F766E' }} />
        <span>Đang tải chi tiết phiếu điều chuyển...</span>
      </div>
    );
  }

  if (loadState !== 'ready' || !transfer) {
    const title = loadState === 'missing'
      ? 'Không tìm thấy phiếu điều chuyển.'
      : errorMessage || 'Không thể tải thông tin phiếu điều chuyển.';

    return (
      <div
        className="transfer-container"
        style={{
          maxWidth: 520,
          margin: '48px auto',
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          padding: 28,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <AlertTriangle size={36} color={loadState === 'missing' ? '#d97706' : '#dc2626'} />
        <p role="alert" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
          {title}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => navigate(transferBasePath)}
          >
            <ArrowLeft size={15} /> Quay lại danh sách điều chuyển
          </button>
          {loadState === 'error' && (
            <button
              type="button"
              className="btn-primary-teal"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              <RotateCcw size={15} /> Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', position: 'relative' }}>
      <TransferDetailModal
        isOpen={true}
        transfer={transfer}
        onClose={() => navigate(transferBasePath)}
        onUpdateTransfer={(updated) => setTransfer(updated)}
      />
    </div>
  );
};
