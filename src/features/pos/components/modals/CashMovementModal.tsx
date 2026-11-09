import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { ArrowLeftRight, AlertTriangle, X } from 'lucide-react';
import { posShiftApi } from '../../api/posShiftApi';
import type { ShiftDetailResponse, ShiftCashMovementDto } from '../../types/posShift.types';
import { useAuthStore } from '../../../../stores/useAuthStore';

interface Props {
  isOpen: boolean;
  shift: ShiftDetailResponse;
  onClose: () => void;
  onMovementAdded: () => void;
}

export const CashMovementModal: FC<Props> = ({
  isOpen,
  shift,
  onClose,
  onMovementAdded,
}) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('OUT');
  const [category, setCategory] = useState<number>(1); // 1 = EXPENSE, 2 = CASH_DRAW, 3 = CASH_DEPOSIT, 4 = DEBT_COLLECT
  const [amount, setAmount] = useState<number>(100000);
  const [reason, setReason] = useState<string>('Mua giấy in nhiệt k80');
  const [threshold, setThreshold] = useState<number>(200000);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [movementsList, setMovementsList] = useState<ShiftCashMovementDto[]>(shift.cashMovements || []);

  useEffect(() => {
    if (!isOpen) return;

    // Load cài đặt hạn mức duyệt chi
    posShiftApi.getCashMovementSettings().then((cfg) => {
      if (cfg && typeof cfg.cashOutApprovalThreshold === 'number') {
        setThreshold(cfg.cashOutApprovalThreshold);
      }
    }).catch(() => {
      setThreshold(200000);
    });

    // Refresh danh sách phiếu
    posShiftApi.getShiftById(shift.id).then((refreshed) => {
      if (refreshed) setMovementsList(refreshed.cashMovements || []);
    }).catch(() => {});
  }, [isOpen, shift.id]);

  if (!isOpen) return null;

  const currentDrawerCash = Math.max(0, shift.expectedCash ?? (shift.openingFloat + shift.totalCashIn - shift.totalCashOut));
  const isExceedThreshold = movementType === 'OUT' && category === 1 && amount > threshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Số tiền phải lớn hơn 0');
      return;
    }
    if (movementType === 'OUT' && amount > currentDrawerCash) {
      setErrorMsg(`Số tiền chi (${amount.toLocaleString('vi-VN')} đ) vượt quá số tiền mặt hiện có trong két (${currentDrawerCash.toLocaleString('vi-VN')} đ)!`);
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do thu/chi');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await posShiftApi.addCashMovement(shift.id, {
        movementType: movementType === 'IN' ? 1 : 2,
        category: category as 1 | 2 | 3 | 4,
        amount,
        reason: reason.trim(),
        createdByName: user?.fullName || 'Thu ngân',
      });

      onMovementAdded();
      // Reload danh sách
      const refreshed = await posShiftApi.getShiftById(shift.id);
      if (refreshed) setMovementsList(refreshed.cashMovements || []);
      setActiveTab('history');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tạo phiếu thu chi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPending = async (movementId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu chi này?')) return;
    try {
      await posShiftApi.cancelCashMovement(movementId);
      onMovementAdded();
      const refreshed = await posShiftApi.getShiftById(shift.id);
      if (refreshed) setMovementsList(refreshed.cashMovements || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy yêu cầu');
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal-dialog" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pos-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 6, borderRadius: 8, backgroundColor: '#f1f5f9', color: '#0f766e' }}>
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 className="pos-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Thu / Chi Tiền Mặt Tại Két ({shift.shiftCode})
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Hạn mức duyệt chi: <b>{threshold.toLocaleString('vi-VN')} đ</b> &bull; Tiền mặt trong két: <b style={{ color: '#0f766e' }}>{currentDrawerCash.toLocaleString('vi-VN')} đ</b>
              </p>
            </div>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              color: activeTab === 'create' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'create' ? '2px solid #0f766e' : 'none',
            }}
          >
            Lập Phiếu Mới
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              color: activeTab === 'history' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'history' ? '2px solid #0f766e' : 'none',
            }}
          >
            Lịch Sử Phiếu Trong Ca ({movementsList.length})
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleSubmit}>
            <div className="pos-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16 }}>
              {errorMsg && (
                <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
                  {errorMsg}
                </div>
              )}

              {/* Loại giao dịch */}
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13 }}>Loại nghiệp vụ (*):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('OUT');
                      setCategory(1);
                      setReason('Chi vặt quầy thu ngân');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: movementType === 'OUT' && category === 1 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: movementType === 'OUT' && category === 1 ? '#fef2f2' : '#ffffff',
                      color: movementType === 'OUT' && category === 1 ? '#991b1b' : '#334155',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    [-] Chi vặt quầy (Mua đá, bill...)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('OUT');
                      setCategory(2);
                      setReason('Rút bớt tiền nộp Chủ cửa hàng');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: movementType === 'OUT' && category === 2 ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      backgroundColor: movementType === 'OUT' && category === 2 ? '#fff7ed' : '#ffffff',
                      color: movementType === 'OUT' && category === 2 ? '#c2410c' : '#334155',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    [↓] Rút két nộp Chủ / Két sắt
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('IN');
                      setCategory(3);
                      setReason('Nạp thêm tiền lẻ vào két');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: movementType === 'IN' && category === 3 ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: movementType === 'IN' && category === 3 ? '#ecfdf5' : '#ffffff',
                      color: movementType === 'IN' && category === 3 ? '#065f46' : '#334155',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                      gridColumn: '1 / -1',
                    }}
                  >
                    [+] Nạp thêm tiền lẻ vào két
                  </button>
                </div>
              </div>

              {/* Số tiền */}
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13 }}>Số tiền (VNĐ) (*):</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="modal-input font-mono font-bold"
                  style={{ fontSize: 15 }}
                  required
                />
              </div>

              {/* Quick chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[50000, 100000, 200000, 300000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11.5,
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      backgroundColor: amount === val ? '#f1f5f9' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    {val.toLocaleString('vi-VN')} đ
                  </button>
                ))}
              </div>

              {/* Cảnh báo vượt hạn mức chi */}
              {isExceedThreshold && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontSize: 13,
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Vượt hạn mức chi tự động ({threshold.toLocaleString('vi-VN')} đ)</div>
                    <div style={{ fontSize: 12 }}>
                      Phiếu chi này cần được <b>Chủ cửa hàng phê duyệt</b> trước khi lấy tiền mặt khỏi két. Tiền két chưa bị trừ cho đến khi Chủ duyệt.
                    </div>
                  </div>
                </div>
              )}

              {/* Lý do */}
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13 }}>Lý do phát sinh (*):</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="modal-input"
                  placeholder="Nhập lý do cụ thể..."
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="pos-modal-footer"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={isLoading || amount <= 0}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  backgroundColor: isExceedThreshold ? '#ea580c' : movementType === 'IN' ? '#059669' : '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading
                  ? 'Đang xử lý...'
                  : isExceedThreshold
                  ? 'Gửi Yêu Cầu Phê Duyệt'
                  : movementType === 'IN'
                  ? 'Xác Nhận Nạp Két'
                  : 'Xác Nhận Xuất Quỹ'}
              </button>
            </div>
          </form>
        ) : (
          /* Tab Lịch sử */
          <div className="pos-modal-body" style={{ maxHeight: 380, overflowY: 'auto', padding: '14px 16px' }}>
            {movementsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 13 }}>
                Chưa có phiếu thu chi nào trong ca này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {movementsList.map((m) => {
                  const isPending = m.status === 'PendingApproval' || m.status === 2;
                  const isRejected = m.status === 'Rejected' || m.status === 3;
                  const isCancelled = m.status === 'Cancelled' || m.status === 4;
                  const isCashDraw = m.category === 'CASH_DRAW' || m.category === 2;

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        backgroundColor: isPending ? '#fffbeb' : '#ffffff',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: m.movementType === 'IN' || m.movementType === 1 ? '#dcfce7' : '#fee2e2',
                              color: m.movementType === 'IN' || m.movementType === 1 ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {m.movementType === 'IN' || m.movementType === 1 ? '+ THU' : '- CHI'}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{m.reason}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                          {new Date(m.occurredAtUtc).toLocaleTimeString('vi-VN')} • Tạo bởi: {m.createdByName || 'Thu ngân'}
                          {isCashDraw && (
                            <span style={{ marginLeft: 8, color: m.isConfirmedByOwner ? '#10b981' : '#f59e0b' }}>
                              [{m.isConfirmedByOwner ? 'Chủ đã nhận tiền' : 'Chờ chủ xác nhận nhận tiền'}]
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            color: m.movementType === 'IN' || m.movementType === 1 ? '#10b981' : '#ef4444',
                          }}
                        >
                          {(m.movementType === 'IN' || m.movementType === 1 ? '+' : '-') + m.amount.toLocaleString('vi-VN')} đ
                        </div>

                        {isPending ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                              Chờ chủ duyệt
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelPending(m.id)}
                              style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                borderRadius: 4,
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fff',
                                color: '#b91c1c',
                                cursor: 'pointer',
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : isRejected ? (
                          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                            Đã từ chối: {m.rejectionReason}
                          </span>
                        ) : isCancelled ? (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Đã hủy</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Đã ghi nhận</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
