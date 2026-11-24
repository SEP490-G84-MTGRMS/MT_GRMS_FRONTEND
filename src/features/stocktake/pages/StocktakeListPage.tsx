import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC, CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Search,
  RotateCcw,
  Eye,
  Edit3,
  CheckCircle2,
  Package,
  Loader2,
  Truck,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useBranchScope } from '../../../hooks/useBranchScope';
import { AdminToast, type ToastState } from '../../admin/components';
import { TablePagination } from '../../../components/common';
import { branchApi } from '../../purchase-order/api/branchApi';
import { stocktakeApi } from '../api/stocktakeApi';
import {
  SCOPE_TYPE_LABELS,
  type StocktakeListItem,
  type StocktakeFilterState,
  type StocktakeStatus,
} from '../types/stocktake.types';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';
import '../../../styles/so-list-page.css';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export const stocktakeStatusBadge = (status: StocktakeStatus | string) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    case 'PENDING_APPROVAL':
      return { label: 'Chờ Store Owner duyệt', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'APPROVED':
      return { label: 'Đã duyệt kiểm kê', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'REJECTED':
      return { label: 'Đã từ chối', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    case 'NEEDS_RECOUNT':
      return { label: 'Yêu cầu kiểm kê lại', bg: '#fefce8', color: '#a16207', border: '#fde047' };
    default:
      return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

const STATUS_OPTIONS: { value: '' | StocktakeStatus; label: string }[] = [
  { value: '', label: '-- Tất cả trạng thái --' },
  { value: 'PENDING_APPROVAL', label: 'Chờ Store Owner duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt kiểm kê' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'NEEDS_RECOUNT', label: 'Yêu cầu kiểm kê lại' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

type SortField = 'code' | 'branchName' | 'createdAt' | 'lineCount' | 'abnormalLineCount' | 'status';
type SortDirection = 'asc' | 'desc';

export const StocktakeListPage: FC<{ defaultRole?: 'store_owner' | 'employee' }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isStoreOwner, isEmployee, isBranchLocked, scopedBranchId } = useBranchScope(defaultRole);
  const basePath = isEmployee ? '/employee/stocktakes' : '/store-owner/stocktakes';
  const batchPath = isEmployee ? '/employee/batches' : '/store-owner/batches';

  const [draft, setDraft] = useState<StocktakeFilterState>(() => ({
    keyword: '',
    branchId: scopedBranchId,
    status: '',
    pageIndex: 1,
    pageSize: 15,
  }));
  const [applied, setApplied] = useState<StocktakeFilterState>(() => ({
    keyword: '',
    branchId: scopedBranchId,
    status: '',
    pageIndex: 1,
    pageSize: 15,
  }));

  useEffect(() => {
    setDraft((prev) =>
      prev.branchId === scopedBranchId ? prev : { ...prev, branchId: scopedBranchId, pageIndex: 1 }
    );
    setApplied((prev) =>
      prev.branchId === scopedBranchId ? prev : { ...prev, branchId: scopedBranchId, pageIndex: 1 }
    );
  }, [scopedBranchId]);

  const [items, setItems] = useState<StocktakeListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'error') => {
      setToast({ id: Date.now().toString(), message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  useEffect(() => {
    const state = location.state as { toastMessage?: string; highlightId?: string } | null;
    if (state?.toastMessage) {
      showToast(state.toastMessage, 'success');
    }
    if (state?.highlightId) {
      setHighlightId(state.highlightId);
    }
  }, [location.state, showToast]);

  useEffect(() => {
    let mounted = true;
    branchApi
      .getBranches({ status: 'active', pageIndex: 1, pageSize: 100 })
      .then((res) => {
        if (!mounted) return;
        if (res.items?.length) {
          setBranches(
            res.items.map((b) => ({
              id: b.id,
              name: `${b.code || ''} — ${b.name}`.trim(),
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await stocktakeApi.getList(applied);
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch (err: unknown) {
      setItems([]);
      setTotalCount(0);
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const rawMsg =
        e.response?.data?.message || e.message || 'Không thể tải danh sách phiếu kiểm kê.';
      setLoadError(rawMsg);
      showToast(rawMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [applied, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortField) {
        case 'code':
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case 'branchName':
          valA = (a.branchName || '').toLowerCase();
          valB = (b.branchName || '').toLowerCase();
          break;
        case 'createdAt':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
        case 'lineCount':
          valA = a.lineCount;
          valB = b.lineCount;
          break;
        case 'abnormalLineCount':
          valA = a.abnormalLineCount;
          valB = b.abnormalLineCount;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDir]);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };
    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollState);
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [sortedItems, applied.pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const handleApplySearch = () => {
    setApplied({ ...draft, pageIndex: 1 });
  };

  const handleReset = () => {
    const reset: StocktakeFilterState = {
      keyword: '',
      branchId: scopedBranchId,
      status: '',
      pageIndex: 1,
      pageSize: applied.pageSize,
    };
    setDraft(reset);
    setApplied(reset);
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '4%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '10%' }} />
    </colgroup>
  );

  const thStyle: CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '7px 6px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  const tdStyle: CSSProperties = {
    padding: '6px 6px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    fontSize: 12.5,
    color: '#334155',
    boxSizing: 'border-box',
  };

  const sortIcon = (field: SortField) => (
    <ArrowUpDown
      size={11}
      style={{ color: sortField === field ? '#0f766e' : '#94a3b8', flexShrink: 0 }}
    />
  );

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
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Header chuẩn StoreProductManagementPage ── */}
      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <ClipboardList size={22} color="var(--blue-primary, #0f766e)" />
            <span>Danh Sách Phiếu Kiểm Kê Hàng Hóa</span>
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
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(batchPath)}
            title="Xem danh sách tồn kho & lô hàng"
          >
            <Package size={14} />
            <span>Tồn kho &amp; Lô hàng</span>
          </button>
          {isStoreOwner && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => navigate('/store-owner/supplier-returns')}
              title="Theo dõi phiếu trả/đổi hàng đã tạo từ kiểm kê"
            >
              <RotateCcw size={14} />
              <span>Phiếu trả hàng NCC</span>
            </button>
          )}
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={() => navigate(`${basePath}/create`)}
          >
            <Plus size={14} />
            <span>Tạo phiếu kiểm kê</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar 1 card gọn gàng đồng bộ StoreProductFilterBar ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <div className="so-list-filter">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(200px, 1fr) minmax(200px, 1fr) auto',
              gap: '10px 14px',
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            {/* Từ khóa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <label
                htmlFor="stocktake-keyword"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                }}
              >
                Từ khóa:
              </label>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <input
                  id="stocktake-keyword"
                  type="text"
                  className="so-list-filter-input"
                  placeholder="Nhập mã phiếu (KK-...), người tạo..."
                  value={draft.keyword}
                  onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                  style={{
                    width: '100%',
                    height: 32,
                    paddingRight: draft.keyword ? 28 : 10,
                    fontWeight: 500,
                    borderColor: draft.keyword ? '#0d9488' : '#cbd5e1',
                    backgroundColor: draft.keyword ? '#f0fdfa' : '#ffffff',
                  }}
                />
                {draft.keyword && (
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, keyword: '' }))}
                    title="Xóa từ khóa"
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 5,
                      width: 22,
                      height: 22,
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Chi nhánh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <label
                htmlFor="stocktake-branch"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                }}
              >
                Chi nhánh:
              </label>
              <select
                id="stocktake-branch"
                className={`so-list-filter-select ${draft.branchId && !isBranchLocked ? 'so-list-filter-select--active' : ''}`}
                value={draft.branchId}
                disabled={isBranchLocked}
                onChange={(e) => {
                  const nextBranch = e.target.value;
                  setDraft((prev) => ({ ...prev, branchId: nextBranch, pageIndex: 1 }));
                  setApplied((prev) => ({ ...prev, branchId: nextBranch, pageIndex: 1 }));
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 32,
                  backgroundColor: isBranchLocked ? '#f1f5f9' : undefined,
                  cursor: isBranchLocked ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <label
                htmlFor="stocktake-status"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                }}
              >
                Trạng thái:
              </label>
              <select
                id="stocktake-status"
                className={`so-list-filter-select ${draft.status ? 'so-list-filter-select--active' : ''}`}
                value={draft.status}
                onChange={(e) => {
                  const nextStatus = e.target.value as '' | StocktakeStatus;
                  setDraft((prev) => ({ ...prev, status: nextStatus, pageIndex: 1 }));
                  setApplied((prev) => ({ ...prev, status: nextStatus, pageIndex: 1 }));
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 32,
                  cursor: 'pointer',
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'ALL'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Tìm kiếm + Đặt lại */}
            <div
              className="so-list-filter-actions"
              style={{
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: 'max-content',
                flexWrap: 'nowrap',
                gap: 8,
                marginLeft: 0,
              }}
            >
              <button
                type="button"
                className="so-list-filter-search"
                onClick={handleApplySearch}
                style={{ flexShrink: 0 }}
              >
                <Search size={14} />
                <span>Tìm kiếm</span>
              </button>
              <button
                type="button"
                className="so-list-filter-reset"
                onClick={handleReset}
                style={{ flexShrink: 0 }}
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            flexShrink: 0,
            marginBottom: 8,
            padding: '8px 12px',
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 12.5,
          }}
        >
          {loadError}
        </div>
      )}

      {/* ── Table Card đồng bộ StoreProductTable (Sticky header + Sortable + TablePagination) ── */}
      <div className="so-list-table-card so-list-table-card--dense">
        <div
          ref={headerRef}
          className="so-list-table-head"
          style={{ paddingRight: hasScrollY ? 6 : 0 }}
        >
          <table className="so-list-table" style={{ minWidth: 1180, tableLayout: 'fixed' }}>
            {tableColGroup}
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center' }}>STT</th>
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('code')}
                  title="Sắp xếp theo mã phiếu"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Mã phiếu</span>
                    {sortIcon('code')}
                  </div>
                </th>
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('branchName')}
                  title="Sắp xếp theo chi nhánh"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Chi nhánh</span>
                    {sortIcon('branchName')}
                  </div>
                </th>
                <th style={thStyle}>Phạm vi kiểm kê</th>
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('createdAt')}
                  title="Sắp xếp theo ngày kiểm kê"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Ngày kiểm kê</span>
                    {sortIcon('createdAt')}
                  </div>
                </th>
                <th style={thStyle}>Người kiểm kê</th>
                <th
                  style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('lineCount')}
                  title="Sắp xếp theo số dòng"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    <span>Số dòng</span>
                    {sortIcon('lineCount')}
                  </div>
                </th>
                <th
                  style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('abnormalLineCount')}
                  title="Sắp xếp theo số dòng bất thường"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    <span>Bất thường</span>
                    {sortIcon('abnormalLineCount')}
                  </div>
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#dc2626' }}>Lỗi NCC</th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#b45309' }}>Hỏng / Hết hạn</th>
                <th
                  style={{ ...thStyle, textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => handleSort('status')}
                  title="Sắp xếp theo trạng thái"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span>Trạng thái</span>
                    {sortIcon('status')}
                  </div>
                </th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
          </table>
        </div>

        <div ref={bodyRef} className="so-list-table-body" onScroll={handleBodyScroll}>
          <table className="so-list-table" style={{ minWidth: 1180, tableLayout: 'fixed' }}>
            {tableColGroup}
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: '#64748b',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <ClipboardList size={36} color="#cbd5e1" />
                      <span style={{ fontWeight: 600, color: '#475569' }}>
                        Chưa có phiếu kiểm kê hàng hóa nào khớp bộ lọc
                      </span>
                      <button
                        type="button"
                        className="po-btn po-btn-primary"
                        style={{ marginTop: 4 }}
                        onClick={() => navigate(`${basePath}/create`)}
                      >
                        <Plus size={14} />
                        <span>Tạo phiếu kiểm kê</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => {
                  const st = stocktakeStatusBadge(item.status);
                  const canEdit = item.status === 'DRAFT' || item.status === 'NEEDS_RECOUNT';
                  const canApprove = isStoreOwner && item.status === 'PENDING_APPROVAL';
                  const canCreateReturn =
                    isStoreOwner && item.status === 'APPROVED' && item.totalDefectiveQty > 0;
                  const isHighlighted = highlightId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="so-list-row"
                      style={isHighlighted ? { backgroundColor: '#f0fdfa' } : undefined}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>
                        {(applied.pageIndex - 1) * applied.pageSize + idx + 1}
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/${item.id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            maxWidth: '100%',
                          }}
                          title={item.code}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#0f766e',
                              fontSize: 12.5,
                              fontFamily: 'var(--font-mono, monospace)',
                            }}
                          >
                            {item.code}
                          </span>
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#1e293b',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.branchName}
                        >
                          {item.branchName}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#475569',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`${SCOPE_TYPE_LABELS[item.scopeType] || item.scopeType}${item.scopeReference ? ` (${item.scopeReference})` : ''}`}
                        >
                          {SCOPE_TYPE_LABELS[item.scopeType] || item.scopeType}
                          {item.scopeReference ? ` (${item.scopeReference})` : ''}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontWeight: 500,
                            color: '#334155',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.createdByName || 'Nhân viên'}
                        >
                          {item.createdByName || 'Nhân viên'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {fmt(item.lineCount)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.abnormalLineCount > 0 ? '#d97706' : '#64748b',
                        }}
                      >
                        {fmt(item.abnormalLineCount)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.totalDefectiveQty > 0 ? '#dc2626' : '#64748b',
                        }}
                      >
                        {fmt(item.totalDefectiveQty)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.totalDamagedAndExpiredQty > 0 ? '#b45309' : '#64748b',
                        }}
                      >
                        {fmt(item.totalDamagedAndExpiredQty)}
                      </td>
                      <td className="so-list-td--status" style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="so-list-td--actions" style={{ ...tdStyle, textAlign: 'center' }}>
                        <div className="so-list-actions" style={{ justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="so-list-action-btn so-list-action-btn--icon"
                            onClick={() => navigate(`${basePath}/${item.id}`)}
                            title="Xem chi tiết phiếu kiểm kê"
                          >
                            <Eye size={13} />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              className="so-list-action-btn so-list-action-btn--icon"
                              onClick={() => navigate(`${basePath}/${item.id}/edit`)}
                              title="Chỉnh sửa / Kiểm đếm tiếp"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {canApprove && (
                            <button
                              type="button"
                              className="so-list-action-btn so-list-action-btn--success"
                              onClick={() => navigate(`${basePath}/${item.id}`)}
                              title="Xem và duyệt phiếu kiểm kê"
                            >
                              <CheckCircle2 size={13} />
                              <span>Duyệt</span>
                            </button>
                          )}
                          {canCreateReturn && (
                            <button
                              type="button"
                              className="so-list-action-btn"
                              style={{
                                color: '#ea580c',
                                borderColor: '#fed7aa',
                                backgroundColor: '#fff7ed',
                                fontWeight: 700,
                              }}
                              onClick={() => navigate(`${basePath}/${item.id}`)}
                              title="Tạo phiếu trả hàng NCC từ phiếu kiểm kê này"
                            >
                              <Truck size={13} />
                              <span>Trả NCC</span>
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

        {/* ── Footer Phân trang chuẩn đồng bộ StoreProductTable ── */}
        <TablePagination
          currentPage={applied.pageIndex}
          pageSize={applied.pageSize}
          totalItems={totalCount}
          pageSizeOptions={[15, 25, 50]}
          onPageChange={(page) => setApplied((prev) => ({ ...prev, pageIndex: page }))}
          onPageSizeChange={(size) =>
            setApplied((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }))
          }
          itemLabel="phiếu kiểm kê"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StocktakeListPage;
