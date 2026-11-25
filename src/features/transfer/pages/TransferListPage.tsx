import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  Plus,
  Download,
  Search,
  Truck,
  CheckCircle,
  FileText,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { Branch, TransferCompletionResult, TransferOrder, TransferStatus } from '../types';
import { getTransferErrorMessage, transferService } from '../services/transferService';
import { TransferDetailModal } from '../components/TransferDetailModal';
import { TablePagination } from '../../../components/common';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../../styles/so-list-page.css';
import '../../purchase-order/purchase-order.css';
import '../transfer.css';

const getStatusDisplayLabel = (t: TransferOrder): string => {
  if (t.status === 'Completed') {
    if (t.completionResult === 'Returned') return 'Đã hoàn trả kho nguồn';
    if (t.completionResult === 'ReceivedWithDiscrepancy' || t.hasDiscrepancy) {
      return 'Hoàn tất có chênh lệch';
    }
    return 'Hoàn tất';
  }
  switch (t.status) {
    case 'Draft':
      return 'Phiếu tạm';
    case 'Pending':
      return 'Chờ xử lý';
    case 'InTransit':
      return 'Đang chuyển';
    case 'Cancelled':
      return 'Đã hủy';
  }
};

export const TransferListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const querySearch =
    searchParams.get('search') || searchParams.get('code') || searchParams.get('transferCode') || '';
  const queryStatus = searchParams.get('status') || 'ALL';
  const queryFromBranch = searchParams.get('fromBranchId') || '';
  const queryToBranch = searchParams.get('toBranchId') || '';
  const queryDetailId = searchParams.get('id') || searchParams.get('detailId');

  // State
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // User role & current branch context
  const user = useAuthStore((state) => state.user);
  const isStoreOwner = user?.role === 'STORE_OWNER';
  const transferBasePath = isStoreOwner ? '/store-owner/transfers' : '/employee/transfers';

  // Filters
  const [searchInput, setSearchInput] = useState<string>(() => querySearch);
  const [appliedSearch, setAppliedSearch] = useState<string>(() => querySearch);
  const [fromBranchId, setFromBranchId] = useState<string>(() => queryFromBranch);
  const [toBranchId, setToBranchId] = useState<string>(() => queryToBranch);
  const [selectedStatuses, setSelectedStatuses] = useState<TransferStatus[]>(() => {
    if (queryStatus === 'Draft' || queryStatus === 'Pending' || queryStatus === 'Cancelled') {
      return [queryStatus];
    }
    if (queryStatus === 'InTransit') {
      return ['InTransit'];
    }
    if (queryStatus === 'Completed' || queryStatus === 'Completed_Discrepancy' || queryStatus === 'Completed_Returned') {
      return ['Completed'];
    }
    return ['Draft', 'Pending', 'InTransit', 'Completed', 'Cancelled'];
  });
  const [completionResultFilter, setCompletionResultFilter] = useState<TransferCompletionResult | undefined>(() => {
    if (queryStatus === 'Completed_Discrepancy') return 'ReceivedWithDiscrepancy';
    if (queryStatus === 'Completed_Returned') return 'Returned';
    return undefined;
  });
  const [statusDropdown, setStatusDropdown] = useState<string>(() => queryStatus);
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'custom'>('this_month');
  const [customDate, setCustomDate] = useState<string>('');
  const [recvStatus, setRecvStatus] = useState<'all' | 'match' | 'mismatch'>('all');
  const [dateField, setDateField] = useState<'transfer' | 'receive'>('transfer');

  // Modals & Pagination
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Race-condition guard
  const requestSeqRef = useRef<number>(0);

  // Scroll synchronization between fixed header and scrollable body
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState<boolean>(false);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Deep link: auto-open modal if id provided
  useEffect(() => {
    if (queryDetailId) {
      transferService
        .get(queryDetailId)
        .then((detail) => {
          setSelectedTransfer(detail);
          setIsDetailModalOpen(true);
        })
        .catch(() => {
          // non-blocking
        });
    }
  }, [queryDetailId]);

  const loadTransfers = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    if (selectedStatuses.length === 0) {
      setTransfers([]);
      setTotalItems(0);
      setIsLoading(false);
      return;
    }
    const activeStatuses = selectedStatuses;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const date =
      timeRange === 'this_month'
        ? monthStart
        : timeRange === 'custom' && customDate
          ? new Date(`${customDate}T00:00:00`).toISOString()
          : undefined;

    transferService
      .list({
        page: pageIndex,
        pageSize,
        search: appliedSearch.trim() || undefined,
        fromBranchId: fromBranchId || undefined,
        toBranchId: toBranchId || undefined,
        statuses: activeStatuses.length ? activeStatuses : undefined,
        completionResult: completionResultFilter,
        receiveStatus: recvStatus,
        fromDate: date,
        toDate: timeRange === 'custom' && customDate ? customDate : undefined,
        dateField,
      })
      .then((result) => {
        if (seq !== requestSeqRef.current) return;
        setTransfers(result.items);
        setTotalItems(result.totalItems);
      })
      .catch((error: unknown) => {
        if (seq !== requestSeqRef.current) return;
        showToast(getTransferErrorMessage(error), 'warning');
      })
      .finally(() => {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      });
  }, [
    pageIndex,
    pageSize,
    appliedSearch,
    fromBranchId,
    toBranchId,
    selectedStatuses,
    completionResultFilter,
    timeRange,
    customDate,
    dateField,
    recvStatus,
  ]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    transferService
      .branches()
      .then((data) => {
        setBranches(data);
      })
      .catch((error: unknown) => {
        showToast(getTransferErrorMessage(error), 'warning');
      });
  }, []);

  useEffect(() => {
    setPageIndex(1);
  }, [
    appliedSearch,
    fromBranchId,
    toBranchId,
    selectedStatuses,
    completionResultFilter,
    timeRange,
    customDate,
    recvStatus,
    dateField,
  ]);

  const handleStatusDropdownChange = (value: string) => {
    setStatusDropdown(value);
    if (value === 'ALL') {
      setSelectedStatuses(['Draft', 'Pending', 'InTransit', 'Completed', 'Cancelled']);
      setCompletionResultFilter(undefined);
    } else if (value === 'Completed_Discrepancy') {
      setSelectedStatuses(['Completed']);
      setCompletionResultFilter('ReceivedWithDiscrepancy');
    } else if (value === 'Completed_Returned') {
      setSelectedStatuses(['Completed']);
      setCompletionResultFilter('Returned');
    } else {
      setSelectedStatuses([value as TransferStatus]);
      setCompletionResultFilter(undefined);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setFromBranchId('');
    setToBranchId('');
    setStatusDropdown('ALL');
    setSelectedStatuses(['Draft', 'Pending', 'InTransit', 'Completed', 'Cancelled']);
    setCompletionResultFilter(undefined);
    setTimeRange('this_month');
    setCustomDate('');
    setRecvStatus('all');
    setDateField('transfer');
  };

  // Filter logic including BR-SEC-02 (server-side search is authoritative for appliedSearch)
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // BR-SEC-02: Branch Isolation for Employee
      if (!isStoreOwner && user?.branchId) {
        const isRelated = t.fromBranchId === user.branchId || t.toBranchId === user.branchId;
        if (!isRelated) return false;
      }

      // From branch
      if (fromBranchId && t.fromBranchId !== fromBranchId) return false;

      // To branch
      if (toBranchId && t.toBranchId !== toBranchId) return false;

      // Status
      if (!selectedStatuses.includes(t.status)) return false;

      // Completion result
      if (completionResultFilter && t.completionResult !== completionResultFilter) return false;

      // Recv status
      if (recvStatus === 'match') {
        const isAllMatch = t.items.every((it) => it.receivedQty === it.sentQty && (it.damagedQty ?? 0) === 0);
        if (!isAllMatch || t.status !== 'Completed' || t.completionResult === 'Returned') return false;
      } else if (recvStatus === 'mismatch') {
        const hasMismatch = t.items.some((it) => (it.damagedQty ?? 0) > 0 || (it.receivedQty ?? it.sentQty) < it.sentQty);
        if (!hasMismatch || t.status !== 'Completed' || t.completionResult === 'Returned') return false;
      }

      return true;
    });
  }, [
    transfers,
    isStoreOwner,
    user?.branchId,
    fromBranchId,
    toBranchId,
    selectedStatuses,
    completionResultFilter,
    recvStatus,
  ]);

  // Update vertical scrollbar detection
  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [filteredTransfers]);

  // BUG-044: Exclude both Cancelled and Returned transfers from totalTransferValue
  const totalTransferValue = filteredTransfers
    .filter((t) => t.status !== 'Cancelled' && t.completionResult !== 'Returned')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const exportExcel = async () => {
    if (!filteredTransfers.length) {
      showToast('Không có phiếu chuyển để xuất.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Phiếu chuyển');
      sheet.addRow([
        'Mã phiếu',
        'Ngày chuyển',
        'Ngày nhận',
        'Chi nhánh gửi',
        'Chi nhánh nhận',
        'Trạng thái',
        ...(isStoreOwner ? ['Tổng tiền'] : []),
      ]);
      filteredTransfers.forEach((transfer) =>
        sheet.addRow([
          transfer.transferCode,
          transfer.transferDate,
          transfer.completionResult === 'Returned'
            ? '(Hoàn trả kho nguồn)'
            : transfer.receiveDate || '',
          transfer.fromBranchName,
          transfer.toBranchName,
          getStatusDisplayLabel(transfer),
          ...(isStoreOwner ? [transfer.totalAmount] : []),
        ])
      );
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => {
        column.width = 22;
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'danh-sach-phieu-chuyen.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất danh sách phiếu chuyển ra Excel thành công.');
    } catch {
      showToast('Lỗi khi xuất tệp Excel.', 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatus = (transfer: TransferOrder) => {
    if (transfer.status === 'Completed') {
      if (transfer.completionResult === 'Returned') {
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              whiteSpace: 'nowrap',
            }}
          >
            Đã hoàn trả kho nguồn
          </span>
        );
      }
      if (transfer.completionResult === 'ReceivedWithDiscrepancy' || transfer.hasDiscrepancy) {
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              whiteSpace: 'nowrap',
            }}
          >
            Hoàn tất có chênh lệch
          </span>
        );
      }
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3px 10px',
            borderRadius: 9999,
            fontSize: 11.5,
            fontWeight: 600,
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            whiteSpace: 'nowrap',
          }}
        >
          Hoàn tất
        </span>
      );
    }

    switch (transfer.status) {
      case 'Draft':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              whiteSpace: 'nowrap',
            }}
          >
            Phiếu tạm
          </span>
        );
      case 'Pending':
        return (
          <span className="transfer-status transfer-status--pending">Chờ xử lý</span>
        );
      case 'InTransit':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap',
            }}
          >
            Đang chuyển
          </span>
        );
      case 'Cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 600,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              whiteSpace: 'nowrap',
            }}
          >
            Đã hủy
          </span>
        );
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: 160 }} />
      <col style={{ width: 145 }} />
      <col style={{ width: 155 }} />
      <col style={{ width: 200 }} />
      <col style={{ width: 200 }} />
      {isStoreOwner && <col style={{ width: 145 }} />}
      <col style={{ width: 170 }} />
    </colgroup>
  );

  const tableColumnCount = isStoreOwner ? 7 : 6;

  return (
    <div
      className="po-matrix-container"
      style={{
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
      {/* Toast Notification */}
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* ── 1. HEADER BAR ── */}
      <div className="so-list-header" style={{ minHeight: 44 }}>
        <div>
          <h1 className="so-list-title">
            <Truck size={22} color="var(--blue-primary, #0f766e)" />
            <span>Điều Chuyển Hàng Liên Chi Nhánh</span>
            <span className="so-list-filter-badge">
              {totalItems} phiếu
            </span>
            {isLoading && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: 'var(--blue-primary, #0f766e)' }}
              />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          {isStoreOwner && (
            <span
              className="so-list-filter-badge"
              style={{
                backgroundColor: '#F0FDFA',
                color: '#0F766E',
                borderColor: '#CCFBF1',
                height: 32,
                fontSize: 12.5,
              }}
              title="Tổng giá trị các phiếu chuyển hiệu lực theo bộ lọc (loại trừ đã hủy và hoàn trả)"
            >
              Tổng giá trị:{' '}
              <strong style={{ marginLeft: 4 }}>{totalTransferValue.toLocaleString('vi-VN')} đ</strong>
            </span>
          )}
          <button
            type="button"
            className="po-btn po-btn-secondary"
            disabled={isExporting}
            onClick={() => void exportExcel()}
            title="Xuất danh sách phiếu chuyển ra tệp Excel"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={() => navigate(isStoreOwner ? `${transferBasePath}/create` : `${transferBasePath}/request`)}
            title="Tạo phiếu chuyển kho mới"
          >
            <Plus size={15} />
            <span>Tạo phiếu chuyển kho</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTER CARD CSS GRID 4 CỘT x 2 DÒNG ── */}
      <div className="so-list-filter" style={{ marginBottom: 8 }}>
        {/* ROW 1 */}
        <div className="so-filter-grid-4">
          {/* Cột 1: Tìm kiếm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 65 }}>
              Tìm kiếm:
            </label>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <input
                type="text"
                className="so-list-filter-input"
                style={{ width: '100%', paddingLeft: 28 }}
                placeholder="Mã phiếu, ghi chú..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const nextSearch = searchInput.trim();
                    if (nextSearch !== appliedSearch) {
                      setPageIndex(1);
                      setAppliedSearch(nextSearch);
                    } else {
                      loadTransfers();
                    }
                  }
                }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
            </div>
          </div>

          {/* Cột 2: Kho gửi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 60 }}>
              Kho gửi:
            </label>
            <select
              className={`so-list-filter-select ${fromBranchId ? 'so-list-filter-select--active' : ''}`}
              style={{ flex: 1, minWidth: 0 }}
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
            >
              <option value="">Tất cả kho gửi</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cột 3: Kho nhận */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 65 }}>
              Kho nhận:
            </label>
            <select
              className={`so-list-filter-select ${toBranchId ? 'so-list-filter-select--active' : ''}`}
              style={{ flex: 1, minWidth: 0 }}
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
            >
              <option value="">Tất cả kho nhận</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cột 4: Trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 68 }}>
              Trạng thái:
            </label>
            <select
              className={`so-list-filter-select ${statusDropdown !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
              style={{ flex: 1, minWidth: 0 }}
              value={statusDropdown}
              onChange={(e) => handleStatusDropdownChange(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Draft">Phiếu tạm</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="InTransit">Đang chuyển</option>
              <option value="Completed">Hoàn tất</option>
              <option value="Completed_Discrepancy">Hoàn tất có chênh lệch</option>
              <option value="Completed_Returned">Đã hoàn trả kho nguồn</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="so-filter-grid-4 so-filter-grid-row2">
          {/* Cột 1: Tình trạng nhận hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 65 }}>
              Nhận hàng:
            </label>
            <select
              className={`so-list-filter-select ${recvStatus !== 'all' ? 'so-list-filter-select--active' : ''}`}
              style={{ flex: 1, minWidth: 0 }}
              value={recvStatus}
              onChange={(e) => setRecvStatus(e.target.value as 'all' | 'match' | 'mismatch')}
            >
              <option value="all">Tất cả tình trạng nhận</option>
              <option value="match">Đủ hàng (Khớp số lượng)</option>
              <option value="mismatch">Có chênh lệch / hư hại</option>
            </select>
          </div>

          {/* Cột 2: Thời gian */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 60 }}>
              Thời gian:
            </label>
            <select
              className={`so-list-filter-select ${timeRange !== 'all' ? 'so-list-filter-select--active' : ''}`}
              style={{ flex: timeRange === 'custom' ? '0 0 95px' : 1, minWidth: 0 }}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'all' | 'this_month' | 'custom')}
            >
              <option value="this_month">Tháng này</option>
              <option value="all">Tất cả thời gian</option>
              <option value="custom">Tùy chọn ngày</option>
            </select>
            {timeRange === 'custom' && (
              <input
                type="date"
                className="so-list-filter-input"
                style={{ flex: 1, minWidth: 105 }}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}
          </div>

          {/* Cột 3: Lọc theo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <label className="so-list-filter-label" style={{ minWidth: 60 }}>
              Lọc theo:
            </label>
            <select
              className="so-list-filter-select"
              style={{ flex: 1, minWidth: 0 }}
              value={dateField}
              onChange={(e) => setDateField(e.target.value as 'transfer' | 'receive')}
            >
              <option value="transfer">Ngày chuyển</option>
              <option value="receive">Ngày nhận</option>
            </select>
          </div>

          {/* Cột 4: Nút Tìm kiếm & Đặt lại */}
          <div
            className="so-list-filter-actions"
            style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}
          >
            <button
              type="button"
              className="so-list-filter-search"
              onClick={() => {
                const nextSearch = searchInput.trim();
                if (nextSearch !== appliedSearch) {
                  setPageIndex(1);
                  setAppliedSearch(nextSearch);
                } else {
                  loadTransfers();
                }
              }}
              title="Tìm kiếm theo tiêu chí đã chọn"
            >
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>
            <button
              type="button"
              className="so-list-filter-reset"
              onClick={handleResetFilters}
              title="Xóa bộ lọc về mặc định"
            >
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. TABLE CARD VỚI FIXED HEADER & SCROLLABLE BODY ── */}
      <div className="so-list-table-card">
        {/* Fixed Head */}
        <div
          ref={headerRef}
          className="so-list-table-head"
          style={{ paddingRight: hasScrollY ? 6 : 0 }}
        >
          <table className="so-list-table" style={{ minWidth: 1050, tableLayout: 'fixed' }}>
            {tableColGroup}
            <thead>
              <tr>
                <th className="so-list-th">Mã Chuyển Hàng</th>
                <th className="so-list-th">Ngày Chuyển</th>
                <th className="so-list-th">Ngày Nhận</th>
                <th className="so-list-th">Kho Gửi</th>
                <th className="so-list-th">Kho Nhận</th>
                {isStoreOwner && (
                  <th className="so-list-th" style={{ textAlign: 'right' }}>
                    Giá Trị Chuyển
                  </th>
                )}
                <th className="so-list-th" style={{ textAlign: 'center' }}>
                  Trạng Thái
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Body */}
        <div
          ref={bodyRef}
          className="so-list-table-body supplier-table-scroll-container"
          onScroll={handleBodyScroll}
        >
          <table className="so-list-table" style={{ minWidth: 1050, tableLayout: 'fixed' }}>
            {tableColGroup}
            <tbody>
              {filteredTransfers.map((t) => {
                const isReceiving = t.status === 'InTransit';
                const isReturned = t.status === 'Completed' && t.completionResult === 'Returned';

                return (
                  <tr
                    key={t.id}
                    className="so-list-row"
                    onClick={() => {
                      setSelectedTransfer(t);
                      setIsDetailModalOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Mã phiếu */}
                    <td className="so-list-td">
                      <span className="so-list-code">{t.transferCode}</span>
                    </td>

                    {/* Ngày chuyển */}
                    <td className="so-list-td" style={{ fontSize: 12.5, color: '#475569' }}>
                      {t.transferDate}
                    </td>

                    {/* Ngày nhận / Nhận hàng button */}
                    <td className="so-list-td" style={{ fontSize: 12.5, color: '#475569' }}>
                      {isReturned ? (
                        <span style={{ fontStyle: 'italic', color: '#6d28d9' }}>(Hoàn trả kho nguồn)</span>
                      ) : t.receiveDate ? (
                        t.receiveDate
                      ) : isReceiving ? (
                        isStoreOwner || user?.branchId === t.toBranchId ? (
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--success"
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 11.5,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${transferBasePath}/${t.id}/receive`);
                            }}
                          >
                            <CheckCircle size={12} />
                            <span>Nhận hàng</span>
                          </button>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#0284c7' }}>(Đang vận chuyển)</span>
                        )
                      ) : t.status === 'Pending' ? (
                        <span style={{ fontStyle: 'italic', color: '#d97706' }}>(Chờ xuất kho)</span>
                      ) : t.status === 'Draft' ? (
                        <span style={{ fontStyle: 'italic', color: '#64748b' }}>(Chưa gửi)</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#dc2626' }}>(Đã hủy)</span>
                      )}
                    </td>

                    {/* Kho gửi */}
                    <td
                      className="so-list-td"
                      style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'normal', lineHeight: 1.35 }}
                      title={t.fromBranchName}
                    >
                      {t.fromBranchName}
                    </td>

                    {/* Kho nhận */}
                    <td
                      className="so-list-td"
                      style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'normal', lineHeight: 1.35 }}
                      title={t.toBranchName}
                    >
                      {t.toBranchName}
                    </td>

                    {/* Giá trị chuyển */}
                    {isStoreOwner && (
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isReturned ? '#94a3b8' : '#0f172a',
                          textDecoration: isReturned ? 'line-through' : 'none',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {t.totalAmount.toLocaleString('vi-VN')} đ
                      </td>
                    )}

                    {/* Trạng thái */}
                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      {renderStatus(t)}
                    </td>
                  </tr>
                );
              })}

              {isLoading && (
                <tr>
                  <td colSpan={tableColumnCount} style={{ padding: 28, textAlign: 'center' }}>
                    <Loader2
                      size={24}
                      className="animate-spin"
                      style={{ margin: '0 auto 8px', color: '#0F766E' }}
                    />
                    <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                      Đang tải danh sách phiếu chuyển...
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredTransfers.length === 0 && (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}
                  >
                    <FileText size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>
                      Không tìm thấy phiếu chuyển hàng nào
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, color: '#64748b' }}>
                      Vui lòng kiểm tra lại điều kiện lọc hoặc tạo phiếu chuyển mới.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 4. FOOTER PHÂN TRANG ── */}
        <TablePagination
          currentPage={pageIndex}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 15, 20, 50]}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(1);
          }}
          itemLabel="phiếu chuyển"
        />
      </div>

      {/* Modal Pop-up Chi tiết phiếu chuyển hàng */}
      <TransferDetailModal
        isOpen={isDetailModalOpen}
        transfer={selectedTransfer}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdateTransfer={(updated) => {
          setTransfers((current) => current.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTransfer(updated);
        }}
      />
    </div>
  );
};

export default TransferListPage;
