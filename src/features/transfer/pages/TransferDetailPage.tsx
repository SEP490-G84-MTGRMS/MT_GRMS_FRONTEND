import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  Ban,
  Clock,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { INITIAL_TRANSFERS } from '../services/mockData';
import type { TransferOrder } from '../types';
import { CancelTransferModal } from '../components/CancelTransferModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const foundTransfer = INITIAL_TRANSFERS.find((t) => t.id === id) || INITIAL_TRANSFERS[0];
  const [transfer, setTransfer] = useState<TransferOrder>(foundTransfer);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmCancel = (reason: string) => {
    const updated: TransferOrder = {
      ...transfer,
      status: 'Cancelled',
      cancelReason: reason,
    };
    setTransfer(updated);
    showToast(
      `Đã hủy thành công phiếu chuyển hàng ${transfer.transferCode}! Tồn kho và số lô đã được tự động hoàn tác về kho gửi (BR-TRF-05).`,
      'warning'
    );
  };

  const isTransit = transfer.status === 'In-Transit';
  const isDraft = transfer.status === 'Draft';

  const renderStatusBadge = () => {
    switch (transfer.status) {
      case 'Draft':
        return (
          <span className="transfer-status-badge transfer-status-draft">
            <Clock size={12} /> Phiếu tạm
          </span>
        );
      case 'In-Transit':
        return (
          <span className="transfer-status-badge transfer-status-transit">
            <Truck size={12} /> Đang chuyển
          </span>
        );
      case 'Received':
        return (
          <span className="transfer-status-badge transfer-status-received">
            <CheckCircle size={12} /> Đã nhận
          </span>
        );
      case 'Cancelled':
        return (
          <span className="transfer-status-badge transfer-status-cancelled">
            <Ban size={12} /> Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '16px 24px', borderRadius: 24, border: '1px solid #edf2f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => navigate('/store-owner/transfers')}
            style={{ padding: '6px 12px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {transfer.transferCode}
              </h1>
              {renderStatusBadge()}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Người tạo: <b>{transfer.createdBy}</b> &bull; Ngày tạo: {transfer.transferDate}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => showToast('Đang kết nối máy in để in Biên bản bàn giao vận chuyển nội bộ...')}
          >
            <Printer size={15} /> In biên bản
          </button>

          {isTransit && (
            <button
              type="button"
              className="btn-primary-teal"
              onClick={() => navigate(`/store-owner/transfers/${transfer.id}/receive`)}
            >
              <CheckCircle size={15} /> Nhận hàng
            </button>
          )}

          {(isTransit || isDraft) && (
            <button
              type="button"
              className="btn-danger-soft"
              onClick={() => setIsCancelModalOpen(true)}
            >
              <Ban size={15} /> Hủy phiếu
            </button>
          )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: '20px 32px' }}>
        <div className="transfer-stepper">
          <div className="transfer-step-item">
            <div className={`transfer-step-circle ${transfer.status === 'Draft' ? 'active' : 'done'}`}>
              1
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Lập phiếu (Draft)</span>
          </div>

          <div style={{ flex: 1, height: 2, background: transfer.status !== 'Draft' ? '#0F766E' : '#e2e8f0', margin: '0 12px' }} />

          <div className="transfer-step-item">
            <div
              className={`transfer-step-circle ${
                transfer.status === 'In-Transit'
                  ? 'active'
                  : transfer.status === 'Received'
                  ? 'done'
                  : transfer.status === 'Cancelled'
                  ? 'cancelled'
                  : 'pending'
              }`}
            >
              2
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Xuất chuyển (In-Transit)</span>
          </div>

          <div style={{ flex: 1, height: 2, background: transfer.status === 'Received' ? '#10b981' : transfer.status === 'Cancelled' ? '#ef4444' : '#e2e8f0', margin: '0 12px' }} />

          <div className="transfer-step-item">
            <div
              className={`transfer-step-circle ${
                transfer.status === 'Received'
                  ? 'done'
                  : transfer.status === 'Cancelled'
                  ? 'cancelled'
                  : 'pending'
              }`}
            >
              3
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
              {transfer.status === 'Cancelled' ? 'Đã hủy (Cancelled)' : 'Đã nhận (Received)'}
            </span>
          </div>
        </div>

        {/* Khung thông tin điều chuyển */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: '#f8fafc', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>Chuyển từ (Kho gửi):</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {transfer.fromBranchName}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Ngày xuất chuyển: {transfer.transferDate}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>Chuyển đến (Kho nhận):</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {transfer.toBranchName}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {transfer.receiveDate ? `Ngày nhận hàng: ${transfer.receiveDate}` : `Dự kiến giao: ${transfer.expectedDeliveryDate || 'Chưa cập nhật'}`}
            </div>
          </div>

          {transfer.note && (
            <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              Ghi chú: <i>"{transfer.note}"</i>
            </div>
          )}

          {transfer.cancelReason && (
            <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#dc2626', background: '#fee2e2', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} /> Lý do hủy phiếu: <b>{transfer.cancelReason}</b>
            </div>
          )}

          {transfer.discrepancyNote && (
            <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#92400e', background: '#fffbeb', padding: '10px 14px', borderRadius: 8 }}>
              Ghi chú đối soát nhận hàng: <b>{transfer.discrepancyNote}</b>
            </div>
          )}
        </div>
      </div>

      {/* Bảng danh sách hàng hóa trong phiếu */}
      <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: 24, overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          Danh sách mặt hàng điều chuyển
        </h3>

        <table className="transfer-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>STT</th>
              <th style={{ width: 120 }}>Mã hàng</th>
              <th>Tên hàng</th>
              <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: 90, textAlign: 'center' }}>SL gửi</th>
              <th style={{ width: 90, textAlign: 'center' }}>SL nhận</th>
              <th style={{ width: 90, textAlign: 'center' }}>Chênh lệch</th>
              <th style={{ width: 110, textAlign: 'right' }}>Giá chuyển</th>
              <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
              <th>Ghi chú dòng</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((it, idx) => {
              const recv = it.receivedQty ?? (transfer.status === 'Received' ? it.sentQty : '—');
              const diff = typeof recv === 'number' ? it.sentQty - recv : 0;

              return (
                <tr key={it.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: '#0F766E' }}>{it.productCode}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                    {it.batchNumber && (
                      <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2 }}>
                        Lô: {it.batchNumber} (HSD: {it.expiryDate})
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{it.unitName}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.sentQty}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#0F766E' }}>{recv}</td>
                  <td style={{ textAlign: 'center' }}>
                    {diff > 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>-{diff}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()} đ</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                    {it.amount.toLocaleString()} đ
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{it.note || '—'}</td>
                </tr>
              );
            })}

            {/* Dòng tổng cộng */}
            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
              <td colSpan={4} style={{ textAlign: 'right', padding: 12 }}>
                Tổng cộng:
              </td>
              <td style={{ textAlign: 'center' }}>
                {transfer.items.reduce((s, i) => s + i.sentQty, 0)}
              </td>
              <td style={{ textAlign: 'center', color: '#0F766E' }}>
                {transfer.status === 'Received'
                  ? transfer.items.reduce((s, i) => s + (i.receivedQty ?? i.sentQty), 0)
                  : '—'}
              </td>
              <td />
              <td style={{ textAlign: 'right' }}>Tổng giá trị:</td>
              <td style={{ textAlign: 'right', color: '#0F766E' }}>
                {transfer.totalAmount.toLocaleString()} đ
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal Hủy Phiếu */}
      <CancelTransferModal
        isOpen={isCancelModalOpen}
        transferCode={transfer.transferCode}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
};
