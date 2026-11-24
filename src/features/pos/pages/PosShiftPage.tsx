import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  History,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  UserCheck,
  AlertTriangle,
  Eye,
  BarChart3,
  Scale,
  FileText,
  Search,
  RotateCcw,
} from 'lucide-react';
import { posShiftApi } from '../api/posShiftApi';
import { posOrderApi, type OwnerUnsettledSummaryResponse } from '../api/posOrderApi';
import type { ShiftDetailResponse, ConfirmHandoverRequest, BusinessDayClosingPreview, BusinessDayClosingVersion } from '../types/posShift.types';
import { employeeApi } from '../../employee/api/employeeApi';
import { TablePagination, SortableHeader, useTableSort } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../pos.css';

type PosShiftPageProps = {
  dailyClosing?: {
    branchId: string;
    branchName: string;
    onClose: () => void;
    onChange: () => void;
  };
};

export const PosShiftPage: FC<PosShiftPageProps> = ({ dailyClosing }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER';

  useEffect(() => {
    if (dailyClosing || !isStoreOwner || !location.pathname.startsWith('/pos/')) return;
    const params = new URLSearchParams(searchParams);
    if (!params.get('branchId')) params.set('branchId', 'ALL');
    navigate(`/store-owner/shifts?${params.toString()}`, { replace: true });
  }, [dailyClosing, isStoreOwner, location.pathname, searchParams, navigate]);

  // Quay về trang gọi (Work schedule hoặc POS checkout)
  const branchFromUrl = searchParams.get('branchId');
  const linkedShiftId = dailyClosing ? null : searchParams.get('shiftId');
  const returnPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/pos')
      ? '/pos'
      : isStoreOwner
        ? '/store-owner/employees/schedule'
        : '/pos';

  // Chi nhánh đang chọn (GUID hợp lệ)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    dailyClosing?.branchId || branchFromUrl || user?.branchId || ''
  );
  const [selectedBranchName, setSelectedBranchName] = useState('');

  // Bộ lọc dải thời gian & tìm kiếm (tách Mã ca & Thu ngân)
  const [timePreset, setTimePreset] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cashierSearch, setCashierSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Trạng thái dữ liệu
  const [shifts, setShifts] = useState<ShiftDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Modal Xác nhận bàn giao ca
  const [handoverShift, setHandoverShift] = useState<ShiftDetailResponse | null>(null);
  const [selectedDetailShift, setSelectedDetailShift] = useState<ShiftDetailResponse | null>(null);
  const [handoverDecision, setHandoverDecision] = useState<'CONFIRMED' | 'DISPUTED'>('CONFIRMED');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState<boolean>(false);
  const isOwnerOrAdmin = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!linkedShiftId || !isStoreOwner) return;
    let active = true;
    setSelectedDetailShift(null);
    void posShiftApi.getShiftById(linkedShiftId).then((shift) => {
      if (active) setSelectedDetailShift(shift);
    }).catch(() => {
      if (active) setErrorMessage('Không thể mở ca bán hàng từ thông báo.');
    });
    return () => { active = false; };
  }, [linkedShiftId, isStoreOwner]);

  const closeShiftDetail = () => {
    setSelectedDetailShift(null);
    if (linkedShiftId) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete('shiftId');
        return next;
      }, { replace: true });
    }
  };

  // Chốt doanh thu bán lẻ cuối ngày của Chủ cửa hàng (tách riêng Đơn Chủ tự bán & Duyệt ca theo Ngày nghiệp vụ)
  const [ownerUnsettled, setOwnerUnsettled] = useState<OwnerUnsettledSummaryResponse | null>(null);
  const [isOwnerEodModalOpen, setIsOwnerEodModalOpen] = useState(Boolean(dailyClosing));
  const closeDailyClosing = () => {
    if (isSettlingOwnerEod) return;
    dailyClosing?.onClose();
    setIsOwnerEodModalOpen(false);
  };
  const [ownerEodNote, setOwnerEodNote] = useState('');
  const [isSettlingOwnerEod, setIsSettlingOwnerEod] = useState(false);
  const [eodBranchScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [eodBusinessDate, setEodBusinessDate] = useState<string>(() => {
    const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
    return vnNow.toISOString().slice(0, 10);
  });
  const [businessDayPreview, setBusinessDayPreview] = useState<BusinessDayClosingPreview | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [isLoadingBusinessDayPreview, setIsLoadingBusinessDayPreview] = useState(false);
  const [businessDayPreviewError, setBusinessDayPreviewError] = useState<string | null>(null);
  const [businessDayFundCounts, setBusinessDayFundCounts] = useState<Record<string, string>>({});
  const [businessDayHistory, setBusinessDayHistory] = useState<BusinessDayClosingVersion[]>([]);

  const repairLegacyUtf8 = (value?: string | null) => {
    if (!value || !/[ÃÂÄÅÆáºá»]/.test(value)) return value || '';
    const windows1252: Record<number, number> = {
      0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
      0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
      0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
      0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
      0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
      0x017e: 0x9e, 0x0178: 0x9f,
    };
    try {
      const bytes = Uint8Array.from(Array.from(value), (character) => {
        const code = character.charCodeAt(0);
        return windows1252[code] ?? code;
      });
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return value;
    }
  };


  // Modal Buộc đóng ca (Force Close) cho Chủ cửa hàng khi nhân viên quên chốt ca
  const [forceCloseTargetShift, setForceCloseTargetShift] = useState<ShiftDetailResponse | null>(null);
  const [forceActualCash, setForceActualCash] = useState<number>(0);
  const [forceRetainedFloat, setForceRetainedFloat] = useState<number>(0);
  const [forceReason, setForceReason] = useState<string>('');
  const [isSubmittingForceClose, setIsSubmittingForceClose] = useState<boolean>(false);

  // Tải danh sách chi nhánh thực tế từ CSDL & Đồng bộ với TopNav
  useEffect(() => {
    if (!isOwnerEodModalOpen || eodBranchScope !== 'CURRENT' || !selectedBranchId || selectedBranchId === 'ALL') return;
    let cancelled = false;
    posShiftApi.getCurrentBusinessDate(selectedBranchId)
      .then((result) => {
        if (!cancelled) setEodBusinessDate(result.businessDate);
      })
      .catch(() => {
        // Keep the selected date so historical closing remains available when current-date lookup fails.
      });
    return () => { cancelled = true; };
  }, [isOwnerEodModalOpen, eodBranchScope, selectedBranchId]);

  useEffect(() => {
    if (dailyClosing) return;
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
            if (b?.id === 'ALL' && isOwnerOrAdmin) {
              initialId = 'ALL';
            } else if (b?.id) {
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
        setSelectedBranchName(list.find((branch) => branch.id === initialId)?.name || 'Chi nhánh đang chọn');
        setSearchParams({ branchId: initialId });
      }
    });

    // Lắng nghe sự kiện đổi chi nhánh từ Taskbar TopNav
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const branch = customEvent.detail;
      if (branch?.id && (branch.id !== 'ALL' || isOwnerOrAdmin)) {
        setSelectedBranchId(branch.id);
        setSelectedBranchName(branch.name || 'Chi nhánh đang chọn');
        setSearchParams({ branchId: branch.id });
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      isMounted = false;
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, [branchFromUrl, user?.branchId, isOwnerOrAdmin, dailyClosing?.branchId]);

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

      const res = selectedBranchId === 'ALL' && isOwnerOrAdmin
        ? (await Promise.all((await employeeApi.getBranches()).map((branch) => posShiftApi.getShiftHistory(branch.id, fromIso, toIso)))).flat()
        : await posShiftApi.getShiftHistory(selectedBranchId, fromIso, toIso);
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

  // Backend là nguồn xác định BusinessDate theo cutoff riêng của chi nhánh.
  // Chỉ fallback cho dữ liệu lịch sử cũ chưa có businessDate.
  const getBusinessDateStr = useCallback((isoString?: string | null): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    return vnTime.toISOString().slice(0, 10);
  }, []);
  const getShiftBusinessDate = useCallback(
    (shiftItem: ShiftDetailResponse): string => shiftItem.businessDate || getBusinessDateStr(shiftItem.openedAtUtc),
    [getBusinessDateStr]
  );

  useEffect(() => {
    setBusinessDayFundCounts({});
  }, [selectedBranchId, eodBusinessDate]);

  useEffect(() => {
    if (!isOwnerEodModalOpen || eodBranchScope !== 'CURRENT' || !selectedBranchId || selectedBranchId === 'ALL') {
      setBusinessDayPreview(null);
      return;
    }
    let cancelled = false;
    setIsLoadingBusinessDayPreview(true);
    setBusinessDayPreviewError(null);
    posShiftApi.previewBusinessDay(selectedBranchId, eodBusinessDate)
      .then((preview) => {
        if (!cancelled) {
          setBusinessDayPreview(preview);
          setBusinessDayFundCounts((current) => Object.fromEntries(
            preview.funds
              .filter((fund) => fund.requiresPhysicalCount)
              .map((fund) => [fund.fundId, current[fund.fundId] ?? ''])
          ));
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          setBusinessDayPreview(null);
          setBusinessDayPreviewError(error.response?.data?.detail || error.response?.data?.message || 'Không tải được số liệu tạm tính của ngày kinh doanh.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBusinessDayPreview(false);
      });
    return () => { cancelled = true; };
  }, [isOwnerEodModalOpen, eodBranchScope, selectedBranchId, eodBusinessDate, previewRevision]);

  useEffect(() => {
    if (!isOwnerEodModalOpen || eodBranchScope !== 'CURRENT' || !selectedBranchId || selectedBranchId === 'ALL') {
      setBusinessDayHistory([]);
      return;
    }
    let cancelled = false;
    posShiftApi.getBusinessDayHistory(selectedBranchId, eodBusinessDate)
      .then((items) => { if (!cancelled) setBusinessDayHistory(items); })
      .catch(() => { if (!cancelled) setBusinessDayHistory([]); });
    return () => { cancelled = true; };
  }, [isOwnerEodModalOpen, eodBranchScope, selectedBranchId, eodBusinessDate]);


  // Danh sách tất cả các ca của Nhân viên đã đóng nhưng đang chờ Chủ cửa hàng duyệt bàn giao (tiền đang lơ lửng chưa vào Két sắt)
  const pendingEmployeeShifts = useMemo(() => {
    return shifts.filter(
      (s) =>
        (s.status === 2 || s.status === 'Closed' || Boolean(s.closedAtUtc)) &&
        (s.handoverStatus === 1 || s.handoverStatus === 'PENDING' || !s.handoverStatus)
    );
  }, [shifts]);

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
      const d = getShiftBusinessDate(s);
      if (d) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [pendingEmployeeShifts, getShiftBusinessDate]);

  // Các ca thuộc BusinessDate do backend trả về.
  const shiftsForBusinessDate = useMemo(
    () => shifts.filter((s) => getShiftBusinessDate(s) === eodBusinessDate),
    [shifts, eodBusinessDate, getShiftBusinessDate]
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

  // Thao tác 1 (Độc lập 24/7): Kết toán đơn Chủ tự bán (ShiftId = null) tính đến thời điểm hiện tại (Không bị chặn bởi ca nhân viên đang mở)
  // Thao tác 2: Duyệt bàn giao & Khóa sổ các ca nhân viên đã đóng thuộc Ngày nghiệp vụ đang chọn
  const handleApproveBusinessDateShifts = async () => {
    const blockersOtherThanPendingHandover = businessDayPreview?.blockers.filter(
      (blocker) => blocker.code !== 'UNCONFIRMED_HANDOVER'
    ) ?? [];
    if (blockersOtherThanPendingHandover.length) {
      showToast(`Chưa thể khóa sổ: còn ${blockersOtherThanPendingHandover.length} việc cần xử lý.`, 'warning');
      return;
    }
    if (openShiftsForBusinessDate.length > 0) {
      showToast(`Chưa thể khóa sổ ngày ${eodBusinessDate}: còn ${openShiftsForBusinessDate.length} ca đang mở.`, 'warning');
      return;
    }
    if (pendingShiftsForBusinessDate.length === 0) {
      if (openShiftsForBusinessDate.length > 0) {
        showToast(
          `Ngày ${eodBusinessDate} hiện không có ca đã đóng nào chờ duyệt (còn ${openShiftsForBusinessDate.length} ca đang mở). Nếu nhân viên quên chốt ca, vui lòng bấm "Buộc đóng ca này"!`,
          'warning'
        );
      }
      if (!businessDayPreview) return;
    }

    const invalidFund = businessDayPreview?.funds
      .filter((fund) => fund.requiresPhysicalCount)
      .find((fund) => {
        const raw = businessDayFundCounts[fund.fundId];
        const value = Number(raw);
        return raw == null || raw.trim() === '' || !Number.isFinite(value) || value < 0 || value > 999_999_999_999;
      });
    if (pendingShiftsForBusinessDate.length === 0 && invalidFund) {
      showToast(`Vui lòng nhập số tiền thực đếm hợp lệ cho quỹ ${invalidFund.fundName}.`, 'warning');
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
        dailyClosing?.onChange();
      }

      // Xác nhận bàn giao là một thay đổi dữ liệu nguồn, vì vậy preview/token cũ
      // không còn hợp lệ. Tải lại để chủ cửa hàng kiểm tra trước khi khóa sổ.
      if (approvedShiftsCount > 0) {
        const refreshedPreview = await posShiftApi.previewBusinessDay(selectedBranchId, eodBusinessDate);
        setBusinessDayPreview(refreshedPreview);
        setBusinessDayFundCounts(Object.fromEntries(
          refreshedPreview.funds
            .filter((fund) => fund.requiresPhysicalCount)
            .map((fund) => [fund.fundId, ''])
        ));
        await fetchShiftHistory();
        showToast(`Đã xác nhận bàn giao ${approvedShiftsCount} ca. Vui lòng kiểm tra số liệu tạm tính rồi bấm Khóa sổ ngày.`, 'success');
        return;
      }
      const closing = await posShiftApi.closeBusinessDay({
        branchId: selectedBranchId,
        businessDate: eodBusinessDate,
        fundCounts: (businessDayPreview?.funds ?? [])
          .filter((fund) => fund.requiresPhysicalCount)
          .map((fund) => ({ fundId: fund.fundId, actualCashCounted: Number(businessDayFundCounts[fund.fundId]) })),
        previewToken: businessDayPreview?.previewToken ?? '',
        note: ownerEodNote.trim() || undefined,
      });
      dailyClosing?.onChange();
      showToast(
        `Đã duyệt ${approvedShiftsCount} ca và khóa sổ ngày ${eodBusinessDate}. Mã chốt ngày: ${closing.referenceCode}.`,
        'success'
      );
      setBusinessDayHistory(await posShiftApi.getBusinessDayHistory(selectedBranchId, eodBusinessDate));
      await fetchShiftHistory();
    } catch (err: any) {
      const errorCode = err?.response?.data?.errorCode || err?.response?.data?.code;
      if (errorCode === 'STALE_PREVIEW' && selectedBranchId && selectedBranchId !== 'ALL') {
        try {
          const refreshedPreview = await posShiftApi.previewBusinessDay(selectedBranchId, eodBusinessDate);
          setBusinessDayPreview(refreshedPreview);
          setBusinessDayFundCounts((current) => Object.fromEntries(
            refreshedPreview.funds
              .filter((fund) => fund.requiresPhysicalCount)
              .map((fund) => [fund.fundId, current[fund.fundId] ?? ''])
          ));
          showToast('Số liệu hệ thống đã thay đổi. Bản nháp kiểm đếm được giữ lại; vui lòng kiểm tra và xác nhận lại.', 'warning');
          return;
        } catch {
          // Fall through to the original server error when refresh also fails.
        }
      }
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt khóa sổ ca trong ngày.', 'error');
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
      showToast(
        `Đã xác nhận bàn giao ${approvedShiftsCount} ca. Các khoản chưa ghi sổ sẽ được ghi nhận khi khóa sổ ngày.`,
        'success'
      );
      await fetchShiftHistory();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt tất cả các ca chờ bàn giao.', 'error');
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
      showToast('Vui lòng nhập lý do buộc đóng ca (VD: Nhân viên quên bấm chốt ca khi hết giờ).', 'warning');
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
      if (dailyClosing) {
        setBusinessDayPreview(null);
        setPreviewRevision((revision) => revision + 1);
        dailyClosing.onChange();
      }
      showToast(`Đã buộc đóng ca #${forceCloseTargetShift.shiftCode}. Các khoản chưa ghi sổ sẽ được ghi nhận khi khóa sổ ngày.`, 'success');
      setForceCloseTargetShift(null);
      setForceReason('');
      await fetchShiftHistory();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi buộc đóng ca.', 'error');
    } finally {
      setIsSubmittingForceClose(false);
    }
  };

  // Lọc danh sách ca theo ô tìm kiếm (Mã ca & Thu ngân tách riêng) và trạng thái
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchCode = (s.shiftCode || '').toLowerCase().includes(q);
        const matchNote = (s.notes || '').toLowerCase().includes(q);
        if (!matchCode && !matchNote) return false;
      }
      if (cashierSearch.trim()) {
        const cq = cashierSearch.trim().toLowerCase();
        const matchCashier = s.participants?.some(
          (p) => (p.fullName || p.userName || '').toLowerCase().includes(cq)
        );
        if (!matchCashier) return false;
      }
      if (statusFilter !== 'ALL') {
        const statusStr = String(s.status || '').toUpperCase();
        const handoverStr = String(s.handoverStatus || '').toUpperCase();
        if (statusFilter === 'OPEN' && statusStr !== '1' && statusStr !== 'OPEN') return false;
        if (statusFilter === 'CLOSING' && statusStr !== '3' && statusStr !== 'CLOSING') return false;
        if (statusFilter === 'CLOSED' && statusStr !== '2' && statusStr !== 'CLOSED') return false;
        if (statusFilter === 'CONFIRMED' && handoverStr !== '2' && handoverStr !== 'CONFIRMED') return false;
        if (statusFilter === 'DISPUTED' && handoverStr !== '3' && handoverStr !== 'DISPUTED') return false;
      }
      return true;
    });
  }, [shifts, searchTerm, cashierSearch, statusFilter]);

  const { sort, handleSort, sortedItems: sortedShifts } = useTableSort(filteredShifts, {
    shiftCode: (s) => s.shiftCode || '',
    openedAtUtc: (s) => s.openedAtUtc || '',
    closedAtUtc: (s) => s.closedAtUtc || '',
    cashier: (s) => s.participants?.[0]?.fullName || s.participants?.[0]?.userName || '',
    openingFloat: (s) => s.openingFloat ?? 0,
    expectedCash: (s) => s.expectedCash ?? 0,
    actualCashCounted: (s) => s.actualCashCounted ?? -1,
    discrepancy: (s) => s.discrepancy ?? 0,
    handoverStatus: (s) => String(s.handoverStatus || ''),
  });

  // Dữ liệu phân trang
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedShifts.slice(start, start + pageSize);
  }, [sortedShifts, currentPage, pageSize]);

  // Xử lý gửi xác nhận bàn giao
  const handleConfirmHandoverSubmit = async () => {
    if (!handoverShift) return;
    if (handoverDecision === 'DISPUTED' && !disputeReason.trim()) {
      showToast('Vui lòng nhập lý do khiếu nại bàn giao lệch tiền.', 'warning');
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const request: ConfirmHandoverRequest = {
        status: handoverDecision === 'CONFIRMED' ? 2 : 3,
        disputeReason: handoverDecision === 'DISPUTED' ? disputeReason.trim() : null,
      };

      await posShiftApi.confirmHandover(handoverShift.id, request);
      showToast(
        handoverDecision === 'CONFIRMED'
          ? 'Đã xác nhận nhận bàn giao ca thành công!'
          : 'Đã gửi khiếu nại bàn giao ca thành công!',
        'success'
      );
      setHandoverShift(null);
      setDisputeReason('');
      await fetchShiftHistory();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Lỗi khi gửi xác nhận bàn giao ca.', 'error');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const formatVND = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '---';
    const trimmed = isoString.trim();
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const d = new Date(hasTz ? trimmed : `${trimmed}Z`);
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
    <div
      className="so-list-page pos-shift-page"
      style={dailyClosing ? { display: 'contents' } : {
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {!dailyClosing && <>
        {/* ─── 1. HEADER CHUẨN SO-LIST-HEADER (ĐỒNG BỘ STORE PRODUCT) ─── */}
        <div className="so-list-header" style={{ flexShrink: 0, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => navigate(returnPath)}
              title="Quay lại giao diện trước"
            >
              <ArrowLeft size={14} />
              <span>{isStoreOwner ? 'Lịch Làm Việc' : 'Bán Hàng'}</span>
            </button>

            <h1 className="so-list-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={20} color="var(--blue-primary, #0f766e)" />
              <span>Lịch Sử Chốt Ca &amp; Bàn Giao Quầy</span>
              {isLoading && <RefreshCw size={14} className="spin text-teal-700" />}
            </h1>
          </div>

          <div className="so-list-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={fetchShiftHistory}
              disabled={isLoading}
              className="po-btn po-btn-secondary"
              title="Tải lại dữ liệu lịch sử ca"
            >
              <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* ─── 2. THANH BỘ LỌC CHUẨN SO-LIST-FILTER (TÁCH MÃ CA & THU NGÂN) ─── */}
        <div className="so-list-filter" style={{ flexShrink: 0, marginBottom: 12 }}>
          <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap' }}>
            {/* 1a. Ô Tìm kiếm Mã ca */}
            <div className="so-list-filter-field" style={{ flex: '0 1 185px', minWidth: 165 }}>
              <label className="so-list-filter-label">Mã ca:</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nhập mã ca..."
                  className="so-list-filter-input"
                  style={{ width: '100%', paddingRight: searchTerm ? 26 : 10 }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}
                    title="Xóa mã ca"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* 1b. Ô Tìm kiếm Thu ngân */}
            <div className="so-list-filter-field" style={{ flex: '1 1 200px', minWidth: 185 }}>
              <label className="so-list-filter-label">Thu ngân:</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={cashierSearch}
                  onChange={(e) => {
                    setCashierSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nhập tên thu ngân..."
                  className="so-list-filter-input"
                  style={{ width: '100%', paddingLeft: 28, paddingRight: cashierSearch ? 26 : 10 }}
                />
                <Search
                  size={14}
                  style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                {cashierSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCashierSearch('');
                      setCurrentPage(1);
                    }}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}
                    title="Xóa tìm thu ngân"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Lọc Khoảng thời gian */}
            <div className="so-list-filter-field">
              <label className="so-list-filter-label">Thời gian:</label>
              <select
                value={timePreset}
                onChange={(e) => {
                  setTimePreset(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={`so-list-filter-select ${timePreset !== '7days' ? 'so-list-filter-select--active' : ''}`}
              >
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="all">Tất cả thời gian</option>
              </select>
            </div>

            {/* 3. Lọc Trạng thái ca / Bàn giao */}
            <div className="so-list-filter-field">
              <label className="so-list-filter-label">Trạng thái:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`so-list-filter-select ${statusFilter !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="OPEN">Đang mở (bán hàng)</option>
                <option value="CLOSED">Đã chốt ca</option>
                <option value="CONFIRMED">Đã duyệt bàn giao</option>
                <option value="DISPUTED">Có chênh lệch / Khiếu nại</option>
              </select>
            </div>

            {/* Nút Thao tác Filter */}
            <div className="so-list-filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={fetchShiftHistory}
                className="so-list-filter-search"
                title="Tìm kiếm"
              >
                <Search size={13} />
                <span>Tìm kiếm</span>
              </button>
              <button
                type="button"
                disabled={!searchTerm && !cashierSearch && timePreset === '7days' && statusFilter === 'ALL'}
                onClick={() => {
                  setSearchTerm('');
                  setCashierSearch('');
                  setTimePreset('7days');
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className="so-list-filter-reset"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
              <button
                type="button"
                onClick={fetchShiftHistory}
                className="so-list-filter-reset"
                title="Tải lại dữ liệu"
              >
                <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
                <span>Làm mới</span>
              </button>
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
        <div className="so-list-table-card so-list-table-card--wrap" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', flexShrink: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} className="text-teal-700" />
              <span>Danh Sách Các Phiên Ca Bán Hàng ({filteredShifts.length})</span>
            </h3>
          </div>

          <div className="table-responsive" style={{ width: '100%', flex: '1 1 auto', minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
            <table className="so-list-table" style={{ minWidth: 1320, width: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 175 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 115 }} />
                <col style={{ width: 115 }} />
                <col style={{ width: 115 }} />
                <col style={{ width: 135 }} />
                <col style={{ width: 160 }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ width: 110, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box' }}>
                    <SortableHeader label="Mã ca" active={sort.key === 'shiftCode'} direction={sort.direction} onClick={() => handleSort('shiftCode')} />
                  </th>
                  <th style={{ width: 130, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box' }}>
                    <SortableHeader label="Giờ mở ca" active={sort.key === 'openedAtUtc'} direction={sort.direction} onClick={() => handleSort('openedAtUtc')} />
                  </th>
                  <th style={{ width: 140, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box' }}>
                    <SortableHeader label="Giờ đóng ca" active={sort.key === 'closedAtUtc'} direction={sort.direction} onClick={() => handleSort('closedAtUtc')} />
                  </th>
                  <th style={{ width: 175, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box' }}>
                    <SortableHeader label="Thu ngân" active={sort.key === 'cashier'} direction={sort.direction} onClick={() => handleSort('cashier')} />
                  </th>
                  <th style={{ width: 110, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'right' }}>
                    <SortableHeader label="Tiền đầu ca" align="right" active={sort.key === 'openingFloat'} direction={sort.direction} onClick={() => handleSort('openingFloat')} />
                  </th>
                  <th style={{ width: 115, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'right' }}>
                    <SortableHeader label="Tiền lý thuyết" align="right" active={sort.key === 'expectedCash'} direction={sort.direction} onClick={() => handleSort('expectedCash')} />
                  </th>
                  <th style={{ width: 115, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'right' }}>
                    <SortableHeader label="Thực đếm" align="right" active={sort.key === 'actualCashCounted'} direction={sort.direction} onClick={() => handleSort('actualCashCounted')} />
                  </th>
                  <th style={{ width: 115, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'right' }}>
                    <SortableHeader label="Chênh lệch" align="right" active={sort.key === 'discrepancy'} direction={sort.direction} onClick={() => handleSort('discrepancy')} />
                  </th>
                  <th style={{ width: 135, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'center' }}>
                    <SortableHeader label="Xác nhận kết ca" align="center" active={sort.key === 'handoverStatus'} direction={sort.direction} onClick={() => handleSort('handoverStatus')} />
                  </th>
                  <th style={{ width: 160, position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid #cbd5e1', userSelect: 'none', boxSizing: 'border-box', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="spin text-teal-700" style={{ margin: '0 auto 8px' }} />
                      <div>Đang tải lịch sử ca làm việc từ hệ thống...</div>
                    </td>
                  </tr>
                ) : paginatedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
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
                      ? uniqueParticipants.map((p) => repairLegacyUtf8(p.fullName || p.userName)).join(', ')
                      : 'Thu ngân quầy';

                    const earlyLateMatch = s.notes?.match(/\[GIẢI TRÌNH GIỜ CHỐT CA:\s*([^\]]+)\]/i);
                    const earlyLateText = earlyLateMatch ? earlyLateMatch[1].trim() : null;
                    const isEarlyClose = earlyLateText?.toUpperCase().includes('SỚM');
                    const isLateClose = earlyLateText?.toUpperCase().includes('MUỘN');

                    return (
                      <tr
                        key={s.id}
                        className="so-list-row"
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: '#ffffff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <td className="so-list-td" style={{ overflow: 'hidden' }}>
                          <span className="so-list-code font-mono font-bold">{s.shiftCode}</span>
                        </td>
                        <td className="so-list-td" style={{ color: '#334155', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatDate(s.openedAtUtc)}
                        </td>
                        <td className="so-list-td" style={{ color: '#334155', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                            {s.closedAtUtc ? formatDate(s.closedAtUtc) : <span style={{ color: '#10B981', fontWeight: 600, fontFamily: 'inherit' }}>Đang mở</span>}
                          </div>
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
                                maxWidth: 130,
                              }}
                              title={`Giải trình giờ chốt ca: ${earlyLateText}`}
                            >
                              <span>{isEarlyClose ? '⚠️ Chốt sớm' : isLateClose ? '⏰ Chốt muộn' : '⏱ Giải trình'}</span>
                            </div>
                          )}
                        </td>
                        <td className="so-list-td" style={{ color: '#1E293B', overflow: 'hidden' }}>
                          {uniqueParticipants.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }} title={cashierDisplay}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  fontSize: 12.5,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                }}
                                title={repairLegacyUtf8(uniqueParticipants[0].fullName || uniqueParticipants[0].userName)}
                              >
                                {repairLegacyUtf8(uniqueParticipants[0].fullName || uniqueParticipants[0].userName)}
                              </span>
                              {uniqueParticipants.length > 1 && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#0F766E',
                                    backgroundColor: '#F0FDFA',
                                    border: '1px solid #CCFBF1',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                    width: 'fit-content',
                                  }}
                                  title={`Danh sách nhân viên cùng trực: ${cashierDisplay}`}
                                >
                                  +{uniqueParticipants.length - 1} nhân viên khác
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#64748B', fontStyle: 'italic' }}>Thu ngân quầy</span>
                          )}
                        </td>
                        <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569', overflow: 'hidden' }}>
                          {formatVND(s.openingFloat)}
                        </td>
                        <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0F766E', fontWeight: 600, overflow: 'hidden' }}>
                          {formatVND(s.expectedCash)}
                        </td>
                        <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0F172A', overflow: 'hidden' }}>
                          {s.actualCashCounted !== null && s.actualCashCounted !== undefined ? formatVND(s.actualCashCounted) : '---'}
                        </td>
                        <td className="so-list-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, overflow: 'hidden' }}>
                          {s.actualCashCounted === null || s.actualCashCounted === undefined || s.status === 'Open' || s.status === 1 ? (
                            <span style={{ color: '#94A3B8', fontWeight: 500 }}>---</span>
                          ) : diff === 0 ? (
                            <span style={{ color: '#059669' }}>Khớp (0 đ)</span>
                          ) : diff > 0 ? (
                            <span style={{ color: '#059669' }}>+{formatVND(diff)}</span>
                          ) : (
                            <span style={{ color: '#DC2626' }}>{formatVND(diff)}</span>
                          )}
                        </td>
                        <td className="so-list-td" style={{ textAlign: 'center', overflow: 'hidden' }}>
                          {s.status === 'Open' || s.status === 1 ? (
                            <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 600 }}>Đang hoạt động</span>
                          ) : s.status === 'Closing' || s.status === 3 ? (
                            <span style={{ color: '#B45309', fontSize: 12, fontWeight: 600 }}>Đang kiểm đếm</span>
                          ) : (
                            getHandoverBadge(s.handoverStatus)
                          )}
                        </td>
                        <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center', overflow: 'hidden' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => setSelectedDetailShift(s)}
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
                                  height: 28,
                                  padding: '0 8px',
                                  borderRadius: 6,
                                  border: '1px solid #DC2626',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
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
                                  height: 28,
                                  padding: '0 8px',
                                  borderRadius: 6,
                                  border: '1px solid #059669',
                                  backgroundColor: '#ECFDF5',
                                  color: '#047857',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Chủ cửa hàng duyệt bàn giao & cộng tiền nộp két vào Sổ quỹ"
                              >
                                <UserCheck size={13} />
                                <span>Duyệt</span>
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

          {/* ── Footer Phân trang chuẩn theo StoreProductTable ── */}
          {filteredShifts.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredShifts.length}
              itemLabel="ca làm việc"
              pageSizeOptions={[15, 24, 36, 48]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

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
                    <span style={{ color: '#64748B' }}>Tiền mặt đầu ca:</span>
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
                    <span style={{ color: '#1E40AF' }}>Doanh thu chuyển khoản trong ca:</span>
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
                  {handoverShift.discrepancyReason && (
                    <div style={{ marginTop: 4, padding: '6px 8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, color: '#991B1B' }}>
                      <b>Lý do giải trình chênh lệch:</b> {handoverShift.discrepancyReason}
                    </div>
                  )}
                  {handoverShift.notes && (
                    <div style={{ marginTop: 4, padding: '6px 8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
                      <b>Ghi chú bàn giao / chốt ca:</b> {handoverShift.notes}
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
            onClick={closeShiftDetail}
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
                  onClick={closeShiftDetail}
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

                {/* Bảng chỉ số đối soát tiền két */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={16} color="#0F766E" /> Báo Cáo Kết Toán Tiền Két:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Vốn đầu ca:</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{formatVND(selectedDetailShift.openingFloat)}</div>
                    </div>
                    <div style={{ background: '#F0FDF4', padding: '8px 12px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: 11.5, color: '#166534' }}>Doanh thu tiền mặt (+):</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                        +{formatVND(
                          selectedDetailShift.totalCashSales !== undefined && selectedDetailShift.totalCashSales !== null
                            ? selectedDetailShift.totalCashSales
                            : Math.max(
                              0,
                              selectedDetailShift.expectedCash -
                              selectedDetailShift.openingFloat -
                              selectedDetailShift.totalCashIn +
                              selectedDetailShift.totalCashOut
                            )
                        )}
                      </div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Doanh thu chuyển khoản:</div>
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
                  {selectedDetailShift.discrepancyReason && (
                    <div style={{ fontSize: 12.5, color: '#991B1B', marginTop: 6 }}>
                      <b>Lý do giải trình chênh lệch:</b>
                      <div style={{ marginTop: 2, padding: '6px 10px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #FECACA', fontWeight: 600 }}>
                        {selectedDetailShift.discrepancyReason}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: '#334155', marginTop: 6 }}>
                    <b>Ghi chú bàn giao / Ghi chú ca:</b>
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
                            <th style={{ padding: '6px 10px' }}>Trạng thái</th>
                            <th style={{ padding: '6px 10px' }}>Lý do</th>
                            <th style={{ padding: '6px 10px' }}>Người lập</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDetailShift.cashMovements.map((m) => {
                            const isRejected = m.status === 3 || m.status === 'Rejected';
                            const isCancelled = m.status === 4 || m.status === 'Cancelled';
                            const isPending = m.status === 2 || m.status === 'PendingApproval';
                            const statusBadge = isRejected
                              ? { text: 'Đã từ chối', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' }
                              : isCancelled
                                ? { text: 'Đã hủy', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' }
                                : isPending
                                  ? { text: 'Chờ duyệt', bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' }
                                  : { text: 'Đã ghi nhận', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' };
                            return (
                              <tr
                                key={m.id}
                                style={{
                                  borderBottom: '1px solid #F1F5F9',
                                  opacity: isRejected || isCancelled ? 0.65 : 1,
                                  backgroundColor: isRejected ? '#FFF5F5' : undefined,
                                }}
                              >
                                <td style={{ padding: '6px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>{formatDate(m.occurredAtUtc)}</td>
                                <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 600, color: m.movementType === 1 || m.movementType === 'IN' ? '#059669' : '#DC2626' }}>
                                    {m.movementType === 1 || m.movementType === 'IN' ? '[+] Thu' : '[-] Chi'}
                                  </span>
                                </td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, textDecoration: isRejected || isCancelled ? 'line-through' : 'none' }}>
                                  {formatVND(m.amount)}
                                </td>
                                <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 7px',
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      backgroundColor: statusBadge.bg,
                                      color: statusBadge.color,
                                      border: `1px solid ${statusBadge.border}`,
                                    }}
                                  >
                                    {statusBadge.text}
                                  </span>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  {m.reason}
                                  {isRejected && m.rejectionReason && (
                                    <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>
                                      Lý do từ chối: {m.rejectionReason}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '6px 10px', color: '#64748B' }}>{m.createdByName || 'Thu ngân'}</td>
                              </tr>
                            );
                          })}
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
                  onClick={closeShiftDetail}
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

      </>}
      {/* ─── 5. MODAL BÁO CÁO CUỐI NGÀY & KẾT TOÁN CHO CHỦ TIỆM (TÁCH ĐƠN CHỦ 24/7 & KHÓA SỔ CA THEO NGÀY NGHIỆP VỤ) ─── */}
      {isOwnerEodModalOpen && !forceCloseTargetShift && (
        <div
          className="pos-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeDailyClosing()}
        >
          <div className="pos-modal-dialog" role="dialog" aria-modal="true" aria-label="Chốt doanh thu ngày" style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', padding: 20, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Chốt doanh thu ngày
                </h3>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  Kiểm tra tiền, xử lý ca còn tồn và khóa số liệu của một ngày nghiệp vụ.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDailyClosing}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Khóa sổ luôn thực hiện theo một chi nhánh cụ thể. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Chi nhánh khóa sổ:
                  </div>
                  <div style={{ padding: '7px 10px', border: '1px solid #99F6E4', borderRadius: 6, background: '#F0FDFA', color: '#0F766E', fontWeight: 800 }}>
                    {dailyClosing?.branchName || selectedBranchName || 'Chi nhánh đang chọn'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Ngày nghiệp vụ:
                  </label>
                  <input
                    type="date"
                    className="pos-input"
                    value={eodBusinessDate}
                    onChange={(e) => setEodBusinessDate(e.target.value)}
                    style={{ width: '100%', height: 34, fontSize: 13, padding: '0 8px' }}
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
              <details style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#0F172A' }}>
                  Đơn Chủ tự bán: {ownerUnsettled?.unsettledOrdersCount || 0} đơn · {formatVND(ownerUnsettled?.totalRevenue || 0)}
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#0F172A' }}>
                      Chi tiết đơn Chủ cửa hàng tự bán
                    </span>
                    <strong style={{ color: '#0F766E' }}>{ownerUnsettled?.unsettledOrdersCount || 0} đơn chưa kết toán</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>
                    Các đơn này được cộng đúng một lần khi Chủ cửa hàng khóa sổ ngày nghiệp vụ; không tạo phiếu thu riêng trước đó.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 2 }}>
                    <span style={{ color: '#065F46' }}>Tiền mặt Chủ tự bán:</span>
                    <strong style={{ color: '#059669' }}>+{formatVND(ownerUnsettled?.cashRevenue || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#1E40AF' }}>Doanh thu chuyển khoản Chủ tự bán:</span>
                    <strong style={{ color: '#2563EB' }}>+{formatVND(ownerUnsettled?.bankRevenue || 0)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      Tổng đơn Chủ chờ kết toán: <b style={{ color: '#0F766E' }}>{formatVND(ownerUnsettled?.totalRevenue || 0)}</b>
                    </span>
                    <span style={{ color: '#64748B', fontSize: 11.5 }}>Sẽ kết toán khi khóa sổ ngày</span>
                  </div>
                </div>
              </details>

              {isLoadingBusinessDayPreview && (
                <div role="status" style={{ padding: 12, borderRadius: 8, background: '#F8FAFC', color: '#475569' }}>
                  Đang tải số liệu tạm tính từ hệ thống...
                </div>
              )}
              {businessDayPreviewError && (
                <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  {businessDayPreviewError}
                </div>
              )}
              {businessDayPreview && (
                <div style={{ backgroundColor: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 10, padding: 14, display: 'grid', gap: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 800, color: '#0F766E', fontSize: 14 }}>Tổng quan trong ngày</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                    {[
                      ['Tiền mặt', businessDayPreview.totalCashSales, '#065F46'],
                      ['Chuyển khoản', businessDayPreview.totalBankSales, '#1D4ED8'],
                      ['Thu khác', businessDayPreview.totalCashIn, '#475569'],
                      ['Chi từ ca', businessDayPreview.totalCashOut, '#B45309'],
                    ].map(([label, amount, color]) => (
                      <div key={String(label)} style={{ background: '#FFFFFF', border: '1px solid #CCFBF1', borderRadius: 8, padding: '9px 10px' }}>
                        <div style={{ color: '#64748B', marginBottom: 4 }}>{label}</div>
                        <b style={{ color: String(color), fontSize: 14 }}>{formatVND(Number(amount))}</b>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#64748B' }}>
                    Hoàn từ két quầy: <b>{formatVND(businessDayPreview.shiftReturnRefunds ?? 0)}</b>
                    {' · '}Hoàn từ két sắt: <b>{formatVND(businessDayPreview.safeReturnRefunds ?? 0)}</b>
                  </div>
                  <div style={{ borderTop: '1px dashed #5EEAD4', paddingTop: 8 }}>
                    <div style={{ fontWeight: 800, marginBottom: 7, color: '#0F172A' }}>Tiền thực đếm</div>
                    {businessDayPreview.funds.length === 0
                      ? <span style={{ color: '#64748B' }}>Chưa có quỹ hoạt động tại chi nhánh.</span>
                      : businessDayPreview.funds.map((fund) => (
                        <div key={fund.fundId} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) auto minmax(150px, 190px)', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                          <span>{fund.fundName}</span>
                          <span>Dự kiến: <b>{formatVND(fund.expectedCash)}</b></span>
                          {fund.requiresPhysicalCount ? (
                            <label style={{ display: 'grid', gap: 3, fontSize: 11.5 }}>
                              Số tiền thực tế (VNĐ)
                              <input
                                aria-label={`Tiền thực đếm quỹ ${fund.fundName}`}
                                type="number"
                                min="0"
                                step="any"
                                value={businessDayFundCounts[fund.fundId] ?? ''}
                                onChange={(event) => setBusinessDayFundCounts((current) => ({ ...current, [fund.fundId]: event.target.value }))}
                                style={{ padding: '7px 9px', border: '1px solid #94A3B8', borderRadius: 6 }}
                              />
                            </label>
                          ) : <span style={{ color: '#64748B' }}>Không cần kiểm đếm</span>}
                        </div>
                      ))}
                  </div>
                  {businessDayPreview.blockers.length > 0 && (
                    <div role="alert" style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontWeight: 800, color: '#9A3412', marginBottom: 6 }}>Việc cần xử lý trước khi khóa sổ</div>
                      {businessDayPreview.blockers.map((blocker) => (
                        <div key={`${blocker.code}-${blocker.entityId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0' }}>
                          <span>{blocker.displayName} — {blocker.status}{blocker.amount != null ? ` — ${formatVND(blocker.amount)}` : ''}</span>
                          {blocker.actionPath && <button type="button" onClick={() => navigate(blocker.actionPath!)} style={{ border: 0, background: 'none', color: '#C2410C', fontWeight: 700, cursor: 'pointer' }}>Xem/Xử lý</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MỤC 2: BÁO CÁO & KHÓA SỔ CÁC CA NHÂN VIÊN THUỘC NGÀY NGHIỆP VỤ ĐANG CHỌN */}
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#92400E' }}>
                    Tình trạng ca bán hàng ({eodBusinessDate})
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
                  <span style={{ color: '#78350F' }}>Doanh thu chuyển khoản các ca trong ngày:</span>
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
                      ? `Có ${pendingShiftsForBusinessDate.length} ca đã đóng chờ xác nhận bàn giao ngày ${eodBusinessDate}.`
                      : openShiftsForBusinessDate.length > 0
                        ? 'Các ca đã đóng của ngày này đã duyệt xong; còn ca đang hoạt động ở trên.'
                        : 'Tất cả các ca đã đóng trong ngày nghiệp vụ này đều đã được duyệt.'}
                  </span>
                  {(() => {
                    const isCurrentDayClosed = businessDayHistory.some(
                      (h) => String(h.status || '').toUpperCase() === 'CLOSED'
                    );
                    const isButtonDisabled =
                      isSettlingOwnerEod ||
                      isLoadingBusinessDayPreview ||
                      !businessDayPreview ||
                      (isCurrentDayClosed && pendingShiftsForBusinessDate.length === 0);
                    return (
                      <button
                        type="button"
                        disabled={isButtonDisabled}
                        title={
                          isCurrentDayClosed && pendingShiftsForBusinessDate.length === 0
                            ? 'Ngày nghiệp vụ này đã được khóa sổ'
                            : businessDayPreview?.blockers.length
                              ? 'Bấm để xem lý do chưa thể khóa sổ'
                              : 'Khóa sổ ngày nghiệp vụ'
                        }
                        onClick={handleApproveBusinessDateShifts}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: isButtonDisabled ? '#94A3B8' : '#D97706',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSettlingOwnerEod
                          ? 'Đang duyệt...'
                          : isCurrentDayClosed && pendingShiftsForBusinessDate.length === 0
                            ? 'Đã khóa sổ ngày'
                            : pendingShiftsForBusinessDate.length > 0
                              ? `Xác nhận bàn giao (${pendingShiftsForBusinessDate.length} ca)`
                              : 'Khóa sổ ngày'}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {businessDayHistory.length > 0 && (
                <details style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: 12, fontSize: 13 }}>
                  <summary style={{ color: '#334155', fontWeight: 800, cursor: 'pointer' }}>Lịch sử khóa sổ ({businessDayHistory.length} phiên bản)</summary>
                  {businessDayHistory.map((closing) => (
                    <div key={closing.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #E2E8F0', fontSize: 13 }}>
                      <span><b>Phiên bản {closing.version}</b> — {closing.referenceCode} — {closing.status}{closing.reopenReason ? ` — Lý do mở lại: ${closing.reopenReason}` : ''}</span>
                    </div>
                  ))}
                </details>
              )}

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
                  onClick={closeDailyClosing}
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
                  Buộc Đóng Ca #{forceCloseTargetShift.shiftCode}
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
                  <span style={{ color: '#64748B' }}>Tiền mặt đầu ca:</span>
                  <b>{formatVND(forceCloseTargetShift.openingFloat || 0)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tiền mặt lý thuyết trong két:</span>
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
                  1. Tiền mặt thực tế kiểm đếm trong két:
                </label>
                <input
                  type="number"
                  min={0}
                  className="pos-input"
                  value={forceActualCash}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!Number.isSafeInteger(val) || val < 0 || val > 999_999_999_999) return;
                    setForceActualCash(val);
                    if (forceRetainedFloat > val) setForceRetainedFloat(val);
                  }}
                  style={{ width: '100%', height: 38, fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    2. Để lại két cho ca sau:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={forceActualCash}
                    className="pos-input"
                    value={forceRetainedFloat}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isSafeInteger(val) || val < 0 || val > forceActualCash) return;
                      setForceRetainedFloat(val);
                    }}
                    style={{ width: '100%', height: 36, fontSize: 13, fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    3. Rút nộp về két sắt:
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
                  4. Lý do buộc đóng ca (*):
                </label>
                <input
                  type="text"
                  className="pos-input"
                  value={forceReason}
                  maxLength={470}
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
                  disabled={isSubmittingForceClose || !forceReason.trim() || !Number.isSafeInteger(forceActualCash) || !Number.isSafeInteger(forceRetainedFloat) || forceRetainedFloat > forceActualCash}
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

      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(null);
          }}
        />
      )}
    </div>
  );
};
