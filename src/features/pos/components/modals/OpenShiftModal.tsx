import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { DoorOpen, AlertCircle, CheckCircle2, Banknote, X } from 'lucide-react';
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
  branchName = 'Chi nhánh Ba Đình',
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

    const trimmedShiftName = shiftName.trim();
    if (!branchId.trim() || !tillId.trim()) {
      setErrorMsg('Thiếu thông tin chi nhánh hoặc quầy thu ngân. Vui lòng tải lại màn hình.');
      return;
    }
    if (trimmedShiftName.length < 2 || trimmedShiftName.length > 80) {
      setErrorMsg('Tên ca phải có từ 2 đến 80 ký tự.');
      return;
    }
    if (!Number.isSafeInteger(openingFloat) || openingFloat < 0) {
      setErrorMsg('Tiền mặt đầu ca phải là số nguyên không âm.');
      return;
    }
    if (notes.trim().length > 500) {
      setErrorMsg('Ghi chú tối đa 500 ký tự.');
      return;
    }

    setIsLoading(true);

    try {
      const shift = await posShiftApi.openShift({
        branchId,
        tillId,
        shiftName: trimmedShiftName,
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: 'min(90vh, 740px)',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sang trọng với tông màu Teal chủ đạo */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.15)',
              }}
            >
              <DoorOpen size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Mở Ca Làm Việc POS
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                <span style={{ fontWeight: 600, color: '#0f766e' }}>{branchName}</span> • Thu ngân:{' '}
                <b style={{ color: '#1e293b' }}>{user?.fullName || 'Thu ngân'}</b>
              </p>
            </div>
          </div>

          {canCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 13,
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                  title="Đóng thông báo"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Tên ca */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Tên ca làm việc (*):
              </label>
              <input
                type="text"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                maxLength={80}
                placeholder="VD: Ca Sáng - 06/11/2026"
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f766e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            {/* CARD KIỂM KÊ TIỀN MẶT ĐẦU CA */}
            <div
              style={{
                borderRadius: 12,
                border: '1.5px solid #ccfbf1',
                backgroundColor: '#f0fdfa',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f766e', fontSize: 13, fontWeight: 700 }}>
                  <Banknote size={17} />
                  <span>Kế thừa tiền bàn giao ca trước (A_expected):</span>
                </div>
                <div
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    backgroundColor: '#ffffff',
                    border: '1px solid #99f6e4',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: 14,
                    color: '#0f766e',
                  }}
                >
                  {openingFloatExpected.toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* Ô NHẬP TIỀN THỰC TẾ TRONG KÉT */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#134e4a',
                    marginBottom: 6,
                  }}
                >
                  Tiền mặt thực tế trong két khi mở ca (A) (*):
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1000}
                    value={openingFloat === 0 ? '' : openingFloat}
                    onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 48px 0 16px',
                      borderRadius: 10,
                      border: '2px solid #0f766e',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: '#0f766e',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 4px rgba(15, 118, 110, 0.08)',
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 0 4px rgba(15, 118, 110, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 2px 4px rgba(15, 118, 110, 0.08)';
                    }}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 14,
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#0f766e',
                      pointerEvents: 'none',
                    }}
                  >
                    đ
                  </span>
                </div>
              </div>

              {/* Nút bấm chọn số tiền nhanh */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#115e59', marginBottom: 6 }}>
                  Chọn nhanh số tiền thông dụng:
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[500000, 1000000, 1500000, 2000000, 3000000].map((val) => {
                    const isSelected = openingFloat === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpeningFloat(val)}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12.5,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: isSelected ? '1.5px solid #0f766e' : '1px solid #99f6e4',
                          backgroundColor: isSelected ? '#0f766e' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#0f766e',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {val >= 1000000 ? `${val / 1000000} Triệu` : `${val / 1000}k`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chênh lệch đầu ca */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                  borderTop: '1px dashed #99f6e4',
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#134e4a' }}>
                  Chênh lệch đầu ca (A - A_expected):
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    backgroundColor: discrepancy === 0 ? '#dcfce7' : discrepancy > 0 ? '#e0f2fe' : '#fee2e2',
                    color: discrepancy === 0 ? '#15803d' : discrepancy > 0 ? '#0369a1' : '#b91c1c',
                    border: discrepancy === 0 ? '1px solid #86efac' : discrepancy > 0 ? '1px solid #7dd3fc' : '1px solid #fca5a5',
                  }}
                >
                  {discrepancy === 0 ? (
                    '✓ Khớp 100% (0 đ)'
                  ) : discrepancy > 0 ? (
                    `+${discrepancy.toLocaleString('vi-VN')} đ (Thừa tiền)`
                  ) : (
                    `${discrepancy.toLocaleString('vi-VN')} đ (Thiếu tiền)`
                  )}
                </span>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: 6,
                }}
              >
                Ghi chú mở ca (tùy chọn):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="VD: Két có đủ mệnh giá tiền lẻ 10k, 20k, 50k..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f766e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Footer nút hành động */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              flexShrink: 0,
            }}
          >
            {canCancel && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13.5,
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
                gap: 8,
                padding: '10px 24px',
                borderRadius: 8,
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: isLoading || openingFloat < 0 ? 'not-allowed' : 'pointer',
                opacity: isLoading || openingFloat < 0 ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{isLoading ? 'Đang kích hoạt ca...' : 'Bắt Đầu Ca Bán Hàng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
