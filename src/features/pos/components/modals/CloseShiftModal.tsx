import React, { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { Lock, AlertCircle, CheckCircle, X, CreditCard, Banknote, TrendingUp, Sparkles } from 'lucide-react';
import { posShiftApi } from '../../api/posShiftApi';
import type { ShiftDetailResponse, ShiftCashMovementDto } from '../../types/posShift.types';

interface Props {
  isOpen: boolean;
  shift: ShiftDetailResponse;
  onClose: () => void;
  onShiftClosed: (closedShift: ShiftDetailResponse) => void;
}

const DENOMINATIONS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

export const CloseShiftModal: FC<Props> = ({
  isOpen,
  shift,
  onClose,
  onShiftClosed,
}) => {
  const [currentShiftData, setCurrentShiftData] = useState<ShiftDetailResponse>(shift);

  // Chế độ kiểm đếm: 'quick' = Nhập nhanh tổng tiền mặt, 'detail' = Đếm 9 mệnh giá
  const [countMode, setCountMode] = useState<'quick' | 'detail'>('quick');

  // Giá trị nhập nhanh tổng tiền mặt
  const [quickCashAmount, setQuickCashAmount] = useState<number>(() => {
    return shift.expectedCash || (shift.openingFloat + shift.totalCashIn - shift.totalCashOut);
  });

  // Bảng kiểm đếm 9 mệnh giá
  const [counts, setCounts] = useState<{ [denom: number]: number }>({
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });

  // Phân bổ tiền cuối ca
  const [retainedFloat, setRetainedFloat] = useState<number>(1500000);
  const [droppedToSafe, setDroppedToSafe] = useState<number>(0);
  const [receiverUserId, setReceiverUserId] = useState<string>('Thu ngân ca sau');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh sách phiếu và trạng thái chờ duyệt
  const [movements, setMovements] = useState<ShiftCashMovementDto[]>(shift.cashMovements || []);

  const refreshMovements = async () => {
    try {
      const refreshed = await posShiftApi.getShiftById(shift.id);
      if (refreshed) {
        setCurrentShiftData(refreshed);
        setMovements(refreshed.cashMovements || []);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMovements();
    }
  }, [isOpen, shift.id]);

  // Tiền đếm từ 9 mệnh giá
  const detailCashCounted = useMemo(() => {
    return DENOMINATIONS.reduce((sum, denom) => {
      return sum + denom * (counts[denom] || 0);
    }, 0);
  }, [counts]);

  // Tổng tiền kiểm đếm thực tế H theo chế độ được chọn
  const actualCashCounted = countMode === 'quick' ? quickCashAmount : detailCashCounted;

  // Tự động phân bổ khi H thay đổi
  useEffect(() => {
    if (actualCashCounted <= 1500000) {
      setRetainedFloat(actualCashCounted);
      setDroppedToSafe(0);
    } else {
      setRetainedFloat(1500000);
      setDroppedToSafe(actualCashCounted - 1500000);
    }
  }, [actualCashCounted]);

  if (!isOpen) return null;

  // Tiền lý thuyết và doanh thu bán hàng
  const expectedCash = currentShiftData.expectedCash || (currentShiftData.openingFloat + currentShiftData.totalCashIn - currentShiftData.totalCashOut);
  const cashSales = Math.max(0, expectedCash - currentShiftData.openingFloat - currentShiftData.totalCashIn + currentShiftData.totalCashOut);
  const bankRevenue = currentShiftData.totalBankRevenue || 0;
  const totalShiftRevenue = cashSales + bankRevenue;
  const discrepancy = actualCashCounted - expectedCash;

  // Kiểm tra phiếu pending
  const pendingMovements = movements.filter((m) => m.status === 'PendingApproval' || m.status === 2);
  const hasPending = pendingMovements.length > 0;

  // Kiểm tra Invariant
  const allocatedSum = retainedFloat + droppedToSafe;
  const isAllocationValid = Math.abs(allocatedSum - actualCashCounted) < 1;

  const handleCountChange = (denom: number, count: number) => {
    setCounts((prev) => ({
      ...prev,
      [denom]: Math.max(0, count || 0),
    }));
  };

  const handleCancelPendingMovement = async (id: string) => {
    if (!window.confirm('Hủy yêu cầu chi này để mở khóa chốt ca?')) return;
    try {
      await posShiftApi.cancelCashMovement(id);
      await refreshMovements();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy yêu cầu chi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPending) {
      setErrorMsg('Vui lòng xử lý hết các phiếu chi đang chờ duyệt trước khi chốt ca!');
      return;
    }

    if (!isAllocationValid) {
      setErrorMsg('Tổng tiền để lại két và nộp két sắt phải bằng chính xác tiền kiểm đếm thực tế (Invariant violation)!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const closed = await posShiftApi.closeShift(shift.id, {
        actualCashCounted,
        retainedFloatAmount: retainedFloat,
        droppedToSafeAmount: droppedToSafe,
        receiverUserId: receiverUserId.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onShiftClosed(closed);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi chốt ca làm việc');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pos-modal-overlay">
      <div
        className="pos-modal-dialog"
        style={{
          maxWidth: 680,
          maxHeight: 'min(92vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="pos-modal-header"
          style={{
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 className="pos-modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Chốt Ca Bán Hàng &amp; Kết Toán Tiền Mặt
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Mã ca: <b style={{ color: '#0f766e' }}>{currentShiftData.shiftCode}</b> &bull; Tên ca: <b>{currentShiftData.shiftName}</b>
              </p>
            </div>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 4 }}>
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            className="pos-modal-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {errorMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 13, border: '1px solid #fecaca' }}>
                {errorMsg}
              </div>
            )}

            {/* CẢNH BÁO KHÓA CHỐT CA KHI CÒN PHIẾU CHỜ DUYỆT */}
            {hasPending && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  color: '#991b1b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                  <AlertCircle size={18} />
                  <span>CHẶN CHỐT CA: Còn {pendingMovements.length} phiếu chi đang chờ Chủ duyệt!</span>
                </div>
                <div style={{ fontSize: 12.5 }}>
                  Hệ thống không cho phép chốt ca khi quỹ tiền két chưa được chốt dứt điểm. Bạn hãy đợi Chủ duyệt hoặc tự bấm <b>"Hủy yêu cầu"</b> bên dưới:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {pendingMovements.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #fecaca',
                        fontSize: 12.5,
                      }}
                    >
                      <span>{p.reason} (<b>{p.amount.toLocaleString('vi-VN')} đ</b>)</span>
                      <button
                        type="button"
                        onClick={() => handleCancelPendingMovement(p.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: 'none',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Hủy yêu cầu này
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. KHỐI TỔNG HỢP DOANH THU CA: TIỀN MẶT VS CHUYỂN KHOẢN VIETQR */}
            <div
              style={{
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  📊 Tổng hợp doanh thu &amp; phương thức thanh toán trong ca
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Đã hoàn thành: <b>{currentShiftData.totalOrdersCount || 0} đơn hàng</b>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {/* Cột 1: Doanh thu Tiền mặt */}
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                    <Banknote size={14} className="text-emerald-600" />
                    <span>Bán hàng tiền mặt</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', marginTop: 4, fontFamily: 'monospace' }}>
                    {cashSales.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Cộng dồn vào két tiền mặt</div>
                </div>

                {/* Cột 2: Doanh thu Chuyển khoản VietQR */}
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#1e40af', fontWeight: 600 }}>
                    <CreditCard size={14} className="text-blue-600" />
                    <span>Chuyển khoản / VietQR</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb', marginTop: 4, fontFamily: 'monospace' }}>
                    {bankRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Đã vào tài khoản NH (ngoài két)</div>
                </div>

                {/* Cột 3: Tổng doanh thu toàn ca */}
                <div style={{ padding: '8px 10px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                    <TrendingUp size={14} className="text-emerald-700" />
                    <span>Tổng doanh thu ca</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 4, fontFamily: 'monospace' }}>
                    {totalShiftRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#166534', marginTop: 2 }}>Tiền mặt + Chuyển khoản</div>
                </div>
              </div>
            </div>

            {/* 2. KHỐI KẾT TOÁN TIỀN MẶT TRONG KÉT */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  💵 Kiểm đếm tiền mặt thực tế trong két (H)
                </div>

                {/* Tabs chuyển đổi giữa Nhập nhanh tổng tiền mặt và Đếm chi tiết 9 mệnh giá */}
                <div style={{ display: 'flex', gap: 4, backgroundColor: '#f1f5f9', padding: 2, borderRadius: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCountMode('quick')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: countMode === 'quick' ? '#0f766e' : 'transparent',
                      color: countMode === 'quick' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Nhập nhanh tổng tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountMode('detail')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: countMode === 'detail' ? '#0f766e' : 'transparent',
                      color: countMode === 'detail' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Đếm 9 mệnh giá
                  </button>
                </div>
              </div>

              {countMode === 'quick' ? (
                /* CHẾ ĐỘ 1: NHẬP NHANH TỔNG TIỀN MẶT */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={quickCashAmount === 0 ? '' : quickCashAmount}
                        onChange={(e) => setQuickCashAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="Nhập tổng số tiền mặt thực đếm trong két..."
                        style={{
                          width: '100%',
                          height: 42,
                          padding: '0 36px 0 12px',
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: '#0f766e',
                          borderRadius: 6,
                          border: '2px solid #0f766e',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        autoFocus
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                        đ
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuickCashAmount(expectedCash)}
                      style={{
                        height: 42,
                        padding: '0 12px',
                        borderRadius: 6,
                        border: '1px solid #10b981',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Gán bằng đúng tiền lý thuyết hệ thống"
                    >
                      <Sparkles size={14} />
                      <span>Khớp lý thuyết</span>
                    </button>
                  </div>

                  {/* Nút bấm nhanh các mệnh giá thường gặp */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Chọn nhanh:</span>
                    {[500000, 1000000, 1500000, 2000000, 3000000, 5000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickCashAmount(amt)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          backgroundColor: quickCashAmount === amt ? '#0f766e' : '#ffffff',
                          color: quickCashAmount === amt ? '#ffffff' : '#334155',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {amt >= 1000000 ? `${amt / 1000000} Triệu` : `${amt / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 2: BẢNG KIỂM ĐẾM 9 MỆNH GIÁ */
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 10px' }}>
                    {DENOMINATIONS.map((denom) => {
                      const count = counts[denom] || 0;
                      const totalLine = denom * count;
                      return (
                        <div
                          key={denom}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 6px',
                            borderRadius: 6,
                            backgroundColor: count > 0 ? '#f0fdf4' : '#ffffff',
                            border: count > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                            {denom >= 1000 ? `${denom / 1000}k` : denom}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number"
                              min={0}
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleCountChange(denom, parseInt(e.target.value, 10) || 0)}
                              placeholder="0"
                              style={{
                                width: 48,
                                padding: '2px 4px',
                                textAlign: 'right',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                              }}
                            />
                            <span style={{ fontSize: 10.5, color: '#64748b', minWidth: 38, textAlign: 'right' }}>
                              {totalLine > 0 ? `${(totalLine / 1000).toLocaleString('vi-VN')}k` : '0'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. BẢNG ĐỐI SOÁT G vs H */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tiền mặt lý thuyết hệ thống (G = Đầu ca + Bán hàng TM + Thu - Chi):</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>
                  {expectedCash.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tiền mặt thực tế kiểm đếm (H):</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f766e', fontSize: 14 }}>
                  {actualCashCounted.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 6,
                  borderTop: '1px dashed #cbd5e1',
                  fontWeight: 700,
                }}
              >
                <span>Chênh lệch kết ca (Δ = H - G):</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    color: discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#0284c7' : '#ef4444',
                  }}
                >
                  {discrepancy > 0 ? `+${discrepancy.toLocaleString('vi-VN')}` : discrepancy.toLocaleString('vi-VN')} đ
                  {discrepancy === 0 ? ' (Khớp 100%)' : discrepancy > 0 ? ' (Thừa tiền)' : ' (Thiếu tiền)'}
                </span>
              </div>
            </div>

            {/* 4. PHÂN BỔ TIỀN MẶT & RÀNG BUỘC BẤT BIẾN */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '12px 14px', backgroundColor: '#ffffff' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#1e293b' }}>
                Phân bổ tiền mặt sau chốt ca (Bắt buộc Retained + Dropped == H)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="modal-label" style={{ fontSize: 12 }}>Tiền để lại két cho ca sau (*):</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={retainedFloat}
                    onChange={(e) => setRetainedFloat(Number(e.target.value) || 0)}
                    className="modal-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="modal-label" style={{ fontSize: 12 }}>Tiền nộp két an toàn / về chủ (*):</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={droppedToSafe}
                    onChange={(e) => setDroppedToSafe(Number(e.target.value) || 0)}
                    className="modal-input font-mono font-bold"
                  />
                </div>
              </div>

              {!isAllocationValid && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                  ⚠️ Tổng phân bổ ({allocatedSum.toLocaleString('vi-VN')} đ) lệch so với thực đếm ({actualCashCounted.toLocaleString('vi-VN')} đ) {Math.abs(allocatedSum - actualCashCounted).toLocaleString('vi-VN')} đ!
                </div>
              )}
            </div>

            {/* 5. NGƯỜI NHẬN BÀN GIAO & GHI CHÚ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontSize: 12 }}>Người nhận ca tiếp theo (*):</label>
                <input
                  type="text"
                  value={receiverUserId}
                  onChange={(e) => setReceiverUserId(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label" style={{ fontSize: 12 }}>Ghi chú chốt ca (tùy chọn):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="modal-input"
                  placeholder="Ghi chú chênh lệch hoặc tình hình ca..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="pos-modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flexShrink: 0,
            }}
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
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isLoading || hasPending || !isAllocationValid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 22px',
                borderRadius: 6,
                backgroundColor: hasPending || !isAllocationValid ? '#94a3b8' : '#0f766e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: hasPending || !isAllocationValid || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle size={16} />
              <span>{isLoading ? 'Đang chốt ca...' : 'Chốt Ca & Bàn Giao'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
