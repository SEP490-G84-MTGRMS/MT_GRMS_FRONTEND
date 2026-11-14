import React, { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { Lock, AlertCircle, CheckCircle, X, CreditCard, Banknote, TrendingUp, BarChart3, AlertTriangle, Clock } from 'lucide-react';
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
  const [receiverUserId, setReceiverUserId] = useState<string>('');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [earlyOrLateReason, setEarlyOrLateReason] = useState<string>('');
  const [plannedEndTime, setPlannedEndTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh sách phiếu và trạng thái chờ duyệt
  const [movements, setMovements] = useState<ShiftCashMovementDto[]>(shift.cashMovements || []);

  // Đọc danh sách đơn hàng phát sinh trong ca từ cache local (hỗ trợ hiển thị tức thì & đối soát)
  const shiftOrders = useMemo(() => {
    try {
      const cached = localStorage.getItem(`mtgrms_shift_orders_${shift.id}`);
      if (cached) {
        return JSON.parse(cached) as Array<{
          id: string;
          totalAmount?: number;
          finalAmount?: number;
          paymentMethod?: string | number;
        }>;
      }
    } catch {
      // ignore
    }
    return [];
  }, [shift.id]);

  const localCashSales = useMemo(() => {
    return shiftOrders.reduce((sum, o) => {
      const pm = String(o.paymentMethod || '').toUpperCase();
      const isCash = pm === 'CASH' || pm === '1';
      return sum + (isCash ? (o.finalAmount || o.totalAmount || 0) : 0);
    }, 0);
  }, [shiftOrders]);

  const localBankSales = useMemo(() => {
    return shiftOrders.reduce((sum, o) => {
      const pm = String(o.paymentMethod || '').toUpperCase();
      const isBank = pm === 'VIETQR' || pm === 'BANK_TRANSFER' || pm === '2' || pm === 'QR';
      return sum + (isBank ? (o.finalAmount || o.totalAmount || 0) : 0);
    }, 0);
  }, [shiftOrders]);

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
      setCurrentShiftData(shift);
      refreshMovements();
      posShiftApi.checkCashierEligibility(shift.branchId)
        .then((res) => {
          if (res?.activeSchedule?.plannedEndTime) {
            setPlannedEndTime(res.activeSchedule.plannedEndTime);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, shift.id, shift.branchId]);

  // Phát hiện chốt ca SỚM hoặc MUỘN để bắt buộc nhập lý do giải trình cho Chủ cửa hàng
  const shiftTimingStatus = useMemo(() => {
    const now = new Date();
    const openedAt = new Date(currentShiftData.openedAtUtc);
    const durationMinutes = Math.max(1, Math.round((now.getTime() - openedAt.getTime()) / 60000));
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationText = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

    // Ưu tiên kiểm tra theo giờ kết thúc ca phân công (plannedEndTime, định dạng HH:mm)
    let targetEndStr = plannedEndTime;
    if (!targetEndStr) {
      const nameLower = (currentShiftData.shiftName || '').toLowerCase();
      if (nameLower.includes('sáng')) targetEndStr = '14:00';
      else if (nameLower.includes('chiều') || nameLower.includes('tối')) targetEndStr = '22:00';
    }

    if (targetEndStr && /^\d{1,2}:\d{2}/.test(targetEndStr)) {
      const [eh, em] = targetEndStr.split(':').map(Number);
      const plannedEndMinutes = eh * 60 + em;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const diffMinutes = nowMinutes - plannedEndMinutes;

      if (diffMinutes < -15) {
        const earlyMins = Math.abs(diffMinutes);
        return {
          type: 'EARLY' as const,
          label: `Chốt ca sớm (${earlyMins >= 60 ? `${Math.floor(earlyMins / 60)}h${earlyMins % 60}p` : `${earlyMins} phút`} trước giờ kết ca ${targetEndStr})`,
          durationText,
          targetEndStr,
        };
      }
      if (diffMinutes > 30) {
        return {
          type: 'LATE' as const,
          label: `Chốt ca muộn (${diffMinutes >= 60 ? `${Math.floor(diffMinutes / 60)}h${diffMinutes % 60}p` : `${diffMinutes} phút`} sau giờ kết ca ${targetEndStr})`,
          durationText,
          targetEndStr,
        };
      }
    }

    // Kiểm tra theo thời lượng trực ca tiêu chuẩn (dưới 3.5 tiếng = chốt sớm, trên 9 tiếng = chốt muộn)
    if (durationMinutes < 210) {
      return {
        type: 'EARLY' as const,
        label: `Chốt ca sớm (Mới mở ca được ${durationText})`,
        durationText,
        targetEndStr: targetEndStr || 'Tiêu chuẩn >= 4h',
      };
    }
    if (durationMinutes > 540) {
      return {
        type: 'LATE' as const,
        label: `Chốt ca muộn (Ca kéo dài ${durationText})`,
        durationText,
        targetEndStr: targetEndStr || 'Tiêu chuẩn <= 8h',
      };
    }

    return {
      type: 'ON_TIME' as const,
      label: `Đúng giờ (${durationText})`,
      durationText,
      targetEndStr: targetEndStr || 'Đúng khung giờ',
    };
  }, [currentShiftData.openedAtUtc, currentShiftData.shiftName, plannedEndTime]);

  const isEarlyOrLate = shiftTimingStatus.type === 'EARLY' || shiftTimingStatus.type === 'LATE';

  // Tiền đếm từ 9 mệnh giá
  const detailCashCounted = useMemo(() => {
    return DENOMINATIONS.reduce((sum, denom) => {
      return sum + denom * (counts[denom] || 0);
    }, 0);
  }, [counts]);

  // Số lượng đơn hàng đã bán trong ca
  const ordersCount = Math.max(currentShiftData.totalOrdersCount || 0, shiftOrders.length);

  // Doanh thu chuyển khoản / VietQR
  const bankRevenue = (currentShiftData.totalBankRevenue && currentShiftData.totalBankRevenue > 0)
    ? currentShiftData.totalBankRevenue
    : localBankSales;

  // Doanh thu tiền mặt bán hàng
  const backendCashSales = Math.max(0, (currentShiftData.expectedCash || 0) - currentShiftData.openingFloat - (currentShiftData.totalCashIn || 0) + (currentShiftData.totalCashOut || 0));
  const cashSales = backendCashSales > 0 ? backendCashSales : localCashSales;

  // Tổng doanh thu toàn ca
  const totalShiftRevenue = cashSales + bankRevenue;

  // Tiền lý thuyết trong két (G) = Tiền đầu ca + Doanh thu tiền mặt + Thu két - Chi két
  const expectedCash = (currentShiftData.openingFloat || 0) + cashSales + (currentShiftData.totalCashIn || 0) - (currentShiftData.totalCashOut || 0);

  // Tự động đồng bộ quickCashAmount khi expectedCash cập nhật từ doanh số thực tế
  useEffect(() => {
    if (expectedCash > 0 && (quickCashAmount === 0 || quickCashAmount === (shift.openingFloat || 1500000))) {
      setQuickCashAmount(expectedCash);
    }
  }, [expectedCash, shift.openingFloat]);

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

  const discrepancy = actualCashCounted - expectedCash;

  // Kiểm tra phiếu pending
  const pendingMovements = movements.filter((m) => m.status === 'PendingApproval' || m.status === 2);
  const hasPending = pendingMovements.length > 0;

  // Kiểm tra Invariant
  const allocatedSum = retainedFloat + droppedToSafe;
  const isAllocationValid =
    Number.isSafeInteger(actualCashCounted) &&
    actualCashCounted >= 0 &&
    Number.isSafeInteger(retainedFloat) &&
    retainedFloat >= 0 &&
    Number.isSafeInteger(droppedToSafe) &&
    droppedToSafe >= 0 &&
    Math.abs(allocatedSum - actualCashCounted) < 1;

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

  const isShiftClosing = currentShiftData.status === 'Closing' || currentShiftData.status === 3;
  const isShiftOpen = currentShiftData.status === 'Open' || currentShiftData.status === 1;

  const handleStartClosing = async () => {
    if (notes.trim().length > 500) {
      setErrorMsg('Ghi chú tối đa 500 ký tự.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const updated = await posShiftApi.startClosingShift(shift.id, { notes: notes.trim() || undefined });
      setCurrentShiftData(updated);
      alert('Đã chuyển sang trạng thái kiểm đếm chốt ca (Closing). Toàn bộ quầy POS thuộc chi nhánh đã tạm thời khóa bán hàng để bảo toàn tiền két.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi bắt đầu chốt ca');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClosing = async () => {
    if (notes.trim().length > 500) {
      setErrorMsg('Ghi chú tối đa 500 ký tự.');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn hủy chốt ca và mở lại quầy cho các thu ngân tiếp tục bán hàng?')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const updated = await posShiftApi.cancelClosingShift(shift.id, { reason: notes.trim() || 'Thu ngân mở lại quầy' });
      setCurrentShiftData(updated);
      alert('Đã hủy chốt ca. Quầy POS của chi nhánh đã được mở lại để tiếp tục bán hàng.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi hủy chốt ca');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isShiftClosing) {
      setErrorMsg('Vui lòng bấm “Bắt đầu kiểm đếm” để khóa bán quầy trước khi hoàn tất đóng ca.');
      return;
    }
    if (!Number.isSafeInteger(actualCashCounted) || actualCashCounted < 0) {
      setErrorMsg('Tiền mặt thực đếm phải là số nguyên không âm trong giới hạn hợp lệ.');
      return;
    }
    if (
      !Number.isSafeInteger(retainedFloat) ||
      retainedFloat < 0 ||
      !Number.isSafeInteger(droppedToSafe) ||
      droppedToSafe < 0
    ) {
      setErrorMsg('Tiền để lại két và tiền nộp két phải là số nguyên không âm.');
      return;
    }
    if (receiverUserId.trim().length > 100 || notes.trim().length > 500 || earlyOrLateReason.trim().length > 500 || discrepancyReason.trim().length > 500) {
      setErrorMsg('Người nhận tối đa 100 ký tự; ghi chú và giải trình tối đa 500 ký tự.');
      return;
    }
    if (hasPending) {
      setErrorMsg('Vui lòng xử lý hết các phiếu chi đang chờ duyệt trước khi chốt ca!');
      return;
    }

    if (!isAllocationValid) {
      setErrorMsg('Tổng tiền để lại và tiền bàn giao phải bằng tiền thực tế trong két.');
      return;
    }

    if (discrepancy !== 0 && !discrepancyReason.trim()) {
      setErrorMsg('Vui lòng nhập lý do chênh lệch tiền trong két.');
      return;
    }

    if (isEarlyOrLate && !earlyOrLateReason.trim()) {
      setErrorMsg(
        `Bắt buộc nhập lý do giải trình vì bạn đang ${shiftTimingStatus.type === 'EARLY' ? 'chốt ca sớm' : 'chốt ca muộn'} để Chủ cửa hàng kiểm soát!`
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const formattedEarlyLateReason = isEarlyOrLate && earlyOrLateReason.trim()
        ? `[${shiftTimingStatus.type === 'EARLY' ? 'CHỐT CA SỚM' : 'CHỐT CA MUỘN'} - ${shiftTimingStatus.label}]: ${earlyOrLateReason.trim()}`
        : undefined;

      const closed = await posShiftApi.confirmCloseShift(shift.id, {
        actualCashCounted,
        retainedFloatAmount: retainedFloat,
        droppedToSafeAmount: droppedToSafe,
        receiverUserId: receiverUserId.trim() || undefined,
        notes: notes.trim() || undefined,
        earlyOrLateReason: formattedEarlyLateReason,
        discrepancyReason: discrepancyReason.trim() || undefined,
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

            {/* TRẠNG THÁI CLOSING LOCKDOWN BANNER */}
            {isShiftClosing && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={16} />
                  <span>
                    <strong>Trạng thái: Đang kiểm đếm chốt ca (Closing).</strong> Toàn bộ quầy POS chi nhánh đang tạm khóa thanh toán.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleCancelClosing}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d97706',
                    color: '#b45309',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  Hủy chốt ca &amp; Mở lại bán
                </button>
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
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={15} color="#0f766e" /> Tổng hợp doanh thu &amp; phương thức thanh toán trong ca
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Đã hoàn thành: <b style={{ color: '#0f766e' }}>{ordersCount} đơn hàng</b>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                {/* Cột 1: Tiền mặt đầu ca (Opening Float) */}
                <div style={{ padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#92400e', fontWeight: 600 }}>
                    <Banknote size={14} className="text-amber-600" />
                    <span>Tiền mặt đầu ca</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
                    {(currentShiftData.openingFloat || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#b45309', marginTop: 2 }}>Vốn lẻ nhận bàn giao đầu ca</div>
                </div>

                {/* Cột 2: Doanh thu Tiền mặt */}
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                    <Banknote size={14} className="text-emerald-600" />
                    <span>Bán hàng tiền mặt</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                    {cashSales.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>Cộng dồn vào két tiền mặt</div>
                </div>

                {/* Cột 3: Doanh thu Chuyển khoản VietQR */}
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#1e40af', fontWeight: 600 }}>
                    <CreditCard size={14} className="text-blue-600" />
                    <span>Chuyển khoản / VietQR</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                    {bankRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Đã vào tài khoản NH (ngoài két)</div>
                </div>

                {/* Cột 4: Tổng doanh thu toàn ca */}
                <div style={{ padding: '8px 10px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                    <TrendingUp size={14} className="text-emerald-700" />
                    <span>Tổng doanh thu ca</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                    {totalShiftRevenue.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: 10.5, color: '#166534', marginTop: 2 }}>Tiền mặt + Chuyển khoản</div>
                </div>
              </div>
            </div>

            {/* 2. KHỐI KẾT TOÁN TIỀN MẶT TRONG KÉT */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Banknote size={15} color="#0f766e" /> Kiểm đếm tiền mặt thực tế trong két
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
                        max={Number.MAX_SAFE_INTEGER}
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
                              max={Number.MAX_SAFE_INTEGER}
                              step={1}
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleCountChange(denom, parseInt(e.target.value, 10) || 0)}
                              placeholder="0"
                              style={{
                                width: 48,
                                padding: '2px 4px',
                                textAlign: 'right',
                                fontSize: 12,
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

            {/* 3. BẢNG ĐỐI SOÁT G vs H (KÈM CHI TIẾT TIỀN MẶT ĐẦU CA + BÁN HÀNG + THU - CHI) */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', paddingBottom: 6, borderBottom: '1px dashed #e2e8f0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>+ Tiền mặt đầu ca (Opening Float):</span>
                  <span style={{ fontWeight: 600, color: '#b45309' }}>
                    {(currentShiftData.openingFloat || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>+ Bán hàng thu tiền mặt:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    +{cashSales.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>+ Thu tiền mặt khác trong ca:</span>
                  <span style={{ fontWeight: 600, color: '#0284c7' }}>
                    +{(currentShiftData.totalCashIn || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>- Chi tiền mặt / Rút két trong ca:</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>
                    -{(currentShiftData.totalCashOut || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#334155', fontWeight: 600 }}>Tiền mặt lý thuyết hệ thống (G = Đầu ca + Bán hàng TM + Thu - Chi):</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  {expectedCash.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tiền thực tế trong két:</span>
                <span style={{ fontWeight: 800, color: '#0f766e', fontSize: 14 }}>
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
                <span>Chênh lệch:</span>
                <span
                  style={{
                    color: discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#0284c7' : '#ef4444',
                  }}
                >
                  {discrepancy > 0 ? `+${discrepancy.toLocaleString('vi-VN')}` : discrepancy.toLocaleString('vi-VN')} đ
                  {discrepancy === 0 ? ' (Khớp 100%)' : discrepancy > 0 ? ' (Thừa tiền)' : ' (Thiếu tiền)'}
                </span>
              </div>
            </div>

            {discrepancy !== 0 && (
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontSize: 12 }}>Lý do chênh lệch (*):</label>
                <textarea
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  maxLength={500}
                  className="modal-input"
                  aria-required="true"
                  placeholder="Mô tả nguyên nhân thừa hoặc thiếu tiền trong két"
                />
              </div>
            )}

            {/* 4. PHÂN BỔ TIỀN MẶT & RÀNG BUỘC BẤT BIẾN */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '12px 14px', backgroundColor: '#ffffff' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#1e293b' }}>
                Bàn giao tiền sau khi chốt ca
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="modal-label" style={{ fontSize: 12 }}>Tiền để lại két cho ca sau (*):</label>
                  <input
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1000}
                    value={retainedFloat}
                    onChange={(e) => setRetainedFloat(Number(e.target.value) || 0)}
                    className="modal-input tabular-nums font-bold"
                  />
                </div>

                <div>
                  <label className="modal-label" style={{ fontSize: 12 }}>Tiền nộp két an toàn / về chủ (*):</label>
                  <input
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1000}
                    value={droppedToSafe}
                    onChange={(e) => setDroppedToSafe(Number(e.target.value) || 0)}
                    className="modal-input tabular-nums font-bold"
                  />
                </div>
              </div>

              {!isAllocationValid && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span>Hai khoản phân bổ phải là số nguyên không âm và tổng phải bằng tiền thực đếm. Chênh lệch hiện tại: {Math.abs(allocatedSum - actualCashCounted).toLocaleString('vi-VN')} đ.</span>
                </div>
              )}
            </div>

            {/* 5. THÔNG TIN BÀN GIAO & GHI CHÚ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="modal-form-group">
                <label className="modal-label" style={{ fontSize: 12 }}>Người nhận bàn giao (tùy chọn):</label>
                <input
                  type="text"
                  value={receiverUserId}
                  onChange={(e) => setReceiverUserId(e.target.value)}
                  maxLength={100}
                  className="modal-input"
                  placeholder="Có thể để trống; ca sau sẽ tự xác nhận tiền đầu ca"
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label" style={{ fontSize: 12 }}>Ghi chú chốt ca (tùy chọn):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  className="modal-input"
                  placeholder="Ghi chú chênh lệch hoặc tình hình ca..."
                />
              </div>
            </div>

            {/* 5.5. KIỂM SOÁT GIỜ CHỐT CA SỚM / MUỘN (BẮT BUỘC GIẢI TRÌNH VỚI CHỦ CỬA HÀNG) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: isEarlyOrLate ? '#fffbeb' : '#f8fafc',
                border: isEarlyOrLate ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: isEarlyOrLate ? '#b45309' : '#334155' }}>
                  <Clock size={15} color={isEarlyOrLate ? '#d97706' : '#0f766e'} />
                  <span>Kiểm soát thời gian trực ca: {shiftTimingStatus.label}</span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: shiftTimingStatus.type === 'EARLY' ? '#fef3c7' : shiftTimingStatus.type === 'LATE' ? '#fee2e2' : '#dcfce7',
                    color: shiftTimingStatus.type === 'EARLY' ? '#b45309' : shiftTimingStatus.type === 'LATE' ? '#b91c1c' : '#15803d',
                    border: shiftTimingStatus.type === 'EARLY' ? '1px solid #fcd34d' : shiftTimingStatus.type === 'LATE' ? '1px solid #fca5a5' : '1px solid #86efac',
                  }}
                >
                  {shiftTimingStatus.type === 'EARLY' ? 'CHỐT CA SỚM' : shiftTimingStatus.type === 'LATE' ? 'CHỐT CA MUỘN' : 'ĐÚNG GIỜ'}
                </span>
              </div>

              {isEarlyOrLate && (
                <>
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    Ca làm việc đang được đóng <b>{shiftTimingStatus.type === 'EARLY' ? 'sớm hơn' : 'muộn hơn'}</b> khung giờ tiêu chuẩn ({shiftTimingStatus.targetEndStr}). Hệ thống yêu cầu <b>bắt buộc nhập lý do giải trình</b> để Chủ cửa hàng kiểm soát:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(shiftTimingStatus.type === 'EARLY'
                      ? [
                          'Vắng khách / Đóng cửa quầy sớm theo chỉ đạo',
                          'Đổi ca / Bàn giao sớm cho ca tiếp theo',
                          'Có việc cá nhân đột xuất đã báo Quản lý',
                          'Hoàn tất kiểm kê & kết toán sớm',
                        ]
                      : [
                          'Đông khách cuối ca / Phục vụ nốt khách tại quầy',
                          'Kiểm đếm hàng hóa & vệ sinh quầy cuối ngày',
                          'Chờ đối soát chuyển khoản / đơn đặt trước',
                          'Tăng ca hỗ trợ thêm theo yêu cầu cửa hàng',
                        ]
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEarlyOrLateReason(preset)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: earlyOrLateReason === preset ? '1px solid #d97706' : '1px solid #fcd34d',
                          backgroundColor: earlyOrLateReason === preset ? '#d97706' : '#ffffff',
                          color: earlyOrLateReason === preset ? '#ffffff' : '#92400e',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={earlyOrLateReason}
                    onChange={(e) => setEarlyOrLateReason(e.target.value)}
                    maxLength={500}
                    placeholder={`Nhập lý do ${shiftTimingStatus.type === 'EARLY' ? 'chốt ca sớm' : 'chốt ca muộn'} (Bắt buộc)...`}
                    className="modal-input"
                    style={{
                      borderColor: !earlyOrLateReason.trim() ? '#f59e0b' : '#10b981',
                      backgroundColor: '#ffffff',
                    }}
                    required={isEarlyOrLate}
                  />
                </>
              )}
            </div>

            {/* Thông báo quy trình gửi báo cáo chốt ca đến Chủ cửa hàng */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#f0fdfa',
                border: '1px solid #99f6e4',
                color: '#0f766e',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={16} className="text-teal-600 flex-shrink-0" />
              <span>
                <b>Quy trình chốt ca:</b> Khi xác nhận, hệ thống khóa số liệu ca và ghi nhận tiền để lại két <b>{retainedFloat.toLocaleString('vi-VN')} đ</b>. Phần bàn giao về két chủ/két sắt là <b>{droppedToSafe.toLocaleString('vi-VN')} đ</b> và không được tính là chi phí.
              </span>
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

            {isShiftOpen && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleStartClosing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #d97706',
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                title="Tạm khóa bán hàng toàn chi nhánh để đếm tiền"
              >
                <Lock size={15} />
                <span>Bắt Đầu Kiểm Đếm (Khóa Bán Quầy)</span>
              </button>
            )}

            {isShiftClosing && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCancelClosing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #ef4444',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                title="Mở lại quầy để tiếp tục bán hàng"
              >
                <X size={15} />
                <span>Hủy Chốt Ca &amp; Mở Lại Bán</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!isShiftClosing || isLoading || hasPending || !isAllocationValid || (discrepancy !== 0 && !discrepancyReason.trim()) || (isEarlyOrLate && !earlyOrLateReason.trim())}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 22px',
                borderRadius: 6,
                backgroundColor: !isShiftClosing || hasPending || !isAllocationValid || (discrepancy !== 0 && !discrepancyReason.trim()) || (isEarlyOrLate && !earlyOrLateReason.trim()) ? '#94a3b8' : '#0f766e',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: !isShiftClosing || hasPending || !isAllocationValid || (discrepancy !== 0 && !discrepancyReason.trim()) || (isEarlyOrLate && !earlyOrLateReason.trim()) || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle size={16} />
              <span>{isLoading ? 'Đang gửi...' : (isShiftClosing ? 'Xác Nhận & Hoàn Tất Đóng Ca' : 'Gửi Báo Cáo Chốt Ca Cho Chủ Cửa Hàng')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
