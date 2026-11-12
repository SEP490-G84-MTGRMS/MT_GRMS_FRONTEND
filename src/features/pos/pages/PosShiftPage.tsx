import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  History,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Banknote,
  RefreshCw,
  AlertCircle,
  X,
  UserCheck,
  AlertTriangle,
  Eye,
  BarChart3,
  Scale,
  FileText,
} from 'lucide-react';
import { posShiftApi } from '../api/posShiftApi';
import { posOrderApi, type OwnerUnsettledSummaryResponse } from '../api/posOrderApi';
import type { ShiftDetailResponse, ConfirmHandoverRequest } from '../types/posShift.types';
import { employeeApi } from '../../employee/api/employeeApi';
import { TablePagination } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

export const PosShiftPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER';

  // Quay về trang gọi (Work schedule hoặc POS checkout)
  const branchFromUrl = searchParams.get('branchId');
  const returnPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/pos')
      ? '/pos'
      : isStoreOwner
        ? '/store-owner/employees/schedule'
        : '/pos';

  // Chi nhánh đang chọn (GUID hợp lệ)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branchFromUrl || user?.branchId || ''
  );

  // Bộ lọc dải thời gian
  const [timePreset, setTimePreset] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  // Trạng thái dữ liệu
  const [shifts, setShifts] = useState<ShiftDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal Xác nhận bàn giao ca
  const [handoverShift, setHandoverShift] = useState<ShiftDetailResponse | null>(null);
  const [selectedDetailShift, setSelectedDetailShift] = useState<ShiftDetailResponse | null>(null);
  const [handoverDecision, setHandoverDecision] = useState<'CONFIRMED' | 'DISPUTED'>('CONFIRMED');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState<boolean>(false);
  const isOwnerOrAdmin = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  // Chốt doanh thu bán lẻ cuối ngày của Chủ cửa hàng (tách riêng Đơn Chủ tự bán & Duyệt ca theo Ngày nghiệp vụ)
  const [ownerUnsettled, setOwnerUnsettled] = useState<OwnerUnsettledSummaryResponse | null>(null);
  const [isOwnerEodModalOpen, setIsOwnerEodModalOpen] = useState(false);
  const [ownerEodNote, setOwnerEodNote] = useState('');
  const [isSettlingOwnerEod, setIsSettlingOwnerEod] = useState(false);
  const [eodBranchScope, setEodBranchScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [eodBusinessDate, setEodBusinessDate] = useState<string>(() => {
    const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
    return vnNow.toISOString().slice(0, 10);
  });

  // Modal Buộc đóng ca (Force Close) cho Chủ cửa hàng khi nhân viên quên chốt ca
  const [forceCloseTargetShift, setForceCloseTargetShift] = useState<ShiftDetailResponse | null>(null);
  const [forceActualCash, setForceActualCash] = useState<number>(0);
  const [forceRetainedFloat, setForceRetainedFloat] = useState<number>(0);
  const [forceReason, setForceReason] = useState<string>('');
  const [isSubmittingForceClose, setIsSubmittingForceClose] = useState<boolean>(false);

  // Tải danh sách chi nhánh thực tế từ CSDL & Đồng bộ với TopNav
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((list) => {
      if (!isMounted) return;
      if (list && list.length > 0) {
        // Khởi tạo từ mtgrms_active_branch nếu là Chủ cửa hàng
        let initialId = '';
        try {
          const stored = localStorage.getItem('mtgrms_active_branch');
          if (stored) {
            const b = JSON.parse(stored);
            if (b?.id && b.id !== 'ALL') {
              const matched = list.find((item) => item.id === b.id || item.name === b.name);
              if (matched) initialId = matched.id;
            }
          }
        } catch {
          // fallback
        }

        if (!initialId) {
          const match = branchFromUrl
            ? list.find((b) => b.id === branchFromUrl || b.name.includes(branchFromUrl))
            : list.find((b) => b.id === user?.branchId);
          initialId = match ? match.id : list[0].id;
        }

        setSelectedBranchId(initialId);
        setSearchParams({ branchId: initialId });
      }
    });

    // Lắng nghe sự kiện đổi chi nhánh từ Taskbar TopNav
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const branch = customEvent.detail;
      if (branch?.id && branch.id !== 'ALL') {
        setSelectedBranchId(branch.id);
        setSearchParams({ branchId: branch.id });
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      isMounted = false;
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, [branchFromUrl, user?.branchId]);

  // Tải danh sách lịch sử ca từ Backend API
  const fetchShiftHistory = useCallback(async () => {
    if (!selectedBranchId || selectedBranchId.startsWith('BR-')) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let fromIso: string | undefined;
      let toIso: string | undefined;

      const now = new Date();
      if (timePreset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        fromIso = start.toISOString();
      } else if (timePreset === '7days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromIso = start.toISOString();
      } else if (timePreset === '30days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        fromIso = start.toISOString();
      }

      const res = await posShiftApi.getShiftHistory(selectedBranchId, fromIso, toIso);
      setShifts(res || []);
      setCurrentPage(1);

      if (isOwnerOrAdmin) {
        posOrderApi
          .getOwnerUnsettledSummary(eodBranchScope === 'ALL' ? undefined : selectedBranchId)
          .then((summary) => setOwnerUnsettled(summary))
          .catch(() => setOwnerUnsettled(null));
      }
    } catch (err: any) {
      console.error('Lỗi tải lịch sử ca:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tải lịch sử ca làm việc.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, timePreset, isOwnerOrAdmin, eodBranchScope]);

  useEffect(() => {
    fetchShiftHistory();
  }, [fetchShiftHistory]);

  // Quy tắc Ngày nghiệp vụ (Business Date): Ca làm việc (kể cả ca xuyên đêm 22:00 -> 06:00) tính theo Ngày mở ca (giờ VN UTC+7)
  const getBusinessDateStr = useCallback((isoString?: string | null): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    return vnTime.toISOString().slice(0, 10);
  }, []);

  // Danh sách tất cả các ca của Nhân viên đã đóng nhưng đang chờ Chủ cửa hàng duyệt bàn giao (tiền đang lơ lửng chưa vào Két sắt)
  const pendingEmployeeShifts = useMemo(() => {
    return shifts.filter(
      (s) =>
        (s.status === 2 || s.status === 'Closed' || Boolean(s.closedAtUtc)) &&
        (s.handoverStatus === 1 || s.handoverStatus === 'PENDING' || !s.handoverStatus)
    );
  }, [shifts]);

  // Cảnh báo các ca đã đóng lâu (> 2 giờ hoặc từ ngày trước) mà Chủ chưa duyệt bàn giao
  const overduePendingShifts = useMemo(() => {
    const nowMs = Date.now();
    const todayVn = new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
    return pendingEmployeeShifts.filter((s) => {
      const closedTime = s.closedAtUtc ? new Date(s.closedAtUtc).getTime() : 0;
      const shiftBizDate = getBusinessDateStr(s.openedAtUtc);
      const isOverTwoHours = closedTime > 0 && nowMs - closedTime > 2 * 3600 * 1000;
      const isFromPastDay = shiftBizDate !== '' && shiftBizDate < todayVn;
      return isOverTwoHours || isFromPastDay;
    });
  }, [pendingEmployeeShifts, getBusinessDateStr]);

  const pendingEmployeeCashDrop = useMemo(
    () =>
      pendingEmployeeShifts.reduce(
        (sum, s) => sum + (s.droppedToSafeAmount ?? s.actualCashCounted ?? s.expectedCash ?? 0),
        0
      ),
    [pendingEmployeeShifts]
  );

  // Thống kê các ngày nghiệp vụ đang có ca chờ duyệt để Chủ cửa hàng chọn nhanh
  const pendingDatesSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of pendingEmployeeShifts) {
      const d = getBusinessDateStr(s.openedAtUtc);
      if (d) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [pendingEmployeeShifts, getBusinessDateStr]);

  // Các ca thuộc Ngày nghiệp vụ đang chọn trong Modal Cuối ngày (tính theo Ngày mở ca OpenedAtUtc)
  const shiftsForBusinessDate = useMemo(
    () => shifts.filter((s) => getBusinessDateStr(s.openedAtUtc) === eodBusinessDate),
    [shifts, eodBusinessDate, getBusinessDateStr]
  );

  // Các ca mở trong Ngày nghiệp vụ đang chọn mà nhân viên quên chưa chốt (Ca của ngày hôm sau đang mở sẽ KHÔNG nằm trong danh sách này và KHÔNG chặn khóa sổ ngày cũ)
  const openShiftsForBusinessDate = useMemo(
    () =>
      shiftsForBusinessDate.filter(
        (s) =>
          !s.closedAtUtc &&
          s.status !== 2 &&
          s.status !== 'Closed' &&
          s.cashierUserId !== user?.id
      ),
    [shiftsForBusinessDate, user?.id]
  );

  const pendingShiftsForBusinessDate = useMemo(
    () =>
      shiftsForBusinessDate.filter(
        (s) =>
          (s.status === 2 || s.status === 'Closed' || Boolean(s.closedAtUtc)) &&
          (s.handoverStatus === 1 || s.handoverStatus === 'PENDING' || !s.handoverStatus)
      ),
    [shiftsForBusinessDate]
  );

  const businessDateMetrics = useMemo(() => {
    const totalCashDrop = shiftsForBusinessDate.reduce(
      (sum, s) => sum + (s.droppedToSafeAmount ?? 0),
      0
    );
    const pendingCashDrop = pendingShiftsForBusinessDate.reduce(
      (sum, s) => sum + (s.droppedToSafeAmount ?? s.actualCashCounted ?? s.expectedCash ?? 0),
      0
    );
    const totalBankRev = shiftsForBusinessDate.reduce(
      (sum, s) => sum + (s.totalBankRevenue || 0),
      0
    );
    const totalDiscrepancy = shiftsForBusinessDate.reduce(
      (sum, s) => sum + (s.discrepancy ?? 0),
      0
    );
    return {
      totalShifts: shiftsForBusinessDate.length,
      openCount: openShiftsForBusinessDate.length,
      pendingCount: pendingShiftsForBusinessDate.length,
      totalCashDrop,
      pendingCashDrop,
      totalBankRev,
      totalDiscrepancy,
    };
  }, [shiftsForBusinessDate, openShiftsForBusinessDate, pendingShiftsForBusinessDate]);

  const handleChangeEodScope = (scope: 'CURRENT' | 'ALL') => {
    setEodBranchScope(scope);
    if (isOwnerOrAdmin) {
      posOrderApi
        .getOwnerUnsettledSummary(scope === 'ALL' ? undefined : selectedBranchId)
        .then((summary) => setOwnerUnsettled(summary))
        .catch(() => setOwnerUnsettled(null));
    }
  };

  // Thao tác 1 (Độc lập 24/7): Kết toán đơn Chủ tự bán (ShiftId = null) tính đến thời điểm hiện tại (Không bị chặn bởi ca nhân viên đang mở)
  // Thao tác 2: Duyệt bàn giao & Khóa sổ các ca nhân viên đã đóng thuộc Ngày nghiệp vụ đang chọn
  const handleApproveBusinessDateShifts = async () => {
    if (openShiftsForBusinessDate.length > 0) {
      alert(`Chưa thể khóa sổ ngày ${eodBusinessDate}: còn ${openShiftsForBusinessDate.length} ca đang mở.`);
      return;
    }
    if (pendingShiftsForBusinessDate.length === 0) {
      if (openShiftsForBusinessDate.length > 0) {
        alert(
          `Ngày ${eodBusinessDate} hiện không có ca đã đóng nào chờ duyệt (còn ${openShiftsForBusinessDate.length} ca đang mở). Nếu nhân viên quên chốt ca, vui lòng bấm "Buộc đóng ca này"!`
        );
      }
      return;
    }

    setIsSettlingOwnerEod(true);
    try {
      let approvedShiftsCount = 0;
      for (const sh of pendingShiftsForBusinessDate) {
        await posShiftApi.confirmHandover(sh.id, {
          status: 2,
          disputeReason: null,
        });
        approvedShiftsCount++;
      }
      const closing = await posShiftApi.closeBusinessDay({
        branchId: selectedBranchId,
        businessDate: eodBusinessDate,
        actualCashCounted: businessDateMetrics.totalCashDrop + (ownerUnsettled?.cashRevenue || 0),
        note: ownerEodNote.trim() || undefined,
      });
      alert(
        `Đã duyệt ${approvedShiftsCount} ca và khóa sổ ngày ${eodBusinessDate}. Phiếu thu/chi được tạo với mã ${closing.referenceCode}.`
      );
      await fetchShiftHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt khóa sổ ca trong ngày.');
    } finally {
      setIsSettlingOwnerEod(false);
    }
  };

  // Thao tác 2b: Duyệt toàn bộ các ca đã đóng đang chờ bàn giao (tất cả các ngày trong bộ lọc)
  const handleApproveAllPendingShifts = async () => {
    if (pendingEmployeeShifts.length === 0) return;

    setIsSettlingOwnerEod(true);
    try {
      let approvedShiftsCount = 0;
      for (const sh of pendingEmployeeShifts) {
        await posShiftApi.confirmHandover(sh.id, {
          status: 2,
          disputeReason: null,
        });
        approvedShiftsCount++;
      }
      alert(
        `Đã duyệt bàn giao toàn bộ ${approvedShiftsCount} ca chờ duyệt (Tổng tiền mặt vào Két sắt: ${formatVND(pendingEmployeeCashDrop)})!`
      );
      await fetchShiftHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt tất cả các ca chờ bàn giao.');
    } finally {
      setIsSettlingOwnerEod(false);
    }
  };

  // Mở Modal Buộc đóng ca (Force Close) cho Chủ cửa hàng
  const handleOpenForceCloseModal = (shift: ShiftDetailResponse) => {
    if (shift.cashierUserId === user?.id) return;
    const expected = shift.expectedCash ?? shift.openingFloat ?? 0;
    const defaultRetained = shift.openingFloat ?? 0;
    setForceCloseTargetShift(shift);
    setForceActualCash(expected);
    setForceRetainedFloat(Math.min(expected, defaultRetained));
    setForceReason('');
  };

  const handleConfirmForceCloseShift = async () => {
    if (!forceCloseTargetShift) return;
    if (forceCloseTargetShift.cashierUserId === user?.id) return;
    if (!forceReason.trim()) {
      alert('Vui lòng nhập lý do buộc đóng ca (VD: Nhân viên quên bấm chốt ca khi hết giờ).');
      return;
    }
    const dropped = Math.max(0, forceActualCash - forceRetainedFloat);
    setIsSubmittingForceClose(true);
    try {
      await posShiftApi.forceCloseShift(forceCloseTargetShift.id, {
        actualCashCounted: forceActualCash,
        retainedFloatAmount: forceRetainedFloat,
        droppedToSafeAmount: dropped,
        reason: forceReason.trim(),
        notes: `Chủ cửa hàng buộc đóng ca: ${forceReason.trim()}`,
      });
      alert(`Đã buộc đóng ca #${forceCloseTargetShift.shiftCode} và ghi nhận vào Sổ quỹ thành công!`);
      setForceCloseTargetShift(null);
      setForceReason('');
      await fetchShiftHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi buộc đóng ca.');
    } finally {
      setIsSubmittingForceClose(false);
    }
  };

  // Tính 4 thẻ KPI tổng hợp từ dữ liệu thực tế
  const kpiMetrics = useMemo(() => {
    const totalCount = shifts.length;
    const totalOpeningFloat = shifts.reduce((sum, s) => sum + s.openingFloat, 0);
    const totalActualCash = shifts.reduce((sum, s) => sum + (s.actualCashCounted ?? s.expectedCash), 0);
    const totalDiscrepancy = shifts.reduce((sum, s) => sum + (s.discrepancy ?? 0), 0);
    const totalBankRevenue = shifts.reduce((sum, s) => sum + (s.totalBankRevenue || 0), 0);

    return {
      totalCount,
      totalOpeningFloat,
      totalActualCash,
      totalDiscrepancy,
      totalBankRevenue,
    };
  }, [shifts]);

  // Dữ liệu phân trang
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shifts.slice(start, start + pageSize);
  }, [shifts, currentPage, pageSize]);

  // Xử lý gửi xác nhận bàn giao
  const handleConfirmHandoverSubmit = async () => {
    if (!handoverShift) return;
    if (handoverDecision === 'DISPUTED' && !disputeReason.trim()) {
      alert('Vui lòng nhập lý do khiếu nại bàn giao lệch tiền.');
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const request: ConfirmHandoverRequest = {
        status: handoverDecision === 'CONFIRMED' ? 2 : 3,
        disputeReason: handoverDecision === 'DISPUTED' ? disputeReason.trim() : null,
      };

      await posShiftApi.confirmHandover(handoverShift.id, request);
      alert(
        handoverDecision === 'CONFIRMED'
          ? 'Đã xác nhận nhận bàn giao ca thành công!'
          : 'Đã gửi khiếu nại bàn giao ca thành công!'
      );
      setHandoverShift(null);
      setDisputeReason('');
      await fetchShiftHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi gửi xác nhận bàn giao ca.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const formatVND = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getHandoverBadge = (status: number | string) => {
    if (status === 2 || status === 'CONFIRMED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
          }}
        >
          <CheckCircle2 size={13} />
          <span>Chủ đã xác nhận</span>
        </span>
      );
    }
    if (status === 3 || status === 'DISPUTED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          <AlertTriangle size={13} />
          <span>Khiếu nại lệch két</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: '#fffbeb',
          color: '#b45309',
          border: '1px solid #fde68a',
        }}
      >
        <Clock size={13} />
        <span>Chờ Chủ xác nhận</span>
      </span>
    );
  };

  const dedupeParticipants = (participants?: any[]) => {
    if (!participants || participants.length === 0) return [];
    const seen = new Set<string>();
    return participants.filter((p) => {
      const key = (p.userId || p.fullName || p.userName || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* ─── 1. HEADER DUY NHẤT ĐỒNG BỘ ─── */}
      <header className="pos-shift-unified-header" style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="pos-back-to-sales-btn"
              onClick={() => navigate(returnPath)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Quay lại giao diện trước"
            >
              <ArrowLeft size={15} />
              <span>{isStoreOwner ? 'Lịch Làm Việc' : 'Bán Hàng'}</span>
            </button>

            <div style={{ width: 1, height: 28, backgroundColor: '#E2E8F0' }} />

            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} className="text-teal-700" />
                <span>Lịch Sử Chốt Ca &amp; Bàn Giao Quầy</span>
              </h1>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Nhật ký các phiên ca thu ngân, đối soát chênh lệch két tiền mặt và xác nhận bàn giao
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Nút Làm Mới */}
            <button
              type="button"
              onClick={fetchShiftHistory}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Tải lại dữ liệu lịch sử ca"
            >
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. THÂN TRANG NỘI DUNG ─── */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto" style={{ padding: '20px 24px' }}>
        {/* THANH BỘ LỌC THỜI GIAN */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Khoảng thời gian:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: '7days', label: '7 ngày qua' },
                { key: '30days', label: '30 ngày qua' },
                { key: 'all', label: 'Tất cả' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setTimePreset(btn.key as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: timePreset === btn.key ? '#0F766E' : '#CBD5E1',
                    backgroundColor: timePreset === btn.key ? '#F0FDFA' : '#FFFFFF',
                    color: timePreset === btn.key ? '#0F766E' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#64748B' }}>
            Tổng số: <b>{shifts.length}</b> phiên ca ghi nhận
          </div>
        </div>

        {/* CẢNH BÁO CA ĐÃ ĐÓNG NHƯNG CHỦ CHƯA DUYỆT BÀN GIAO (TIỀN ĐANG TREO CHƯA VÀO SỔ QUỸ KÉT SẮT) */}
        {isOwnerOrAdmin && pendingEmployeeShifts.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: overduePendingShifts.length > 0 ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${overduePendingShifts.length > 0 ? '#FECACA' : '#FDE68A'}`,
              borderRadius: 10,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle
                size={18}
                color={overduePendingShifts.length > 0 ? '#DC2626' : '#D97706'}
              />
              <div style={{ fontSize: 13, color: overduePendingShifts.length > 0 ? '#991B1B' : '#92400E' }}>
                <b>
                  Cảnh báo tiền bàn giao đang treo ({pendingEmployeeShifts.length} ca đã đóng chưa duyệt
                  {overduePendingShifts.length > 0 ? `, trong đó ${overduePendingShifts.length} ca quá hạn lâu` : ''}):
                </b>{' '}
                Tổng tiền mặt nhân viên nộp đang chờ vào Két sắt là{' '}
                <b>{formatVND(pendingEmployeeCashDrop)}</b>. Vui lòng kiểm đếm và bấm Duyệt bàn giao để tiền chính thức vào Sổ quỹ.
              </div>
            </div>
          </div>
        )}

        {/* 4 THẺ KPI TỔNG HỢP LỊCH SỬ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F766E', fontSize: 12.5, fontWeight: 600 }}>
              <Clock size={16} />
              <span>Tổng Số Phiên Ca</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {kpiMetrics.totalCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>ca</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontSize: 12.5, fontWeight: 600 }}>
              <Wallet size={16} />
              <span>Tổng Tiền Đầu Ca</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {formatVND(kpiMetrics.totalOpeningFloat)}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 12.5, fontWeight: 600 }}>
              <Banknote size={16} />
              <span>Tổng Tiền Thực Đếm</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
              {formatVND(kpiMetrics.totalActualCash)}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: kpiMetrics.totalDiscrepancy < 0 ? '#DC2626' : '#D97706', fontSize: 12.5, fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>Chênh Lệch Két (Tổng)</span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: kpiMetrics.totalDiscrepancy < 0 ? '#DC2626' : kpiMetrics.totalDiscrepancy > 0 ? '#059669' : '#0F172A',
                marginTop: 8,
              }}
            >
              {kpiMetrics.totalDiscrepancy > 0 ? `+${formatVND(kpiMetrics.totalDiscrepancy)}` : formatVND(kpiMetrics.totalDiscrepancy)}
            </div>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              color: '#991B1B',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* BẢNG LỊCH SỬ CÁC CA LÀM VIỆC */}
        <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} className="text-teal-700" />
              <span>Danh Sách Các Phiên Ca Bán Hàng ({shifts.length})</span>
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '10px 14px' }}>Mã ca</th>
                  <th style={{ padding: '10px 14px' }}>Thời gian mở - đóng</th>
                  <th style={{ padding: '10px 14px' }}>Thu ngân</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tiền đầu ca</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tiền lý thuyết</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thực đếm</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Chênh lệch</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Xác nhận kết ca</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={20} className="spin text-teal-700" style={{ margin: '0 auto 8px' }} />
                      <div>Đang tải lịch sử ca làm việc từ hệ thống...</div>
                    </td>
                  </tr>
                ) : paginatedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <AlertCircle size={24} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 600, color: '#334155' }}>Không có ca làm việc nào trong khoảng thời gian này</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Hãy chọn khoảng thời gian khác hoặc kiểm tra lại chi nhánh đã chọn.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedShifts.map((s) => {
                    const diff = s.discrepancy ?? 0;
                    const isPendingHandover = s.handoverStatus === 1 || s.handoverStatus === 'PENDING';
                    const isDisputedHandover = s.handoverStatus === 3 || s.handoverStatus === 'DISPUTED';
                    const uniqueParticipants = dedupeParticipants(s.participants);
                    const cashierDisplay = uniqueParticipants.length > 0
                      ? uniqueParticipants.map((p) => p.fullName || p.userName).join(', ')
                      : 'Thu ngân quầy';

                    const earlyLateMatch = s.notes?.match(/\[GIẢI TRÌNH GIỜ CHỐT CA:\s*([^\]]+)\]/i);
                    const earlyLateText = earlyLateMatch ? earlyLateMatch[1].trim() : null;
                    const isEarlyClose = earlyLateText?.toUpperCase().includes('SỚM');
                    const isLateClose = earlyLateText?.toUpperCase().includes('MUỘN');

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                          {s.shiftCode}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontSize: 12 }}>
                          <div><b>Mở:</b> {formatDate(s.openedAtUtc)}</div>
                          <div><b>Đóng:</b> {s.closedAtUtc ? formatDate(s.closedAtUtc) : <span style={{ color: '#10B981' }}>Đang mở</span>}</div>
                          {earlyLateText && (
                            <div
                              style={{
                                marginTop: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: isEarlyClose ? '#FEF3C7' : isLateClose ? '#FEE2E2' : '#E0F2FE',
                                color: isEarlyClose ? '#B45309' : isLateClose ? '#B91C1C' : '#0369A1',
                                border: isEarlyClose ? '1px solid #FCD34D' : isLateClose ? '1px solid #FCA5A5' : '1px solid #BAE6FD',
                                maxWidth: 240,
                              }}
                              title={`Giải trình giờ chốt ca: ${earlyLateText}`}
                            >
                              <span>{isEarlyClose ? '⚠️ Chốt sớm' : isLateClose ? '⏰ Chốt muộn' : '⏱ Giải trình giờ'}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#1E293B' }}>
                          {uniqueParticipants.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 240 }} title={cashierDisplay}>
                              {uniqueParticipants.map((p, pIdx) => (
                                <span
                                  key={p.id || pIdx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    backgroundColor: '#F0FDFA',
                                    border: '1px solid #CCFBF1',
                                    color: '#0F766E',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {p.fullName || p.userName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#64748B', fontStyle: 'italic' }}>Thu ngân quầy</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                          {formatVND(s.openingFloat)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0F766E', fontWeight: 600 }}>
                          {formatVND(s.expectedCash)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0F172A' }}>
                          {s.actualCashCounted !== null && s.actualCashCounted !== undefined ? formatVND(s.actualCashCounted) : '---'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                          {diff === 0 ? (
                            <span style={{ color: '#059669' }}>Khớp (0 đ)</span>
                          ) : diff > 0 ? (
                            <span style={{ color: '#059669' }}>+{formatVND(diff)}</span>
                          ) : (
                            <span style={{ color: '#DC2626' }}>{formatVND(diff)}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {getHandoverBadge(s.handoverStatus)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedDetailShift(s)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #0F766E',
                                backgroundColor: '#F0FDFA',
                                color: '#0F766E',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Xem chi tiết phiên ca & Lý do chênh lệch"
                            >
                              <Eye size={13} />
                              <span>Chi tiết</span>
                            </button>

                            {!s.closedAtUtc && isOwnerOrAdmin && s.cashierUserId !== user?.id && (
                              <button
                                type="button"
                                onClick={() => handleOpenForceCloseModal(s)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #DC2626',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                title="Nhân viên quên chốt ca: Chủ cửa hàng tự kiểm đếm tiền, nhập lý do và buộc đóng ca"
                              >
                                <AlertTriangle size={13} />
                                <span>Buộc đóng ca</span>
                              </button>
                            )}

                            {isOwnerOrAdmin && Boolean(s.closedAtUtc) && (isPendingHandover || isDisputedHandover) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setHandoverShift(s);
                                  setHandoverDecision('CONFIRMED');
                                  setDisputeReason('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #059669',
                                  backgroundColor: '#ECFDF5',
                                  color: '#047857',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Chủ cửa hàng duyệt bàn giao & cộng tiền nộp két vào Sổ quỹ"
                              >
                                <UserCheck size={13} />
                                <span>Duyệt bàn giao</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG */}
          {shifts.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0' }}>
              <TablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={shifts.length}
                itemLabel="ca làm việc"
                pageSizeOptions={[10, 20, 50]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─── 3. MODAL XÁC NHẬN BÀN GIAO CA (HANDOVER CONFIRMATION) ─── */}
      {isOwnerOrAdmin && handoverShift && (
        <div className="pos-modal-overlay" onClick={() => setHandoverShift(null)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: 480, background: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} className="text-teal-700" />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  {`Duyệt Bàn Giao & Kết Toán Ca #${handoverShift.shiftCode}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoverShift(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: '#334155' }}>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tiền mặt đầu ca (Opening Float):</span>
                  <span style={{ fontWeight: 600, color: '#B45309' }}>
                    {formatVND(handoverShift.openingFloat || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tiền thực đếm cuối ca:</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {formatVND(handoverShift.actualCashCounted ?? handoverShift.expectedCash)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Để lại két cho ca sau:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E' }}>
                    {formatVND(handoverShift.retainedFloatAmount || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ color: '#065F46', fontWeight: 600 }}>Nộp về Két sắt Chủ tiệm (vào Sổ quỹ):</span>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: 14 }}>
                    +{formatVND(handoverShift.droppedToSafeAmount || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#1E40AF' }}>Doanh thu Chuyển khoản / VietQR trong ca:</span>
                  <span style={{ fontWeight: 700, color: '#2563EB' }}>
                    {formatVND(handoverShift.totalBankRevenue || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ color: '#64748B' }}>Nhân viên trực & bàn giao ca:</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>
                    {dedupeParticipants(handoverShift.participants).length
                      ? dedupeParticipants(handoverShift.participants).map((p) => p.fullName || p.userName).join(', ')
                      : 'Thu ngân'}
                  </span>
                </div>
                {handoverShift.notes && (
                  <div style={{ marginTop: 4, padding: '6px 8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
                    <b>Ghi chú / Giải trình chốt ca:</b> {handoverShift.notes}
                  </div>
                )}
              </div>

              {/* Lựa chọn xác nhận */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                  <input
                    type="radio"
                    name="handoverDecision"
                    value="CONFIRMED"
                    checked={handoverDecision === 'CONFIRMED'}
                    onChange={() => setHandoverDecision('CONFIRMED')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span style={{ fontWeight: 600, color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={15} color="#059669" /> Khớp tiền: Tôi xác nhận đã nhận đủ số tiền mặt bàn giao trên.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="handoverDecision"
                    value="DISPUTED"
                    checked={handoverDecision === 'DISPUTED'}
                    onChange={() => setHandoverDecision('DISPUTED')}
                    style={{ accentColor: '#DC2626' }}
                  />
                  <span style={{ fontWeight: 600, color: '#991B1B', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <AlertTriangle size={15} color="#dc2626" /> Khiếu nại: Số tiền thực tế trong két không khớp / bị sai lệch.
                  </span>
                </label>
              </div>

              {/* Ô nhập lý do khiếu nại */}
              {handoverDecision === 'DISPUTED' && (
                <div style={{ marginTop: 10, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>
                    Lý do khiếu nại (bắt buộc):
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="VD: Kiểm đếm thực tế thiếu 150.000đ so với số tiền bàn giao..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #FECACA',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setHandoverShift(null)}
                  disabled={isSubmittingHandover}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHandoverSubmit}
                  disabled={isSubmittingHandover}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: handoverDecision === 'CONFIRMED' ? '#0F766E' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingHandover ? 'Đang gửi...' : 'Xác Nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHIÊN CA BÁN HÀNG & LÝ DO CHÊNH LỆCH */}
      {selectedDetailShift && (
        <div
          className="pos-modal-overlay"
          onClick={() => setSelectedDetailShift(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 720,
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
              padding: 20,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={18} className="text-teal-700" />
                  <span>Chi Tiết Phiên Ca Bán Hàng ({selectedDetailShift.shiftCode})</span>
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Tên ca: <b>{selectedDetailShift.shiftName}</b> &bull; Mở: {formatDate(selectedDetailShift.openedAtUtc)} &bull; Đóng: {selectedDetailShift.closedAtUtc ? formatDate(selectedDetailShift.closedAtUtc) : 'Đang mở'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailShift(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nhân viên trực ca */}
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5 }}>
                <div style={{ color: '#64748B', marginBottom: 4 }}>Nhân viên tham gia trực ca:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dedupeParticipants(selectedDetailShift.participants).length ? (
                    dedupeParticipants(selectedDetailShift.participants).map((p, idx) => (
                      <span
                        key={p.id || idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: '#F0FDFA',
                          border: '1px solid #CCFBF1',
                          color: '#0F766E',
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12.5,
                        }}
                      >
                        {p.fullName || p.userName}
                      </span>
                    ))
                  ) : (
                    <b style={{ color: '#0F172A' }}>Thu ngân quầy</b>
                  )}
                </div>
              </div>

              {/* Bảng chỉ số đối soát tiền két Z-Report */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={16} color="#0F766E" /> Báo Cáo Kết Toán Tiền Két (Z-Report):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Vốn đầu ca (Opening Float):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{formatVND(selectedDetailShift.openingFloat)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Doanh thu chuyển khoản (VietQR):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0284C7' }}>{formatVND(selectedDetailShift.totalBankRevenue)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng nạp thêm vào két (+):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>+{formatVND(selectedDetailShift.totalCashIn)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng chi / rút tiền khỏi két (-):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>-{formatVND(selectedDetailShift.totalCashOut)}</div>
                  </div>
                  <div style={{ background: '#ECFDF5', padding: '8px 12px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: 11.5, color: '#065F46' }}>Tiền mặt lý thuyết trong két:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#065F46' }}>{formatVND(selectedDetailShift.expectedCash)}</div>
                  </div>
                  <div style={{ background: '#F0F9FF', padding: '8px 12px', borderRadius: 6, border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: 11.5, color: '#0369A1' }}>Tiền thực đếm lúc chốt ca:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0369A1' }}>
                      {selectedDetailShift.actualCashCounted !== null && selectedDetailShift.actualCashCounted !== undefined
                        ? formatVND(selectedDetailShift.actualCashCounted)
                        : '---'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chênh lệch két & Lý do giải trình */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: (selectedDetailShift.discrepancy ?? 0) === 0 ? '1px solid #86EFAC' : '1.5px solid #FECACA',
                  backgroundColor: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#F0FDF4' : '#FEF2F2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Scale size={15} color={(selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#991B1B'} /> Kết quả đối soát chênh lệch:
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#DC2626' }}>
                    {(selectedDetailShift.discrepancy ?? 0) === 0
                      ? 'Khớp chuẩn (0 đ)'
                      : (selectedDetailShift.discrepancy ?? 0) > 0
                        ? `Thừa +${formatVND(selectedDetailShift.discrepancy!)}`
                        : `Thiếu ${formatVND(selectedDetailShift.discrepancy!)}`}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
                  <b>Lý do giải trình chênh lệch / Ghi chú ca:</b>
                  <div style={{ marginTop: 2, padding: '6px 10px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2E8F0', fontStyle: selectedDetailShift.notes ? 'normal' : 'italic' }}>
                    {selectedDetailShift.notes || 'Không có ghi chú hoặc khiếu nại phát sinh trong ca.'}
                  </div>
                </div>
                {selectedDetailShift.retainedFloatAmount !== undefined && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#475569' }}>
                    <span>Để lại két ca sau: <b>{formatVND(selectedDetailShift.retainedFloatAmount || 0)}</b></span>
                    <span>Nộp két an toàn / Chủ: <b>{formatVND(selectedDetailShift.droppedToSafeAmount || 0)}</b></span>
                  </div>
                )}
              </div>

              {/* Lịch sử phiếu thu/chi trong ca */}
              {selectedDetailShift.cashMovements && selectedDetailShift.cashMovements.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} color="#0F766E" /> Lịch Sử Phiếu Thu / Chi Trong Ca ({selectedDetailShift.cashMovements.length}):
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          <th style={{ padding: '6px 10px' }}>Thời gian</th>
                          <th style={{ padding: '6px 10px' }}>Loại</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Số tiền</th>
                          <th style={{ padding: '6px 10px' }}>Lý do</th>
                          <th style={{ padding: '6px 10px' }}>Người lập</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetailShift.cashMovements.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{formatDate(m.occurredAtUtc)}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{ fontWeight: 600, color: m.movementType === 1 || m.movementType === 'IN' ? '#059669' : '#DC2626' }}>
                                {m.movementType === 1 || m.movementType === 'IN' ? '[+] Thu' : '[-] Chi'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{formatVND(m.amount)}</td>
                            <td style={{ padding: '6px 10px' }}>{m.reason}</td>
                            <td style={{ padding: '6px 10px', color: '#64748B' }}>{m.createdByName || 'Thu ngân'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setSelectedDetailShift(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL BÁO CÁO CUỐI NGÀY & KẾT TOÁN CHO CHỦ TIỆM (TÁCH ĐƠN CHỦ 24/7 & KHÓA SỔ CA THEO NGÀY NGHIỆP VỤ) ─── */}
      {isOwnerEodModalOpen && (
        <div
          className="pos-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setIsOwnerEodModalOpen(false)}
        >
          <div className="pos-modal-dialog" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Báo Cáo Cuối Ngày &amp; Kết Toán Doanh Thu (Chủ Cửa Hàng)
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Quy tắc Ngày nghiệp vụ: Ca làm việc (kể cả ca xuyên đêm 22:00 - 06:00) tính theo Ngày mở ca; Đơn Chủ tự bán tính theo Ngày tạo đơn
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOwnerEodModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Thanh chọn Chi nhánh (Mặc định theo từng chi nhánh) & Ngày nghiệp vụ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Phạm vi Chi nhánh (Kiểm tra độc lập từng chi nhánh):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleChangeEodScope('CURRENT')}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: eodBranchScope === 'CURRENT' ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                        backgroundColor: eodBranchScope === 'CURRENT' ? '#F0FDFA' : '#FFFFFF',
                        color: eodBranchScope === 'CURRENT' ? '#0F766E' : '#475569',
                      }}
                    >
                      Chi nhánh đang chọn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEodScope('ALL')}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: eodBranchScope === 'ALL' ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                        backgroundColor: eodBranchScope === 'ALL' ? '#F0FDFA' : '#FFFFFF',
                        color: eodBranchScope === 'ALL' ? '#0F766E' : '#475569',
                      }}
                    >
                      Tất cả chi nhánh
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Ngày nghiệp vụ (Mở ca):
                  </label>
                  <input
                    type="date"
                    className="pos-input"
                    value={eodBusinessDate}
                    onChange={(e) => setEodBusinessDate(e.target.value)}
                    style={{ width: '100%', height: 32, fontSize: 12.5, padding: '0 8px' }}
                  />
                </div>
              </div>

              {/* Thanh chọn nhanh các ngày đang có ca đã đóng chờ duyệt */}
              {pendingDatesSummary.length > 0 && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#92400E' }}>Các ngày có ca chờ duyệt:</span>
                    {pendingDatesSummary.map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => setEodBusinessDate(item.date)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: eodBusinessDate === item.date ? '1.5px solid #B45309' : '1px solid #FCD34D',
                          backgroundColor: eodBusinessDate === item.date ? '#FEF3C7' : '#FFFFFF',
                          color: '#92400E',
                        }}
                      >
                        {item.date} ({item.count} ca)
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={isSettlingOwnerEod}
                    onClick={handleApproveAllPendingShifts}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: isSettlingOwnerEod ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSettlingOwnerEod
                      ? 'Đang xử lý...'
                      : `Duyệt tất cả ${pendingEmployeeShifts.length} ca chờ (+${formatVND(pendingEmployeeCashDrop)})`}
                  </button>
                </div>
              )}

              {/* MỤC 1 (ĐỘC LẬP 24/7): KẾT TOÁN ĐƠN CHỦ TỰ BÁN (SHIFT_ID = NULL) TÍNH ĐẾN HIỆN TẠI */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>
                    1. Đơn Chủ cửa hàng tự bán đến hiện tại (ShiftId = null):
                  </span>
                  <strong style={{ color: '#0F766E' }}>{ownerUnsettled?.unsettledOrdersCount || 0} đơn chưa kết toán</strong>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>
                  Các đơn này được cộng đúng một lần khi Chủ cửa hàng khóa sổ ngày nghiệp vụ; không tạo phiếu thu riêng trước đó.
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 2 }}>
                  <span style={{ color: '#065F46' }}>Tiền mặt Chủ tự bán (vào Két sắt):</span>
                  <strong style={{ color: '#059669' }}>+{formatVND(ownerUnsettled?.cashRevenue || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#1E40AF' }}>Chuyển khoản / VietQR Chủ tự bán (vào Ngân hàng):</span>
                  <strong style={{ color: '#2563EB' }}>+{formatVND(ownerUnsettled?.bankRevenue || 0)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    Tổng đơn Chủ chờ kết toán: <b style={{ color: '#0F766E' }}>{formatVND(ownerUnsettled?.totalRevenue || 0)}</b>
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11.5 }}>Sẽ kết toán khi khóa sổ ngày</span>
                </div>
              </div>

              {/* MỤC 2: BÁO CÁO & KHÓA SỔ CÁC CA NHÂN VIÊN THUỘC NGÀY NGHIỆP VỤ ĐANG CHỌN */}
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#92400E' }}>
                    2. Các ca Nhân viên thuộc Ngày nghiệp vụ ({eodBusinessDate}):
                  </span>
                  <strong style={{ color: '#B45309' }}>
                    {businessDateMetrics.totalShifts} ca ({businessDateMetrics.pendingCount} ca chờ duyệt)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#78350F' }}>Tiền mặt bàn giao về Két sắt (chờ duyệt):</span>
                  <strong style={{ color: '#059669' }}>+{formatVND(businessDateMetrics.pendingCashDrop)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#78350F' }}>Doanh thu Chuyển khoản / VietQR các ca trong ngày:</span>
                  <strong style={{ color: '#2563EB' }}>{formatVND(businessDateMetrics.totalBankRev)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#78350F' }}>Tổng chênh lệch thừa/thiếu két trong ngày:</span>
                  <strong style={{ color: businessDateMetrics.totalDiscrepancy < 0 ? '#DC2626' : '#059669' }}>
                    {businessDateMetrics.totalDiscrepancy > 0
                      ? `+${formatVND(businessDateMetrics.totalDiscrepancy)}`
                      : formatVND(businessDateMetrics.totalDiscrepancy)}
                  </strong>
                </div>

                {/* Nếu có ca mở trong ngày nghiệp vụ đó -> Hiển thị thông tin ca đang mở và nút dẫn tới Buộc đóng ca (không chặn duyệt các ca đã đóng) */}
                {openShiftsForBusinessDate.length > 0 && (
                  <div style={{ marginTop: 6, padding: '8px 10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#991B1B', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      Lưu ý ngày {eodBusinessDate}: Đang có {openShiftsForBusinessDate.length} ca đang mở (Nếu nhân viên quên chốt ca, bạn có thể bấm Buộc đóng ca):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {openShiftsForBusinessDate.map((os) => (
                        <div key={os.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '4px 8px', borderRadius: 4, border: '1px solid #FCA5A5' }}>
                          <span>
                            <b>#{os.shiftCode}</b> ({os.shiftName}) — Mở lúc {formatDate(os.openedAtUtc)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsOwnerEodModalOpen(false);
                              handleOpenForceCloseModal(os);
                            }}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              border: '1px solid #DC2626',
                              backgroundColor: '#DC2626',
                              color: '#FFFFFF',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Buộc đóng ca này
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTop: '1px dashed #FCD34D' }}>
                  <span style={{ fontSize: 11.5, color: '#78350F' }}>
                    {pendingShiftsForBusinessDate.length > 0
                      ? `Có ${pendingShiftsForBusinessDate.length} ca đã đóng chờ duyệt vào Két sắt ngày ${eodBusinessDate}.`
                      : openShiftsForBusinessDate.length > 0
                        ? 'Các ca đã đóng của ngày này đã duyệt xong; còn ca đang hoạt động ở trên.'
                        : 'Tất cả các ca đã đóng trong ngày nghiệp vụ này đều đã được duyệt.'}
                  </span>
                  <button
                    type="button"
                    disabled={
                      isSettlingOwnerEod ||
                      pendingShiftsForBusinessDate.length === 0 ||
                      openShiftsForBusinessDate.length > 0
                    }
                    onClick={handleApproveBusinessDateShifts}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor:
                        pendingShiftsForBusinessDate.length === 0
                          ? '#94A3B8'
                          : '#D97706',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor:
                        pendingShiftsForBusinessDate.length === 0
                          ? 'not-allowed'
                          : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSettlingOwnerEod
                      ? 'Đang duyệt...'
                      : `Duyệt & Khóa sổ (${pendingShiftsForBusinessDate.length} ca)`}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Ghi chú kết toán (tùy chọn):
                </label>
                <input
                  type="text"
                  className="pos-input"
                  value={ownerEodNote}
                  onChange={(e) => setOwnerEodNote(e.target.value)}
                  placeholder="VD: Kết toán doanh thu cuối ngày..."
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={() => setIsOwnerEodModalOpen(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL BUỘC ĐÓNG CA (FORCE CLOSE) DÀNH CHO CHỦ CỬA HÀNG KHI NHÂN VIÊN QUÊN CHỐT CA ─── */}
      {forceCloseTargetShift && (
        <div
          className="pos-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setForceCloseTargetShift(null)}
        >
          <div className="pos-modal-dialog" style={{ maxWidth: 500, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#991B1B' }}>
                  Buộc Đóng Ca #{forceCloseTargetShift.shiftCode} (Chủ Cửa Hàng)
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Dùng khi nhân viên hết giờ về nhưng quên bấm chốt ca. Hệ thống sẽ ghi log người đóng và lý do.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForceCloseTargetShift(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tên ca / Giờ mở ca:</span>
                  <b>{forceCloseTargetShift.shiftName} ({formatDate(forceCloseTargetShift.openedAtUtc)})</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tiền mặt đầu ca (Opening Float):</span>
                  <b>{formatVND(forceCloseTargetShift.openingFloat || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tiền mặt lý thuyết trong két (Expected):</span>
                  <b style={{ color: '#0F766E' }}>{formatVND(forceCloseTargetShift.expectedCash || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>Chênh lệch thừa / thiếu tạm tính:</span>
                  <b
                    style={{
                      color:
                        forceActualCash - (forceCloseTargetShift.expectedCash || 0) < 0
                          ? '#DC2626'
                          : '#059669',
                    }}
                  >
                    {forceActualCash - (forceCloseTargetShift.expectedCash || 0) > 0
                      ? `+${formatVND(forceActualCash - (forceCloseTargetShift.expectedCash || 0))}`
                      : formatVND(forceActualCash - (forceCloseTargetShift.expectedCash || 0))}
                  </b>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  1. Tiền mặt thực tế Chủ cửa hàng kiểm đếm trong két (đ):
                </label>
                <input
                  type="number"
                  min={0}
                  className="pos-input"
                  value={forceActualCash}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setForceActualCash(val);
                    if (forceRetainedFloat > val) setForceRetainedFloat(val);
                  }}
                  style={{ width: '100%', height: 38, fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    2. Để lại két cho ca sau (đ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={forceActualCash}
                    className="pos-input"
                    value={forceRetainedFloat}
                    onChange={(e) => {
                      const val = Math.min(forceActualCash, Math.max(0, Number(e.target.value) || 0));
                      setForceRetainedFloat(val);
                    }}
                    style={{ width: '100%', height: 36, fontSize: 13, fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    3. Rút nộp về Két sắt Chủ (đ):
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="pos-input"
                    value={formatVND(Math.max(0, forceActualCash - forceRetainedFloat))}
                    style={{ width: '100%', height: 36, fontSize: 13, fontWeight: 700, backgroundColor: '#F1F5F9', color: '#059669' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
                  4. Lý do buộc đóng ca (Bắt buộc ghi log):
                </label>
                <input
                  type="text"
                  className="pos-input"
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="VD: Nhân viên ca tối về quên bấm chốt ca..."
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={() => setForceCloseTargetShift(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingForceClose || !forceReason.trim()}
                  onClick={handleConfirmForceCloseShift}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: !forceReason.trim() ? '#94A3B8' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !forceReason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingForceClose ? 'Đang đóng ca...' : 'Xác Nhận Buộc Đóng Ca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
