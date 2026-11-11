import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Save,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Clock,
  User,
  Check,
  X,
  Sliders,
  AlertTriangle,
  Info,
  History,
  TrendingUp,
  Banknote,
  AlertCircle,
  Eye,
  BarChart3,
  Scale,
  FileText,
  UserCheck,
  Building2,
  Printer,
} from 'lucide-react';
import { posShiftApi } from '../../pos/api/posShiftApi';
import type {
  ShiftCashMovementDto,
  ShiftDetailResponse,
  ConfirmHandoverRequest,
  ZReportResponse,
} from '../../pos/types/posShift.types';
import { employeeApi } from '../../employee/api/employeeApi';
import type { Branch } from '../../employee/types';
import { TablePagination } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../../pos/pos.css';

/**
 * Format currency amount to Vietnamese Dong string.
 * @param amount - The numeric amount to format.
 * @returns Formatted currency string with 'đ'.
 */
const formatVND = (amount: number): string => {
  return `${amount.toLocaleString('vi-VN')} đ`;
};

/**
 * Format ISO datetime string to localized Vietnamese format.
 * @param isoString - ISO string of datetime.
 * @returns Formatted datetime string.
 */
const formatDate = (isoString?: string): string => {
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

/**
 * Deduplicate shift participants by user identifier or name.
 * @param participants - List of raw shift participants.
 * @returns Deduplicated list of participants.
 */
const dedupeParticipants = (participants?: any[]): any[] => {
  if (!participants || participants.length === 0) return [];
  const seen = new Set<string>();
  return participants.filter((p) => {
    const key = (p.userId || p.fullName || p.userName || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * CashControlHubPage - Unified management page for POS cash control, approval, shift history, and limits.
 */
export const CashControlHubPage: FC = () => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_an_nhien_02';
  const isOwnerOrAdmin = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  // Navigation search parameters for tab selection
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') as 'pending' | 'history' | 'limits' | null;
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'limits'>(
    currentTabParam && ['pending', 'history', 'limits'].includes(currentTabParam)
      ? currentTabParam
      : 'pending'
  );

  // Synchronize tab state with search params
  const handleTabChange = (tab: 'pending' | 'history' | 'limits') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // Branch data & filter
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Tab 1 (Pending) data state
  const [pendingMovements, setPendingMovements] = useState<ShiftCashMovementDto[]>([]);
  const [unconfirmedDrops, setUnconfirmedDrops] = useState<ShiftCashMovementDto[]>([]);
  const [resolvedMovements, setResolvedMovements] = useState<ShiftCashMovementDto[]>([]);
  const [pendingFilter, setPendingFilter] = useState<'ALL' | 'DROPS' | 'EXPENSES'>('ALL');
  const [isPendingLoading, setIsPendingLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Rejection modal state for cash movement
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Tab 2 (History) data state
  const [timePreset, setTimePreset] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [shifts, setShifts] = useState<ShiftDetailResponse[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals in Tab 2
  const [selectedDetailShift, setSelectedDetailShift] = useState<ShiftDetailResponse | null>(null);
  const [handoverShift, setHandoverShift] = useState<ShiftDetailResponse | null>(null);
  const [handoverDecision, setHandoverDecision] = useState<'CONFIRMED' | 'DISPUTED'>('CONFIRMED');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState<boolean>(false);

  // Z-Report thermal invoice modal state
  const [zReportShiftId, setZReportShiftId] = useState<string | null>(null);
  const [zReportData, setZReportData] = useState<ZReportResponse | null>(null);
  const [isLoadingZReport, setIsLoadingZReport] = useState<boolean>(false);
  const [zReportError, setZReportError] = useState<string | null>(null);

  // Tab 3 (Limits) settings state
  const [threshold, setThreshold] = useState<number>(200000);
  const [shiftTotalLimit, setShiftTotalLimit] = useState<number>(0);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  /**
   * Load branch list and synchronize active branch from local storage or TopNav.
   */
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((list) => {
      if (!isMounted) return;
      if (list && list.length > 0) {
        setBranches(list);

        let initialId = 'ALL';
        try {
          const stored = localStorage.getItem('mtgrms_active_branch');
          if (stored) {
            const b = JSON.parse(stored);
            if (b?.id) {
              initialId = b.id;
            }
          }
        } catch (e) {
          console.warn('Error reading stored branch:', e);
        }

        if (initialId === 'ALL' && user?.branchId) {
          const match = list.find((b) => b.id === user.branchId);
          if (match) initialId = match.id;
        }

        setSelectedBranchId(initialId);
      }
    });

    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const branch = customEvent.detail;
      if (branch?.id) {
        setSelectedBranchId(branch.id);
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      isMounted = false;
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, [user?.branchId]);

  /**
   * Fetch cash movement settings, pending items, and resolved history today for Tab 1.
   */
  const loadPendingData = useCallback(async () => {
    setIsPendingLoading(true);
    try {
      const cfg = await posShiftApi.getCashMovementSettings();
      if (cfg) {
        setThreshold(cfg.cashOutApprovalThreshold ?? 200000);
        setShiftTotalLimit(cfg.cashOutShiftTotalLimit ?? 0);
      }

      const branchParam = selectedBranchId === 'ALL' ? undefined : selectedBranchId;
      const summary = await posShiftApi.getPendingMovements(branchParam);
      if (summary?.movements) {
        const pendings = summary.movements.filter(
          (m) => m.status === 'PendingApproval' || m.status === 2
        );
        const drops = summary.movements.filter(
          (m) => (m.category === 'CASH_DRAW' || m.category === 2) && !m.isConfirmedByOwner
        );
        setPendingMovements(pendings);
        setUnconfirmedDrops(drops);
      } else {
        setPendingMovements([]);
        setUnconfirmedDrops([]);
      }

      // Tải lịch sử các phiếu thu/chi đã duyệt hoặc đã nhận đủ trong ngày hôm nay
      try {
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const targetBranch = branchParam || (branches[0]?.id || user?.branchId || '');
        if (targetBranch && !targetBranch.startsWith('BR-')) {
          const shiftsToday = await posShiftApi.getShiftHistory(targetBranch, startToday, endToday);
          if (shiftsToday && shiftsToday.length > 0) {
            const resolvedItems: ShiftCashMovementDto[] = [];
            for (const s of shiftsToday) {
              if (s.cashMovements && s.cashMovements.length > 0) {
                for (const m of s.cashMovements) {
                  const isApproved = m.status === 'Recorded' || m.status === 1;
                  const isRejected = m.status === 'Rejected' || m.status === 3;
                  const isDropConfirmed = (m.category === 'CASH_DRAW' || m.category === 2) && m.isConfirmedByOwner;
                  if (isApproved || isRejected || isDropConfirmed) {
                    resolvedItems.push({ ...m, shiftId: s.id });
                  }
                }
              }
            }
            setResolvedMovements((prev) => {
              const map = new Map<string, ShiftCashMovementDto>();
              resolvedItems.forEach((item) => map.set(item.id, item));
              prev.forEach((item) => map.set(item.id, item));
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.occurredAtUtc).getTime() - new Date(a.occurredAtUtc).getTime()
              );
            });
          }
        }
      } catch (errHistory) {
        console.warn('Lỗi lấy lịch sử ca để đồng bộ phiếu đã duyệt hôm nay:', errHistory);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu kiểm soát quỹ POS:', err);
    } finally {
      setIsPendingLoading(false);
    }
  }, [selectedBranchId, branches, user?.branchId]);

  /**
   * Fetch shift history for Tab 2.
   */
  const loadHistoryData = useCallback(async () => {
    if (!selectedBranchId || selectedBranchId === 'ALL') {
      const targetBranchId = branches[0]?.id || user?.branchId || '';
      if (!targetBranchId) return;
    }

    const branchToQuery = selectedBranchId === 'ALL'
      ? (branches[0]?.id || user?.branchId || '')
      : selectedBranchId;

    if (!branchToQuery || branchToQuery.startsWith('BR-')) return;

    setIsHistoryLoading(true);
    setHistoryError(null);
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

      const res = await posShiftApi.getShiftHistory(branchToQuery, fromIso, toIso);
      setShifts(res || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Lỗi tải lịch sử ca:', err);
      setHistoryError(err?.response?.data?.message || err?.message || 'Không thể tải lịch sử ca làm việc.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedBranchId, branches, user?.branchId, timePreset]);

  // Load appropriate data on branch or active tab change
  useEffect(() => {
    if (activeTab === 'pending' || activeTab === 'limits') {
      loadPendingData();
    }
    if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [activeTab, loadPendingData, loadHistoryData]);

  /**
   * Handle user manual branch selection change.
   * @param newBranchId - Newly selected branch ID.
   */
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    try {
      const selectedObj = branches.find((b) => b.id === newBranchId);
      if (selectedObj) {
        localStorage.setItem('mtgrms_active_branch', JSON.stringify(selectedObj));
        window.dispatchEvent(new CustomEvent('mtgrms:branch-changed', { detail: selectedObj }));
      }
    } catch (e) {
      console.warn('Error saving branch change to local storage:', e);
    }
  };

  /**
   * Save cash movement approval threshold and shift total limit.
   */
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveMessage(null);
    try {
      await posShiftApi.updateCashMovementSettings({
        cashOutApprovalThreshold: Number(threshold) || 0,
        cashOutShiftTotalLimit: Number(shiftTotalLimit) || 0,
      });

      const storageKey = `pos_payment_config_${currentTenantId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.cashOutApprovalThreshold = threshold;
          parsed.cashOutShiftTotalLimit = shiftTotalLimit;
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch (e) {
          console.warn('Error writing local config cache:', e);
        }
      }

      setSaveMessage('Đã lưu cấu hình hạn mức duyệt chi két thành công!');
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể lưu cấu hình hạn mức');
    } finally {
      setIsSavingSettings(false);
    }
  };

  /**
   * Approve a pending cash out movement.
   * @param id - Cash movement ID.
   */
  const handleApproveMovement = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.approveCashMovement(id);
      const target = pendingMovements.find((m) => m.id === id);
      if (target) {
        const approvedItem: ShiftCashMovementDto = {
          ...target,
          status: 'Recorded',
          approvedAtUtc: new Date().toISOString(),
        };
        setResolvedMovements((prev) => [approvedItem, ...prev.filter((m) => m.id !== id)]);
      }
      await loadPendingData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể duyệt phiếu chi');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Confirm rejection of a cash out movement with reason.
   */
  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối phiếu chi!');
      return;
    }
    setActionLoadingId(rejectingId);
    try {
      await posShiftApi.rejectCashMovement(rejectingId, rejectionReason.trim());
      const target = pendingMovements.find((m) => m.id === rejectingId);
      if (target) {
        const rejectedItem: ShiftCashMovementDto = {
          ...target,
          status: 'Rejected',
          rejectionReason: rejectionReason.trim(),
          approvedAtUtc: new Date().toISOString(),
        };
        setResolvedMovements((prev) => [rejectedItem, ...prev.filter((m) => m.id !== rejectingId)]);
      }
      setRejectingId(null);
      setRejectionReason('');
      await loadPendingData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối phiếu chi');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Confirm cash drop receipt by owner.
   * @param id - Cash drop movement ID.
   */
  const handleConfirmDrop = async (id: string) => {
    setActionLoadingId(id);
    try {
      await posShiftApi.confirmCashDrop(id);
      const target = unconfirmedDrops.find((m) => m.id === id);
      if (target) {
        const confirmedDropItem: ShiftCashMovementDto = {
          ...target,
          isConfirmedByOwner: true,
          confirmedByOwnerAtUtc: new Date().toISOString(),
        };
        setResolvedMovements((prev) => [confirmedDropItem, ...prev.filter((m) => m.id !== id)]);
      }
      await loadPendingData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xác nhận nhận tiền rút két');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Open Z-Report thermal receipt modal and fetch detailed Z-Report via posShiftApi.getZReport.
   * @param shiftId - The target shift ID.
   */
  const handleOpenZReport = async (shiftId: string) => {
    setZReportShiftId(shiftId);
    setIsLoadingZReport(true);
    setZReportError(null);
    setZReportData(null);
    try {
      const report = await posShiftApi.getZReport(shiftId);
      setZReportData(report);
    } catch (err: any) {
      console.warn('Lỗi gọi API getZReport, tạo fallback từ dữ liệu ca:', err);
      const fallbackShift = shifts.find((s) => s.id === shiftId);
      if (fallbackShift) {
        const fallbackReport: ZReportResponse = {
          shiftId: fallbackShift.id,
          shiftCode: fallbackShift.shiftCode,
          shiftName: fallbackShift.shiftName,
          branchId: fallbackShift.branchId,
          branchName: fallbackShift.branchName,
          tillId: fallbackShift.tillId,
          openedAtUtc: fallbackShift.openedAtUtc,
          closedAtUtc: fallbackShift.closedAtUtc,
          openingFloat: fallbackShift.openingFloat,
          cashSales: fallbackShift.actualCashCounted !== null && fallbackShift.actualCashCounted !== undefined
            ? Math.max(0, fallbackShift.actualCashCounted - fallbackShift.openingFloat)
            : 0,
          totalCashIn: fallbackShift.totalCashIn || 0,
          totalCashOut: fallbackShift.totalCashOut || 0,
          totalBankRevenue: fallbackShift.totalBankRevenue || 0,
          totalOrdersCount: 0,
          expectedCashInTill: fallbackShift.expectedCash || 0,
          actualCashCounted: fallbackShift.actualCashCounted,
          discrepancy: fallbackShift.discrepancy,
          retainedFloatAmount: fallbackShift.retainedFloatAmount || 0,
          droppedToSafeAmount: fallbackShift.droppedToSafeAmount || 0,
          handoverStatus: fallbackShift.handoverStatus,
          receiverUserId: null,
          notes: fallbackShift.notes,
          cashMovements: fallbackShift.cashMovements || [],
        };
        setZReportData(fallbackReport);
      } else {
        setZReportError(err?.response?.data?.message || 'Không thể tải chi tiết Z-Report cho ca này.');
      }
    } finally {
      setIsLoadingZReport(false);
    }
  };

  /**
   * Handle printing Z-Report thermal invoice using browser print window.
   */
  const handlePrintZReport = () => {
    const el = document.getElementById('z-report-receipt-paper');
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=440,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Z-Report — ${zReportData?.shiftCode || 'POS'}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 4mm;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                color: #000000;
                margin: 0;
                padding: 8px;
                background: #ffffff;
              }
              .receipt-paper {
                width: 100%;
                max-width: 320px;
                margin: 0 auto;
              }
              hr {
                border: none;
                border-top: 1px dashed #000000;
                margin: 8px 0;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .fw-bold { font-weight: bold; }
              .flex-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            ${el.innerHTML}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 600);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  /**
   * Submit shift handover confirmation or dispute.
   */
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
      await loadHistoryData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi gửi xác nhận bàn giao ca.');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  // Metrics for Tab 2
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

  // Paginated shifts for Tab 2
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shifts.slice(start, start + pageSize);
  }, [shifts, currentPage, pageSize]);

  // Helper badge renderer for handover status
  const renderHandoverBadge = (status: number | string) => {
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
          <span>Đã xác nhận</span>
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
          <span>Khiếu nại</span>
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
        <span>Chờ bàn giao</span>
      </span>
    );
  };

  const totalPendingCount = pendingMovements.length + unconfirmedDrops.length;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1360,
        margin: '0 auto',
        padding: '20px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ─── 1. TOP HEADER BAR ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.12)',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Quản Trị Ca &amp; Két POS
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
              Kiểm soát dòng tiền mặt &bull; Phê duyệt chi két &amp; rút két &bull; Lịch sử phiên ca &amp; Cấu hình hạn mức
            </p>
          </div>
        </div>

        {/* Branch Selection & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {branches.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#ffffff',
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Building2 size={16} className="text-teal-700" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>Chi nhánh:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0f172a',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Toàn bộ chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'pending' || activeTab === 'limits') loadPendingData();
              if (activeTab === 'history') loadHistoryData();
            }}
            disabled={isPendingLoading || isHistoryLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <RefreshCw
              size={15}
              className={isPendingLoading || isHistoryLoading ? 'animate-spin' : ''}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ─── 2. TAB NAVIGATION BAR ─── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'pending' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'pending' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} />
          <span>Yêu Cầu Chờ Duyệt</span>
          {totalPendingCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 12,
                backgroundColor: '#ffe4e6',
                color: '#e11d48',
              }}
            >
              {totalPendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'history' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'history' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
          }}
        >
          <History size={16} />
          <span>Lịch Sử Ca &amp; Bàn Giao</span>
          {shifts.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 12,
                backgroundColor: '#f1f5f9',
                color: '#475569',
              }}
            >
              {shifts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('limits')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'limits' ? '#0f766e' : '#64748b',
            borderBottom: activeTab === 'limits' ? '3px solid #0f766e' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
          }}
        >
          <Sliders size={16} />
          <span>Cấu Hình Hạn Mức Két</span>
        </button>
      </div>

      {/* ─── 3. TAB 1: PENDING (YÊU CẦU CHỜ DUYỆT) ─── */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: pendingMovements.length > 0 ? '1.5px solid #fecdd3' : '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>
                  Phiếu chi chờ phê duyệt
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: pendingMovements.length > 0 ? '#e11d48' : '#0f172a',
                    marginTop: 4,
                  }}
                >
                  {pendingMovements.length}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  {pendingMovements.length > 0 ? 'Cần chủ xem xét chấp thuận' : 'Không có yêu cầu tồn đọng'}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: pendingMovements.length > 0 ? '#ffe4e6' : '#f1f5f9',
                  color: pendingMovements.length > 0 ? '#e11d48' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUpCircle size={22} />
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: unconfirmedDrops.length > 0 ? '1.5px solid #bae6fd' : '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>
                  Khoản nộp rút két chờ nhận
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: unconfirmedDrops.length > 0 ? '#0284c7' : '#0f172a',
                    marginTop: 4,
                  }}
                >
                  {unconfirmedDrops.length}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  {unconfirmedDrops.length > 0 ? 'Thu ngân đã trích két nộp tiền' : 'Đã xác nhận đầy đủ'}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: unconfirmedDrops.length > 0 ? '#e0f2fe' : '#f1f5f9',
                  color: unconfirmedDrops.length > 0 ? '#0284c7' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowDownCircle size={22} />
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>
                  Hạn mức tự duyệt chi
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f766e', marginTop: 4 }}>
                  {threshold === 0 ? '0 đ (Duyệt tất cả)' : formatVND(threshold)}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  Mỗi phiếu chi vặt dưới mức này
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sliders size={20} />
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>
                  Trần tổng chi / ca
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {shiftTotalLimit === 0 ? 'Không giới hạn' : formatVND(shiftTotalLimit)}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                  Hạn mức lũy kế tối đa trong 1 ca
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={20} />
              </div>
            </div>
          </div>

          {/* ─── ACTION INBOX: YÊU CẦU CA & KÉT CHỜ DUYỆT ─── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={20} className="text-teal-700" />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  ⏳ Yêu cầu Ca &amp; Két đang chờ duyệt ({pendingMovements.length + unconfirmedDrops.length})
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    backgroundColor: '#ccfbf1',
                    color: '#0f766e',
                    border: '1px solid #99f6e4',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Đồng bộ 1 nguồn với Sổ quỹ &amp; Tài chính
                </span>
                {/* Filter buttons */}
                <div style={{ display: 'inline-flex', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 2 }}>
                  <button
                    type="button"
                    onClick={() => setPendingFilter('ALL')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: pendingFilter === 'ALL' ? '#ffffff' : 'transparent',
                      color: pendingFilter === 'ALL' ? '#0f766e' : '#64748b',
                      boxShadow: pendingFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Tất cả ({pendingMovements.length + unconfirmedDrops.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFilter('DROPS')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: pendingFilter === 'DROPS' ? '#ffffff' : 'transparent',
                      color: pendingFilter === 'DROPS' ? '#0f766e' : '#64748b',
                      boxShadow: pendingFilter === 'DROPS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Nộp két sắt ({unconfirmedDrops.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFilter('EXPENSES')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: pendingFilter === 'EXPENSES' ? '#ffffff' : 'transparent',
                      color: pendingFilter === 'EXPENSES' ? '#ea580c' : '#64748b',
                      boxShadow: pendingFilter === 'EXPENSES' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Chi vượt hạn mức ({pendingMovements.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Content: Action Inbox Items List */}
            <div style={{ padding: 18 }}>
              {(() => {
                const showDrops = pendingFilter === 'ALL' || pendingFilter === 'DROPS';
                const showExpenses = pendingFilter === 'ALL' || pendingFilter === 'EXPENSES';
                const visibleDrops = showDrops ? unconfirmedDrops : [];
                const visibleExpenses = showExpenses ? pendingMovements : [];
                const totalVisible = visibleDrops.length + visibleExpenses.length;

                if (totalVisible === 0) {
                  return (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <CheckCircle2 size={42} className="text-emerald-500" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                        Tất cả yêu cầu rút két và chi tại quầy đã được xử lý xong.
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                        Không có yêu cầu nộp két sắt hoặc chi quầy vượt hạn mức nào cần Chủ cửa hàng phê duyệt lúc này.
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="action-inbox-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Render Drops (Nộp két sắt) */}
                    {visibleDrops.map((item) => (
                      <div
                        key={`drop-${item.id}`}
                        className="action-inbox-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '14px 18px',
                          backgroundColor: '#f0fdfa',
                          border: '1px solid #ccfbf1',
                          borderLeft: '4px solid #0f766e',
                          borderRadius: 8,
                          transition: 'all 0.15s ease',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div className="action-inbox-content" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                backgroundColor: '#ccfbf1',
                                color: '#0f766e',
                                border: '1px solid #99f6e4',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 700,
                                fontSize: 11.5,
                              }}
                            >
                              Nộp két sắt
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                              #{item.id.slice(0, 8)}
                            </span>
                            <span className="action-inbox-title" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              Rút két nộp về két sắt
                            </span>
                          </div>
                          <div className="action-inbox-meta" style={{ fontSize: 13, color: '#334155' }}>
                            {item.reason || 'Rút tiền mặt khỏi két nộp về két sắt để giảm tồn quỹ'}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>
                              Nhân viên: <strong style={{ color: '#0f172a' }}>{item.createdByName || 'Thu ngân'}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>Ca #{item.shiftId ? item.shiftId.slice(0, 8) : '---'}</span>
                            <span>&bull;</span>
                            <span>{item.occurredAtUtc ? formatDate(item.occurredAtUtc) : 'Vừa tạo'}</span>
                          </div>
                        </div>

                        <div className="action-inbox-actions" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                              +{formatVND(item.amount)}
                            </div>
                            <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>Tiền giao nộp két</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleConfirmDrop(item.id)}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 18px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#0f766e',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Check size={15} />
                            <span>{actionLoadingId === item.id ? 'Đang xác nhận...' : 'Đã nhận đủ'}</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Render Expenses (Chi vượt hạn mức) */}
                    {visibleExpenses.map((item) => (
                      <div
                        key={`exp-${item.id}`}
                        className="action-inbox-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '14px 18px',
                          backgroundColor: '#fff7ed',
                          border: '1px solid #ffedd5',
                          borderLeft: '4px solid #ea580c',
                          borderRadius: 8,
                          transition: 'all 0.15s ease',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div className="action-inbox-content" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 260, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                backgroundColor: '#ffedd5',
                                color: '#ea580c',
                                border: '1px solid #fed7aa',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 700,
                                fontSize: 11.5,
                              }}
                            >
                              Chi vượt hạn mức
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                              #{item.id.slice(0, 8)}
                            </span>
                            <span className="action-inbox-title" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              Chi tiền tại quầy POS
                            </span>
                          </div>
                          <div className="action-inbox-meta" style={{ fontSize: 13, color: '#334155' }}>
                            {item.reason || 'Chi vặt phát sinh tại quầy thu ngân'}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>
                              Nhân viên: <strong style={{ color: '#0f172a' }}>{item.createdByName || 'Thu ngân'}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>Ca #{item.shiftId ? item.shiftId.slice(0, 8) : '---'}</span>
                            <span>&bull;</span>
                            <span>{item.occurredAtUtc ? formatDate(item.occurredAtUtc) : 'Vừa tạo'}</span>
                          </div>
                        </div>

                        <div className="action-inbox-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c', fontVariantNumeric: 'tabular-nums' }}>
                              -{formatVND(item.amount)}
                            </div>
                            <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>Chi quỹ quầy</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(item.id);
                              setRejectionReason('');
                            }}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 14px',
                              borderRadius: 6,
                              border: '1px solid #fecdd3',
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <X size={15} />
                            <span>Từ chối</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveMovement(item.id)}
                            disabled={actionLoadingId === item.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 18px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#0f766e',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Check size={15} />
                            <span>{actionLoadingId === item.id ? 'Đang duyệt...' : 'Duyệt chi'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ─── BẢNG: LỊCH SỬ ĐÃ DUYỆT TRONG NGÀY ─── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={18} className="text-teal-700" />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📜 Lịch sử đã duyệt trong ngày ({resolvedMovements.length})
                </h3>
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Theo dõi các khoản tiền mặt đã xác nhận hôm nay
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 12, fontWeight: 700 }}>
                    <th style={{ padding: '10px 16px' }}>Mã phiếu</th>
                    <th style={{ padding: '10px 16px' }}>Loại phiếu</th>
                    <th style={{ padding: '10px 16px' }}>Nội dung</th>
                    <th style={{ padding: '10px 16px' }}>Thu ngân</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Số tiền</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '10px 16px' }}>Thời gian xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                        <CheckCircle2 size={32} className="text-emerald-500" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 600, color: '#334155' }}>Chưa có phiếu đã xử lý trong ngày hôm nay.</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          Khi bạn duyệt chi hoặc xác nhận nhận tiền rút két, các khoản tiền đã xử lý sẽ lưu vào đây.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    resolvedMovements.map((r) => {
                      const isDrop = r.category === 'CASH_DRAW' || r.category === 2;
                      const isRejected = r.status === 'Rejected' || r.status === 3;

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            #{r.id.slice(0, 8)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {isDrop ? (
                              <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                                Nộp két sắt
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11.5 }}>
                                Chi tại quầy POS
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#1e293b' }}>
                            <div>{r.reason || (isDrop ? 'Rút tiền nộp két sắt' : 'Chi tiền tại quầy')}</div>
                            {r.rejectionReason && (
                              <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2 }}>
                                <b>Lý do từ chối:</b> {r.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                            {r.createdByName || 'Thu ngân'}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              textAlign: 'right',
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              color: isDrop ? '#0f766e' : '#ea580c',
                            }}
                          >
                            {isDrop ? `+${formatVND(r.amount)}` : `-${formatVND(r.amount)}`}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {isRejected ? (
                              <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11.5 }}>
                                Đã từ chối
                              </span>
                            ) : isDrop ? (
                              <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11.5 }}>
                                Đã nhận đủ
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11.5 }}>
                                Đã duyệt
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                            {formatDate(r.approvedAtUtc || r.confirmedByOwnerAtUtc || r.occurredAtUtc)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. TAB 2: HISTORY (LỊCH SỬ CA & BÀN GIAO) ─── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Time range filter & shift count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFFFFF',
              padding: '12px 18px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
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

          {/* 4 KPI Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: kpiMetrics.totalDiscrepancy < 0 ? '#DC2626' : '#D97706',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
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

          {/* History error notice if any */}
          {historyError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#991B1B',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{historyError}</span>
            </div>
          )}

          {/* Shifts Table */}
          <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
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
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Bàn giao</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                        <RefreshCw size={20} className="animate-spin text-teal-700" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải lịch sử ca làm việc từ hệ thống...</div>
                      </td>
                    </tr>
                  ) : paginatedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                        <AlertCircle size={24} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 600, color: '#334155' }}>Không có ca làm việc nào trong khoảng thời gian này</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Hãy chọn khoảng thời gian khác hoặc chuyển đổi chi nhánh.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedShifts.map((s) => {
                      const diff = s.discrepancy ?? 0;
                      const isPendingHandover = s.handoverStatus === 1 || s.handoverStatus === 'PENDING';
                      const uniqueParticipants = dedupeParticipants(s.participants);
                      const cashierDisplay = uniqueParticipants.length > 0
                        ? uniqueParticipants.map((p) => p.fullName || p.userName).join(', ')
                        : 'Thu ngân quầy';

                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                            {s.shiftCode}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: 12 }}>
                            <div><b>Mở:</b> {formatDate(s.openedAtUtc)}</div>
                            <div><b>Đóng:</b> {s.closedAtUtc ? formatDate(s.closedAtUtc) : <span style={{ color: '#10B981' }}>Đang mở</span>}</div>
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
                            {renderHandoverBadge(s.handoverStatus)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {/* Nút Xem Hóa Đơn In Nhiệt Z-Report POS */}
                              <button
                                type="button"
                                onClick={() => handleOpenZReport(s.id)}
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
                                title="Xem Z-Report in nhiệt & đối soát tiền két"
                              >
                                <Printer size={13} />
                                <span>Z-Report</span>
                              </button>

                              {/* Nút Xem Chi Tiết Giao Dịch Thu/Chi Trong Ca */}
                              <button
                                type="button"
                                onClick={() => setSelectedDetailShift(s)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#475569',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Xem chi tiết các giao dịch và nhân viên trực ca"
                              >
                                <Eye size={13} />
                                <span>Chi tiết</span>
                              </button>

                              {/* Xử lý nhận ca & Phân quyền Chủ shop / Nhân viên */}
                              {isPendingHandover && (
                                !isOwnerOrAdmin ? (
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
                                      border: '1px solid #D97706',
                                      backgroundColor: '#FFFBEB',
                                      color: '#B45309',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                    title="Xác nhận nhận tiền bàn giao ca này"
                                  >
                                    <UserCheck size={13} />
                                    <span>Nhận ca</span>
                                  </button>
                                ) : (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        backgroundColor: '#FFFBEB',
                                        border: '1px solid #FDE68A',
                                        color: '#B45309',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                      }}
                                      title="Ca đang chờ nhân viên ca tiếp theo đăng nhập quầy POS để kiểm đếm và nhận két"
                                    >
                                      <Clock size={12} />
                                      <span>Chờ nhân viên ca sau xác nhận</span>
                                    </span>

                                    {diff !== 0 && (
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
                                          border: '1px solid #DC2626',
                                          backgroundColor: '#FEF2F2',
                                          color: '#DC2626',
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                        title="Chủ cửa hàng can thiệp xem xét và phê duyệt lệch quỹ két"
                                      >
                                        <AlertTriangle size={12} />
                                        <span>Can thiệp duyệt lệch quỹ</span>
                                      </button>
                                    )}
                                  </div>
                                )
                              )}

                              {/* Trường hợp ca có khiếu nại Dispute: Chủ shop can thiệp xử lý */}
                              {(s.handoverStatus === 3 || s.handoverStatus === 'DISPUTED') && isOwnerOrAdmin && (
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
                                    border: '1px solid #DC2626',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Xử lý tranh chấp khiếu nại bàn giao ca này"
                                >
                                  <Scale size={13} />
                                  <span>Xử lý Dispute</span>
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

            {/* Pagination */}
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
        </div>
      )}

      {/* ─── 5. TAB 3: LIMITS (CẤU HÌNH HẠN MỨC KÉT) ─── */}
      {activeTab === 'limits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {saveMessage && (
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                color: '#065f46',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(340px, 680px)',
              gap: 20,
            }}
          >
            <form
              onSubmit={handleSaveSettings}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: 14,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <Sliders size={20} className="text-teal-700" />
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Cấu Hình Hạn Mức Duyệt Chi &amp; Trần Ca
                  </h2>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    Áp dụng cho mọi quầy POS bán hàng trong hệ thống cửa hàng
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 12,
                  backgroundColor: '#f0fdfa',
                  borderRadius: 8,
                  border: '1px solid #ccfbf1',
                }}
              >
                <Info size={18} className="text-teal-700 flex-shrink-0" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 12.5, color: '#0f766e', lineHeight: 1.5 }}>
                  Kiểm soát tự động dòng tiền mặt tại quầy thu ngân. Hạn chế tối đa rủi ro thất thoát hoặc nhân viên tự ý rút tiền chi tiêu mà không có sự đồng ý của Chủ cửa hàng.
                </span>
              </div>

              {/* Field 1: Single cash out approval threshold */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Hạn mức duyệt chi tự động cho mỗi lần chi (VNĐ):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: '#0f172a',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>đ</span>
                </div>

                {/* Quick Chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {[0, 100000, 200000, 500000, 1000000, 2000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThreshold(val)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: threshold === val ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                        backgroundColor: threshold === val ? '#ccfbf1' : '#f8fafc',
                        color: threshold === val ? '#0f766e' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {val === 0 ? '0 đ (Bắt buộc duyệt hết)' : formatVND(val)}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                  Phiếu chi dưới mức này được xuất tiền ngay. Chi bằng hoặc lớn hơn mức này bắt buộc Chủ cửa hàng duyệt.
                </p>
              </div>

              {/* Field 2: Shift total limit */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Hạn mức tổng chi vặt tối đa trong 1 ca làm việc:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={shiftTotalLimit}
                    onChange={(e) => setShiftTotalLimit(Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: '#0f172a',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>đ</span>
                </div>

                {/* Quick Chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {[0, 500000, 1000000, 2000000, 5000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setShiftTotalLimit(val)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: shiftTotalLimit === val ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                        backgroundColor: shiftTotalLimit === val ? '#ccfbf1' : '#f8fafc',
                        color: shiftTotalLimit === val ? '#0f766e' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {val === 0 ? '0 đ (Không giới hạn)' : formatVND(val)}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                  Tổng các khoản chi vặt tích lũy trong ca không được vượt quá mức này. Đặt 0 nếu không giới hạn.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSavingSettings}
                style={{
                  marginTop: 8,
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  height: 44,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                }}
              >
                <Save size={18} />
                <span>{isSavingSettings ? 'Đang lưu thiết lập...' : 'Lưu Thiết Lập Hạn Mức'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL TỪ CHỐI DUYỆT CHI ─── */}
      {rejectingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e11d48' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Từ Chối Yêu Cầu Chi Tiền</h3>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
              Vui lòng nhập lý do từ chối để thu ngân tại quầy nắm rõ và không thực hiện xuất quỹ cho khoản này.
            </p>

            <textarea
              rows={3}
              placeholder="VD: Khoản chi này không thuộc danh mục chi vặt của cửa hàng, cần hóa đơn đỏ..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: 13,
                marginTop: 10,
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setRejectionReason('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoadingId === rejectingId}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {actionLoadingId === rejectingId ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL XÁC NHẬN BÀN GIAO CA (HANDOVER) ─── */}
      {handoverShift && (
        <div
          className="pos-modal-overlay"
          onClick={() => setHandoverShift(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="pos-modal-dialog"
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} className="text-teal-700" />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Xác Nhận Nhận Bàn Giao Ca #{handoverShift.shiftCode}
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
              <div
                style={{
                  background: '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748B' }}>Số tiền ca trước để lại két:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E', fontSize: 14 }}>
                    {formatVND(handoverShift.retainedFloatAmount || handoverShift.actualCashCounted || handoverShift.expectedCash)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Nhân viên ca bàn giao:</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>
                    {dedupeParticipants(handoverShift.participants).length
                      ? dedupeParticipants(handoverShift.participants).map((p) => p.fullName || p.userName).join(', ')
                      : 'Thu ngân'}
                  </span>
                </div>
              </div>

              {/* Handover selection */}
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

              {/* Dispute reason textarea */}
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

      {/* ─── 8. MODAL XEM CHI TIẾT PHIÊN CA & Z-REPORT ─── */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <History size={18} className="text-teal-700" />
                  <span>Chi Tiết Phiên Ca Bán Hàng ({selectedDetailShift.shiftCode})</span>
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Tên ca: <b>{selectedDetailShift.shiftName}</b> &bull; Mở: {formatDate(selectedDetailShift.openedAtUtc)} &bull; Đóng:{' '}
                  {selectedDetailShift.closedAtUtc ? formatDate(selectedDetailShift.closedAtUtc) : 'Đang mở'}
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

            {/* Content */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Participants */}
              <div
                style={{
                  background: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  fontSize: 12.5,
                }}
              >
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

              {/* Z-Report Table Metrics */}
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: '#0F172A',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <BarChart3 size={16} color="#0F766E" /> Báo Cáo Kết Toán Tiền Két (Z-Report):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Vốn đầu ca (Opening Float):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {formatVND(selectedDetailShift.openingFloat)}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Doanh thu chuyển khoản (VietQR):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0284C7' }}>
                      {formatVND(selectedDetailShift.totalBankRevenue)}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng nạp thêm vào két (+):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                      +{formatVND(selectedDetailShift.totalCashIn)}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Tổng chi / rút tiền khỏi két (-):</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                      -{formatVND(selectedDetailShift.totalCashOut)}
                    </div>
                  </div>
                  <div style={{ background: '#ECFDF5', padding: '8px 12px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: 11.5, color: '#065F46' }}>Tiền mặt lý thuyết trong két:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#065F46' }}>
                      {formatVND(selectedDetailShift.expectedCash)}
                    </div>
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

              {/* Discrepancy & Reason */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: (selectedDetailShift.discrepancy ?? 0) === 0 ? '1px solid #86EFAC' : '1.5px solid #FECACA',
                  backgroundColor: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#F0FDF4' : '#FEF2F2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#991B1B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Scale size={15} color={(selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#991B1B'} /> Kết quả đối soát chênh lệch:
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: (selectedDetailShift.discrepancy ?? 0) === 0 ? '#15803D' : '#DC2626',
                    }}
                  >
                    {(selectedDetailShift.discrepancy ?? 0) === 0
                      ? 'Khớp chuẩn (0 đ)'
                      : (selectedDetailShift.discrepancy ?? 0) > 0
                        ? `Thừa +${formatVND(selectedDetailShift.discrepancy!)}`
                        : `Thiếu ${formatVND(selectedDetailShift.discrepancy!)}`}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
                  <b>Lý do giải trình chênh lệch / Ghi chú ca:</b>
                  <div
                    style={{
                      marginTop: 2,
                      padding: '6px 10px',
                      background: '#FFFFFF',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0',
                      fontStyle: selectedDetailShift.notes ? 'normal' : 'italic',
                    }}
                  >
                    {selectedDetailShift.notes || 'Không có ghi chú hoặc khiếu nại phát sinh trong ca.'}
                  </div>
                </div>
                {selectedDetailShift.retainedFloatAmount !== undefined && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#475569' }}>
                    <span>
                      Để lại két ca sau: <b>{formatVND(selectedDetailShift.retainedFloatAmount || 0)}</b>
                    </span>
                    <span>
                      Nộp két an toàn / Chủ: <b>{formatVND(selectedDetailShift.droppedToSafeAmount || 0)}</b>
                    </span>
                  </div>
                )}
              </div>

              {/* Movement history table */}
              {selectedDetailShift.cashMovements && selectedDetailShift.cashMovements.length > 0 && (
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: '#0F172A',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
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
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: m.movementType === 1 || m.movementType === 'IN' ? '#059669' : '#DC2626',
                                }}
                              >
                                {m.movementType === 1 || m.movementType === 'IN' ? '[+] Thu' : '[-] Chi'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                              {formatVND(m.amount)}
                            </td>
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

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: 18,
                borderTop: '1px solid #E2E8F0',
                paddingTop: 12,
              }}
            >
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

      {/* ─── 9. MODAL HÓA ĐƠN IN NHIỆT Z-REPORT (.receipt-paper) ─── */}
      {zReportShiftId && (
        <div
          className="pos-modal-overlay"
          onClick={() => setZReportShiftId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 460,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} className="text-teal-700" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  Báo Cáo Kết Toán Ca POS (Z-Report)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZReportShiftId(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: Receipt Paper hoặc Loading */}
            {isLoadingZReport ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={28} className="animate-spin text-teal-700" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: '#1E293B' }}>Đang tải báo cáo Z-Report từ máy chủ...</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Tính toán kết toán doanh số và đối soát két bán hàng</div>
              </div>
            ) : zReportError ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
                <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#991B1B' }}>{zReportError}</div>
                <button
                  type="button"
                  onClick={() => handleOpenZReport(zReportShiftId)}
                  style={{
                    marginTop: 12,
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #DC2626',
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : zReportData ? (
              <div
                id="z-report-receipt-paper"
                className="receipt-paper"
                style={{
                  width: '100%',
                  maxWidth: 380,
                  margin: '0 auto',
                  padding: '24px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px dashed #94A3B8',
                  borderRadius: 6,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  fontFamily: "'Courier New', Courier, monospace, ui-monospace",
                  fontSize: 12.5,
                  color: '#0F172A',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, letterSpacing: 0.5, color: '#0F172A' }}>
                  PHIẾU KẾT CA POS (Z-REPORT)
                </div>
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, marginTop: 4 }}>
                  <b>{zReportData.shiftCode}</b> &bull; {zReportData.branchName || 'Chi nhánh POS'}
                </div>
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: 11.5 }}>
                  Tên ca: {zReportData.shiftName} &bull; Quầy #{zReportData.tillId}
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #CBD5E1', margin: '12px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#64748B' }}>Mở ca:</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(zReportData.openedAtUtc)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#64748B' }}>Đóng ca:</span>
                  <span style={{ fontWeight: 600 }}>{zReportData.closedAtUtc ? formatDate(zReportData.closedAtUtc) : 'Đang mở (chưa đóng)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#64748B' }}>Tổng số đơn hàng:</span>
                  <span style={{ fontWeight: 700 }}>{zReportData.totalOrdersCount} đơn</span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #CBD5E1', margin: '12px 0' }} />

                {/* Các dòng chỉ số tài chính Z-Report */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Tiền đầu ca (Opening Float):</span>
                  <span style={{ fontWeight: 700 }}>{formatVND(zReportData.openingFloat)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Doanh số tiền mặt thực tế:</span>
                  <span style={{ fontWeight: 700, color: '#0F766E' }}>+{formatVND(zReportData.cashSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Doanh thu quét mã VietQR:</span>
                  <span style={{ fontWeight: 700, color: '#0284C7' }}>+{formatVND(zReportData.totalBankRevenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Tiền rút nộp két sắt trong ca:</span>
                  <span style={{ fontWeight: 700, color: '#D97706' }}>-{formatVND(zReportData.droppedToSafeAmount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Chi tiền tại quầy trong ca:</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>-{formatVND(zReportData.totalCashOut || 0)}</span>
                </div>
                {zReportData.totalCashIn > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Nạp tiền mặt bổ sung (+):</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>+{formatVND(zReportData.totalCashIn)}</span>
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px dashed #CBD5E1', margin: '12px 0' }} />

                {/* Đối soát két cuối ca */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                  <span>Két kỳ vọng tính toán:</span>
                  <span>{formatVND(zReportData.expectedCashInTill)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                  <span>Két thực tế kiểm đếm:</span>
                  <span>
                    {zReportData.actualCashCounted !== null && zReportData.actualCashCounted !== undefined
                      ? formatVND(zReportData.actualCashCounted)
                      : '--- (Chưa chốt)'}
                  </span>
                </div>
                {(() => {
                  const diff = zReportData.discrepancy !== null && zReportData.discrepancy !== undefined
                    ? zReportData.discrepancy
                    : (zReportData.actualCashCounted !== null && zReportData.actualCashCounted !== undefined
                        ? zReportData.actualCashCounted - zReportData.expectedCashInTill
                        : 0);
                  const diffColor = diff === 0 ? '#059669' : diff > 0 ? '#059669' : '#DC2626';
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13.5, color: diffColor, marginTop: 2 }}>
                      <span>Chênh lệch (Difference):</span>
                      <span>
                        {diff === 0 ? 'Khớp (0 đ)' : diff > 0 ? `+${formatVND(diff)} (Thừa)` : `${formatVND(diff)} (Thiếu)`}
                      </span>
                    </div>
                  );
                })()}

                {zReportData.retainedFloatAmount !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: '#64748B' }}>
                    <span>Tiền để lại két ca sau:</span>
                    <span style={{ fontWeight: 600 }}>{formatVND(zReportData.retainedFloatAmount || 0)}</span>
                  </div>
                )}

                {zReportData.notes && (
                  <>
                    <hr style={{ border: 'none', borderTop: '1px dashed #CBD5E1', margin: '10px 0' }} />
                    <div style={{ fontSize: 11.5 }}>
                      <span style={{ color: '#64748B' }}>Ghi chú ca / Giải trình lệch:</span>
                      <div style={{ padding: '6px 8px', backgroundColor: '#F8FAFC', borderRadius: 4, border: '1px solid #E2E8F0', marginTop: 3 }}>
                        {zReportData.notes}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 16 }}>
                  -- MT-GRMS POS CASH MANAGEMENT --
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #E2E8F0',
                paddingTop: 14,
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setZReportShiftId(null)}
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
                Đóng
              </button>

              {zReportData && (
                <button
                  type="button"
                  onClick={handlePrintZReport}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#0F766E',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
                  }}
                >
                  <Printer size={16} />
                  <span>In phiếu kết ca (Z-Report)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashControlHubPage;
