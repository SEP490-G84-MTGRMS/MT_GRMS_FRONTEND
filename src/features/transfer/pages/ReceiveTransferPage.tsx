import { isAxiosError } from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  User,
  Check,
  Loader2,
} from 'lucide-react';
import type { TransferOrder, TransferItem } from '../types';
import { AdminToast, type ToastState } from '../../admin/components';
import { getTransferErrorMessage, transferService } from '../services/transferService';
import { formatDateTimeVN } from '../utils/transferDate';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../transfer.css';

export const ReceiveTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canViewFinancials = useAuthStore((state) => state.user?.role === 'STORE_OWNER');
  const transferBasePath = window.location.pathname.startsWith('/employee') ? '/employee/transfers' : '/store-owner/transfers';

  const receiver = useAuthStore((state) => state.user?.fullName || state.user?.email);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [transfer, setTransfer] = useState<TransferOrder | null>(null);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Tab filter: 'all' | 'match' | 'mismatch' | 'unreceived'
  const [activeTab, setActiveTab] = useState<'all' | 'match' | 'mismatch' | 'unreceived'>('all');
  const [searchKw, setSearchKw] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [receiveTime, setReceiveTime] = useState('');

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!id) {
      setLoadState('missing');
      return;
    }

    let disposed = false;
    setLoadState('loading');
    transferService.get(id).then((result) => {
      if (disposed) return;
      setTransfer(result);
      setItems(result.items.map((item) => ({ ...item, receivedQty: item.sentQty, damagedQty: 0, note: '' })));
      setReceiveNote('');
      setReceiveTime(formatDateTimeVN(new Date()));
      setLoadState('ready');
    }).catch((error: unknown) => {
      if (!disposed) setLoadState(isAxiosError(error) && error.response?.status === 404 ? 'missing' : 'error');
    });
    return () => { disposed = true; };
  }, [id, loadAttempt]);

  if (loadState === 'loading' || (loadState === 'ready' && id !== transfer?.id)) {
    return <div className="transfer-container" role="status"><Loader2 className="animate-spin" /> Đang tải phiếu chuyển…</div>;
  }

  if (loadState !== 'ready' || !transfer || transfer.status !== 'InTransit') {
    const message = loadState === 'missing' ? 'Không tìm thấy phiếu chuyển.'
      : loadState === 'error' ? 'Không tải được phiếu chuyển.'
      : 'Phiếu này không ở trạng thái đang chuyển.';
    return (
      <div className="transfer-container">
        <p role="alert">{message}</p>
        <button type="button" className="btn-secondary-white" onClick={() => navigate(transferBasePath)}>Quay lại</button>
        {loadState === 'error' && (
          <button type="button" className="btn-primary-teal" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Thử lại</button>
        )}
      </div>
    );
  }

  const handleUpdateReceivedQty = (itemId: string, qty: number) => {
    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const maxAllowed = it.sentQty - (it.damagedQty ?? 0);
          const validQty = Math.max(0, Math.min(maxAllowed, qty));
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

  const handleUpdateDamagedQty = (itemId: string, qty: number) => {
    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const maxAllowed = it.sentQty - (it.receivedQty ?? 0);
          const validDamaged = Math.max(0, Math.min(maxAllowed, qty));
          return {
            ...it,
            damagedQty: validDamaged,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateReason = (itemId: string, reason: string) => {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, note: reason } : item));
  };

  // Filtered rows
  const filteredItems = items.filter((it) => {
    if (searchKw.trim()) {
      const kw = searchKw.trim().toLowerCase();
      const match = it.productCode.toLowerCase().includes(kw) || it.productName.toLowerCase().includes(kw);
      if (!match) return false;
    }

    const recv = it.receivedQty ?? it.sentQty;
    const damaged = it.damagedQty ?? 0;
    if (activeTab === 'match') return recv === it.sentQty && damaged === 0;
    if (activeTab === 'mismatch') return damaged > 0 || recv + damaged < it.sentQty;
    if (activeTab === 'unreceived') return recv + damaged === 0;
    return true;
  });

  const totalSent = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalReceived = items.reduce((sum, it) => sum + (it.receivedQty ?? it.sentQty), 0);
  const totalDamaged = items.reduce((sum, it) => sum + (it.damagedQty ?? 0), 0);
  const totalDifference = totalSent - totalReceived - totalDamaged;
  const totalAmountReceived = items.reduce(
    (sum, it) => sum + (it.receivedQty ?? it.sentQty) * it.unitPrice,
    0
  );

  const countMatch = items.filter((it) => (it.receivedQty ?? it.sentQty) === it.sentQty && (it.damagedQty ?? 0) === 0).length;
  const countMismatch = items.filter((it) => (it.damagedQty ?? 0) > 0 || (it.receivedQty ?? it.sentQty) + (it.damagedQty ?? 0) < it.sentQty).length;
  const countUnreceived = items.filter((it) => (it.receivedQty ?? it.sentQty) + (it.damagedQty ?? 0) === 0).length;

  const handleConfirm = async () => {
    if (!id || isSaving) return;
    const missingReason = items.some((item) =>
      ((item.damagedQty ?? 0) > 0 || (item.receivedQty ?? item.sentQty) < item.sentQty)
      && !item.note?.trim() && !receiveNote.trim()
    );
    if (missingReason) {
      showToast('Nhập lý do cho từng mặt hàng bị thiếu hoặc hỏng, hoặc ghi chú nhận chung.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await transferService.receive(id, items, receiveNote.trim());
      navigate(`${transferBasePath}/${transfer.id}`, { replace: true });
    } catch (error) {
      showToast(getTransferErrorMessage(error), 'warning');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Top Header Toolbar (Khớp Ảnh 3: Receive transfer) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '16px 24px',
          borderRadius: 24,
          border: '1px solid #edf2f9',
          boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Trái: Link quay lại + Ô tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 600, minWidth: 0, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(transferBasePath)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#0F766E',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={16} /> Chuyển hàng
          </button>

          {/* Ô tìm kiếm hàng hóa */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 36, borderRadius: 9999 }}
              aria-label="Tìm hàng hóa"
              placeholder="Tìm theo mã hoặc tên hàng"
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          </div>
        </div>

        {/* Phải: Người thực hiện & Ngày giờ nhận */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b' }}>
            <User size={16} color="#0F766E" />
            <span>{receiver || 'Chưa xác định người nhận'}</span>
          </div>
          <span
            style={{
              padding: '4px 10px',
              backgroundColor: '#f1f5f9',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            {receiveTime}
          </span>
        </div>
      </div>

      {/* Main 2-column Layout */}
      <div className="transfer-receive-layout">
        {/* CỘT TRÁI: Bảng nhận hàng */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Tabs phân loại tình trạng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'all' ? 700 : 500,
                color: activeTab === 'all' ? '#0F766E' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'all' ? '2px solid #0F766E' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Tất cả ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('match')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'match' ? 700 : 500,
                color: activeTab === 'match' ? '#16a34a' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'match' ? '2px solid #16a34a' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Khớp ({countMatch})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mismatch')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'mismatch' ? 700 : 500,
                color: activeTab === 'mismatch' ? '#ea580c' : '#ea580c',
                fontSize: 13.5,
                borderBottom: activeTab === 'mismatch' ? '2px solid #ea580c' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Lệch ({countMismatch})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unreceived')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'unreceived' ? 700 : 500,
                color: activeTab === 'unreceived' ? '#0F766E' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'unreceived' ? '2px solid #0F766E' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Chưa nhận ({countUnreceived})
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 110 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 60, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 95, textAlign: 'center', backgroundColor: '#e0f2fe' }}>SL nhận tốt</th>
                  <th style={{ width: 95, textAlign: 'center', backgroundColor: '#fee2e2' }}>Hỏng</th>
                  <th style={{ minWidth: 190 }}>Lý do hỏng/chênh lệch</th>
                  {canViewFinancials && <th style={{ width: 100, textAlign: 'right' }}>Giá chuyển</th>}
                  {canViewFinancials && <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => {
                  const recvQty = it.receivedQty ?? it.sentQty;
                  const damagedQty = it.damagedQty ?? 0;
                  const diff = it.sentQty - recvQty - damagedQty;
                  const isDiff = diff > 0 || damagedQty > 0;

                  return (
                    <tr
                      key={it.id}
                      style={{
                        backgroundColor: isDiff ? '#fffbeb' : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td>
                        <span className="transfer-link">{it.productCode}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.unitName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.sentQty}</td>

                      {/* Ô nhập SL nhận tốt */}
                      <td style={{ textAlign: 'center', backgroundColor: isDiff ? '#fef3c7' : '#f0f9ff' }}>
                        <input
                          aria-label={`SL nhận ${it.productName}`}
                          type="number"
                          className="filter-input"
                          style={{
                            width: 55,
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: 6,
                            borderColor: isDiff ? '#f59e0b' : '#cbd5e1',
                            fontWeight: 700,
                          }}
                          value={recvQty}
                          onChange={(e) => handleUpdateReceivedQty(it.id, Number(e.target.value))}
                          min={0}
                          max={it.sentQty - (it.damagedQty ?? 0)}
                        />
                        {isDiff && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: '#b45309',
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            {diff > 0 && `Thiếu ${diff}`}{diff > 0 && damagedQty > 0 && ' · '}{damagedQty > 0 && `Hỏng ${damagedQty}`}
                          </div>
                        )}
                      </td>

                      {/* Ô nhập Hỏng */}
                      <td style={{ textAlign: 'center', backgroundColor: (it.damagedQty ?? 0) > 0 ? '#fee2e2' : undefined }}>
                        <input
                          aria-label={`SL hỏng ${it.productName}`}
                          type="number"
                          className="filter-input"
                          style={{
                            width: 55,
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: 6,
                            borderColor: (it.damagedQty ?? 0) > 0 ? '#ef4444' : '#cbd5e1',
                            fontWeight: 700,
                          }}
                          value={it.damagedQty ?? 0}
                          onChange={(e) => handleUpdateDamagedQty(it.id, Number(e.target.value))}
                          min={0}
                          max={it.sentQty - recvQty}
                        />
                        {(it.damagedQty ?? 0) > 0 && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: '#dc2626',
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            Hỏng: {it.damagedQty}
                          </div>
                        )}
                      </td>

                      <td>
                        <input
                          aria-label={`Lý do chênh lệch ${it.productName}`}
                          className="filter-input"
                          value={it.note ?? ''}
                          onChange={(event) => handleUpdateReason(it.id, event.target.value)}
                          placeholder={isDiff ? 'Nhập lý do của dòng hàng' : 'Không có chênh lệch'}
                          disabled={!isDiff}
                        />
                      </td>

                      {canViewFinancials && <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()}</td>}
                      {canViewFinancials && <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {(recvQty * it.unitPrice).toLocaleString()}
                      </td>}
                    </tr>
                  );
                })}

                {/* Dòng tổng cộng */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: 12 }}>
                    Tổng:
                  </td>
                  <td style={{ textAlign: 'center' }}>{totalSent}</td>
                  <td style={{ textAlign: 'center', color: '#0F766E', fontSize: 14 }}>
                    {totalReceived}
                  </td>
                  <td style={{ textAlign: 'center', color: totalDamaged > 0 ? '#dc2626' : '#64748b' }}>{totalDamaged}</td>
                  <td />
                  {canViewFinancials && <td />}
                  {canViewFinancials && <td style={{ textAlign: 'right', color: '#0F766E', fontSize: 14 }}>
                    {totalAmountReceived.toLocaleString()} đ
                  </td>}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Khung Hướng dẫn xác nhận nhận hàng */}
          <div
            style={{
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              fontSize: 12.5,
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              Hướng dẫn xác nhận nhận hàng
            </div>
            <div>&bull; <b>SL nhận:</b> Hệ thống mặc định điền đủ số lượng chuyển. Hãy kiểm đếm và sửa lại số lượng thực tế nhận được.</div>
            <div>&bull; <b>SL hỏng:</b> Tổng nhận tốt và hỏng không được vượt số lượng chuyển.</div>
            <div>&bull; <b>Trường hợp có chênh lệch:</b> Ưu tiên nhập nguyên nhân tại đúng dòng hàng; ghi chú nhận chung được dùng làm lý do dự phòng.</div>
            <div>&bull; <b>Cập nhật kho tự động:</b> Hàng tốt tăng tồn khả dụng, hàng hỏng được tăng tồn và đưa vào cách ly.</div>
          </div>
        </div>

        {/* CỘT PHẢI: Thông tin phiếu & Ghi chú nhận */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Mã chuyển hàng:</span>
            <span style={{ fontWeight: 700, color: '#0F766E' }}>{transfer.transferCode}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Trạng thái:</span>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>Đang chuyển</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Chi nhánh gửi:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{transfer.fromBranchName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Ngày chuyển:</span>
            <span>{formatDateTimeVN(transfer.dispatchedAt, 'Chưa có thời điểm chuyển')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Ghi chú chuyển:</span>
            <span style={{ fontStyle: 'italic', color: '#64748b' }}>
              {transfer.note || '(Không có)'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Tổng SL chuyển:</span>
            <span style={{ fontWeight: 700 }}>{totalSent}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Tổng SL nhận:</span>
            <span style={{ fontWeight: 700, color: totalDifference > 0 ? '#ea580c' : '#16a34a' }}>
              {totalReceived} {totalDifference > 0 && `(Lệch ${totalDifference})`}
            </span>
          </div>

          {/* Ghi chú nhận * */}
          <div style={{ paddingTop: 4 }}>
            <label htmlFor="transfer-receive-note" style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Ghi chú nhận
            </label>
            <textarea
              id="transfer-receive-note"
              className="filter-input"
              style={{
                width: '100%',
                minHeight: 70,
                borderRadius: 12,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="Nhập lý do chênh lệch nhận hàng..."
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
            />
          </div>

          <div className="transfer-receive-actions">
            <button
              type="button"
              className="btn-primary-teal"
              onClick={handleConfirm}
              disabled={isSaving}
              style={{ justifyContent: 'center' }}
            >
              <Check size={15} /> {isSaving ? 'Đang xác nhận…' : 'Nhận hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
