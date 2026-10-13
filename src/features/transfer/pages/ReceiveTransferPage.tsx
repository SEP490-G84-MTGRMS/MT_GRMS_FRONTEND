import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import { INITIAL_TRANSFERS } from '../services/mockData';
import type { TransferOrder, TransferItem } from '../types';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const ReceiveTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const foundTransfer = INITIAL_TRANSFERS.find((t) => t.id === id) || INITIAL_TRANSFERS[0];
  const [transfer, setTransfer] = useState<TransferOrder>(foundTransfer);
  const [items, setItems] = useState<TransferItem[]>(foundTransfer.items);

  // Tab filter: 'all' | 'match' | 'mismatch' | 'unreceived'
  const [activeTab, setActiveTab] = useState<'all' | 'match' | 'mismatch' | 'unreceived'>('all');
  const [discrepancyNote, setDiscrepancyNote] = useState(transfer.discrepancyNote || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateReceivedQty = (itemId: string, qty: number) => {
    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const validQty = Math.max(0, Math.min(it.sentQty, qty));
          return {
            ...it,
            receivedQty: validQty,
            amount: validQty * it.unitPrice,
          };
        }
        return it;
      })
    );
  };

  const handleReceiveAll = () => {
    setItems(
      items.map((it) => ({
        ...it,
        receivedQty: it.sentQty,
        amount: it.sentQty * it.unitPrice,
      }))
    );
    showToast('Đã gán nhận đủ 100% số lượng cho tất cả mặt hàng.');
  };

  // Filtered rows
  const filteredItems = items.filter((it) => {
    const recv = it.receivedQty ?? it.sentQty;
    if (activeTab === 'match') return recv === it.sentQty;
    if (activeTab === 'mismatch') return recv < it.sentQty;
    if (activeTab === 'unreceived') return recv === 0;
    return true;
  });

  const totalSent = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalReceived = items.reduce((sum, it) => sum + (it.receivedQty ?? it.sentQty), 0);
  const totalDamaged = totalSent - totalReceived;
  const totalAmountReceived = items.reduce(
    (sum, it) => sum + (it.receivedQty ?? it.sentQty) * it.unitPrice,
    0
  );

  const hasDiscrepancy = totalDamaged > 0;

  const handleConfirm = () => {
    if (hasDiscrepancy && !discrepancyNote.trim()) {
      setErrorMsg('Bắt buộc nhập lý do giải trình khi số lượng thực nhận nhỏ hơn số lượng xuất chuyển!');
      return;
    }

    const updated: TransferOrder = {
      ...transfer,
      status: 'Received',
      receiveDate: new Date().toLocaleDateString('vi-VN'),
      discrepancyNote: discrepancyNote.trim(),
      items,
    };

    setTransfer(updated);
    showToast(
      `Xác nhận nhập kho thành công cho phiếu ${transfer.transferCode}! Đã ghi nhận ${totalReceived} sản phẩm vào tồn kho chi nhánh nhận (BR-TRF-03).`
    );

    setTimeout(() => {
      navigate(`/store-owner/transfers/${transfer.id}`);
    }, 1200);
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '16px 24px', borderRadius: 24, border: '1px solid #edf2f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => navigate('/store-owner/transfers')}
            style={{ padding: '6px 12px' }}
          >
            <ArrowLeft size={16} /> Danh sách phiếu
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Xác nhận nhận hàng - {transfer.transferCode}
            </h1>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Từ: <b>{transfer.fromBranchName}</b> &rarr; Đến: <b>{transfer.toBranchName}</b>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary-white"
          style={{ borderColor: '#0F766E', color: '#0F766E' }}
          onClick={handleReceiveAll}
        >
          <CheckCheck size={16} /> Nhận đủ tất cả (100%)
        </button>
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Cột trái (72%): Bảng kiểm đếm */}
        <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tabs phân loại kiểm đếm */}
          <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: 'none',
                background: activeTab === 'all' ? '#0F766E' : '#f1f5f9',
                color: activeTab === 'all' ? '#ffffff' : '#334155',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Tất cả ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: 'none',
                background: activeTab === 'match' ? '#0F766E' : '#f1f5f9',
                color: activeTab === 'match' ? '#ffffff' : '#334155',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Khớp ({items.filter((it) => (it.receivedQty ?? it.sentQty) === it.sentQty).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mismatch')}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: 'none',
                background: activeTab === 'mismatch' ? '#dc2626' : '#fee2e2',
                color: activeTab === 'mismatch' ? '#ffffff' : '#dc2626',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Lệch / Thiếu ({items.filter((it) => (it.receivedQty ?? it.sentQty) < it.sentQty).length})
            </button>
          </div>

          {/* Bảng kiểm đếm */}
          <div style={{ overflowX: 'auto' }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 120 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 90, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 110, textAlign: 'center', backgroundColor: '#e0f2fe' }}>
                    <span style={{ color: '#0369a1', fontWeight: 700 }}>SL thực nhận</span>
                  </th>
                  <th style={{ width: 90, textAlign: 'center' }}>Chênh lệch</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Giá chuyển</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền nhận</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => {
                  const recv = it.receivedQty ?? it.sentQty;
                  const diff = it.sentQty - recv;
                  const isDiff = diff > 0;

                  return (
                    <tr
                      key={it.id}
                      style={{
                        backgroundColor: isDiff ? '#fffbeb' : undefined,
                      }}
                    >
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
                      <td style={{ textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                        <input
                          type="number"
                          className="filter-input"
                          style={{
                            width: 70,
                            textAlign: 'center',
                            borderColor: isDiff ? '#f59e0b' : '#0284c7',
                            fontWeight: 700,
                          }}
                          value={recv}
                          onChange={(e) => handleUpdateReceivedQty(it.id, Number(e.target.value))}
                          min={0}
                          max={it.sentQty}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isDiff ? (
                          <span style={{ color: '#dc2626', fontWeight: 700, background: '#fee2e2', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                            -{diff}
                          </span>
                        ) : (
                          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>✓ Khớp</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()} đ</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {(recv * it.unitPrice).toLocaleString()} đ
                      </td>
                    </tr>
                  );
                })}

                {/* Dòng tổng */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: 12 }}>
                    Tổng cộng:
                  </td>
                  <td style={{ textAlign: 'center' }}>{totalSent}</td>
                  <td style={{ textAlign: 'center', color: '#0284c7' }}>{totalReceived}</td>
                  <td style={{ textAlign: 'center', color: totalDamaged > 0 ? '#dc2626' : '#16a34a' }}>
                    {totalDamaged > 0 ? `-${totalDamaged}` : '0'}
                  </td>
                  <td style={{ textAlign: 'right' }}>Tổng tiền nhận:</td>
                  <td style={{ textAlign: 'right', color: '#0F766E' }}>
                    {totalAmountReceived.toLocaleString()} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải (28%): Tổng kết đối soát */}
        <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            Biên bản kiểm đếm
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Tổng số lượng gửi:</span>
              <b>{totalSent} món</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Số lượng thực nhận:</span>
              <b style={{ color: '#0F766E' }}>{totalReceived} món</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Chênh lệch thất thoát:</span>
              <b style={{ color: totalDamaged > 0 ? '#dc2626' : '#16a34a' }}>
                {totalDamaged} món
              </b>
            </div>
          </div>

          {/* Ô nhập giải trình nếu có chênh lệch */}
          {hasDiscrepancy && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
                Giải trình chênh lệch / bể vỡ <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="filter-input"
                rows={3}
                style={{ borderColor: '#ef4444', backgroundColor: '#fffbeb' }}
                placeholder="Bắt buộc nhập nguyên nhân (ví dụ: Bể vỡ khi bốc dỡ, giao thiếu so với phiếu...)"
                value={discrepancyNote}
                onChange={(e) => {
                  setDiscrepancyNote(e.target.value);
                  setErrorMsg('');
                }}
                required
              />
              <div style={{ fontSize: 11.5, color: '#92400e', marginTop: 4 }}>
                * Phần chênh lệch thiếu sẽ được hạch toán vào sổ hao hụt vận chuyển (BR-TRF-04).
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 12, background: '#fee2e2', padding: 8, borderRadius: 8 }}>
              <AlertTriangle size={14} /> {errorMsg}
            </div>
          )}

          {/* Nút xác nhận nhập kho */}
          <div style={{ paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="btn-primary-teal"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={handleConfirm}
            >
              <CheckCircle size={16} /> Xác nhận nhập kho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
