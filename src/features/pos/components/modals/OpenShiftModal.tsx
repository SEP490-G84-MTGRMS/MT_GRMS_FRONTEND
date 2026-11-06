import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { DoorOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { posShiftApi } from '../../api/posShiftApi';
import type { ShiftDetailResponse } from '../../types/posShift.types';
import { useAuthStore } from '../../../../stores/useAuthStore';

interface Props {
  isOpen: boolean;
  branchId: string;
  branchName?: string;
  tillId?: string;
  onShiftOpened: (shift: ShiftDetailResponse) => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const OpenShiftModal: FC<Props> = ({
  isOpen,
  branchId,
  branchName = 'Chi nhánh chính',
  tillId = 'cd5e8d1b-b08b-448d-beff-b85ea5873d52',
  onShiftOpened,
  onCancel,
  canCancel = false,
}) => {
  const { user } = useAuthStore();
  const [openingFloat, setOpeningFloat] = useState<number>(1500000);
  const [openingFloatExpected, setOpeningFloatExpected] = useState<number>(1500000);
  const [shiftName, setShiftName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Thiết lập tên ca mặc định
    const now = new Date();
    const hour = now.getHours();
    const sessionName = hour < 12 ? 'Ca Sáng' : hour < 18 ? 'Ca Chiều' : 'Ca Tối';
    const dateStr = now.toLocaleDateString('vi-VN');
    setShiftName(`${sessionName} - ${dateStr}`);

    // Truy vấn lịch sử ca gần nhất để kế thừa tiền để lại két
    const fetchPreviousShiftFloat = async () => {
      try {
        const history = await posShiftApi.getShiftHistory(branchId);
        if (history && history.length > 0) {
          const lastClosed = history[0];
          const expected = lastClosed.retainedFloatAmount || lastClosed.openingFloat || 1500000;
          setOpeningFloatExpected(expected);
          setOpeningFloat(expected);
        }
      } catch {
        // Fallback default
        setOpeningFloatExpected(1500000);
        setOpeningFloat(1500000);
      }
    };

    fetchPreviousShiftFloat();
  }, [isOpen, branchId]);

  if (!isOpen) return null;

  const discrepancy = openingFloat - openingFloatExpected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const shift = await posShiftApi.openShift({
        branchId,
        tillId,
        shiftName: shiftName.trim() || `Ca ${new Date().toLocaleTimeString('vi-VN')}`,
        openingFloat,
        notes: notes.trim() || undefined,
      });

      onShiftOpened(shift);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể mở ca làm việc. Vui lòng thử lại!';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pos-modal-overlay">
      <div className="pos-modal-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 6, borderRadius: 8, backgroundColor: '#ccfbf1', color: '#0f766e' }}>
              <DoorOpen size={20} />
            </div>
            <div>
              <h2 className="pos-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Mở Ca Làm Việc POS
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                {branchName} • Thu ngân: <b>{user?.fullName || 'Thu ngân'}</b>
              </p>
            </div>
          </div>
          {canCancel && onCancel && (
            <button type="button" className="pos-modal-close-btn" onClick={onCancel}>
              &times;
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pos-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16 }}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="modal-form-group">
              <label className="modal-label" style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                Tên ca làm việc (*):
              </label>
              <input
                type="text"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="modal-input"
                placeholder="VD: Ca Sáng - 06/11/2026"
                required
              />
            </div>

            {/* Thông tin tiền mặt kế thừa từ ca trước */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Tiền ca trước bàn giao lại két (A_expected):</span>
                <span style={{ fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                  {openingFloatExpected.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="modal-label" style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#1e293b' }}>
                  Tiền mặt thực tế đếm được (A) (*):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={openingFloat === 0 ? '' : openingFloat}
                    onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                    className="modal-input font-mono font-bold"
                    style={{ width: 160, textAlign: 'right', fontSize: 14, color: '#0f766e' }}
                    required
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>đ</span>
                </div>
              </div>

              {/* Chênh lệch */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  paddingTop: 4,
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <span style={{ color: '#64748b' }}>Chênh lệch đầu ca (A - A_expected):</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#0284c7' : '#ef4444',
                  }}
                >
                  {discrepancy > 0 ? `+${discrepancy.toLocaleString('vi-VN')}` : discrepancy.toLocaleString('vi-VN')} đ
                  {discrepancy === 0 && ' (Khớp 100%)'}
                </span>
              </div>
            </div>

            {/* Nút bấm mệnh giá nhanh */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[500000, 1000000, 1500000, 2000000, 3000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setOpeningFloat(val)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: openingFloat === val ? '1px solid #0f766e' : '1px solid #cbd5e1',
                    backgroundColor: openingFloat === val ? '#ccfbf1' : '#ffffff',
                    color: openingFloat === val ? '#0f766e' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {val.toLocaleString('vi-VN')} đ
                </button>
              ))}
            </div>

            <div className="modal-form-group">
              <label className="modal-label" style={{ fontSize: 12.5, color: '#64748b' }}>
                Ghi chú mở ca (tùy chọn):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="modal-input"
                rows={2}
                placeholder="Ví dụ: Đã nhận tiền lẻ 10k, 20k đầy đủ..."
              />
            </div>
          </div>

          <div
            className="pos-modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {canCancel && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || openingFloat < 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 20px',
                borderRadius: 6,
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <CheckCircle size={16} />
              <span>{isLoading ? 'Đang mở ca...' : 'Bắt Đầu Ca Bán Hàng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
