import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Truck,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import { branchApi } from '../../purchase-order/api/branchApi';
import { stocktakeApi } from '../api/stocktakeApi';
import {
  SCOPE_TYPE_LABELS,
  type StocktakeListItem,
  type StocktakeFilterState,
  type StocktakeStatus,
} from '../types/stocktake.types';
import '../../purchase-order/purchase-order.css';
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

const STATUS_TABS: { value: '' | StocktakeStatus; label: string }[] = [
  { value: '', label: 'Tất cả phiếu' },
  { value: 'PENDING_APPROVAL', label: 'Chờ Store Owner duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt kiểm kê' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'NEEDS_RECOUNT', label: 'Yêu cầu kiểm kê lại' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

export const StocktakeListPage: FC<{ defaultRole?: 'store_owner' | 'employee' }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner =
    defaultRole === 'store_owner' &&
    (userRole === 'STORE_OWNER' || userRole === 'ADMIN' || !userRole);
  const basePath = defaultRole === 'employee' ? '/employee/stocktakes' : '/store-owner/stocktakes';
  const batchPath = defaultRole === 'employee' ? '/employee/batches' : '/store-owner/batches';

  const lockedBranch = !isStoreOwner && userBranchId ? userBranchId : '';

  const [draft, setDraft] = useState<StocktakeFilterState>({
    keyword: '',
    branchId: lockedBranch,
    status: '',
    pageIndex: 1,
    pageSize: 15,
  });
  const [applied, setApplied] = useState<StocktakeFilterState>({
    keyword: '',
    branchId: lockedBranch,
    status: '',
    pageIndex: 1,
    pageSize: 15,
  });

  const [items, setItems] = useState<StocktakeListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

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

  const handleSelectTab = (status: '' | StocktakeStatus) => {
    setDraft((prev) => ({ ...prev, status, pageIndex: 1 }));
    setApplied((prev) => ({ ...prev, status, pageIndex: 1 }));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / applied.pageSize));
  const startItem = totalCount === 0 ? 0 : (applied.pageIndex - 1) * applied.pageSize + 1;
  const endItem = Math.min(applied.pageIndex * applied.pageSize, totalCount);

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <ClipboardList size={22} color="var(--blue-primary, #0f766e)" />
            <span>Danh sách Phiếu Kiểm Kê Hàng Hóa</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: '#0f766e' }} />
            )}
          </h1>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Theo dõi toàn bộ các đợt kiểm kê tại chi nhánh, phê duyệt chênh lệch/xuất hủy và lập phiếu trả hàng NCC
          </div>
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(batchPath)}
          >
            <Package size={14} />
            <span>Tồn kho &amp; Lô FEFO</span>
          </button>
          {isStoreOwner && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() => navigate('/store-owner/supplier-returns')}
            >
              <RotateCcw size={14} />
              <span>Phiếu trả hàng NCC</span>
            </button>
          )}
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{ backgroundColor: '#0f766e' }}
            onClick={() => navigate(`${basePath}/create`)}
          >
            <Plus size={14} />
            <span>+ Tạo Phiếu Kiểm Kê</span>
          </button>
        </div>
      </div>

      {/* Status Tabs + Filter Bar */}
      <div
        style={{
          flexShrink: 0,
          marginBottom: 10,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Quick Status Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 8,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const active = applied.status === tab.value;
            return (
              <button
                key={tab.value || 'ALL'}
                type="button"
                onClick={() => handleSelectTab(tab.value)}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                  border: active ? '1px solid #0f766e' : '1px solid #e2e8f0',
                  backgroundColor: active ? '#f0fdfa' : '#ffffff',
                  color: active ? '#0f766e' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Branch Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
            <Search
              size={14}
              color="#64748b"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu kiểm kê (KK-...), người tạo..."
              value={draft.keyword}
              onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && setApplied({ ...draft, pageIndex: 1 })}
              style={{
                width: '100%',
                height: 34,
                padding: '0 10px 0 32px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={draft.branchId}
            disabled={Boolean(lockedBranch)}
            onChange={(e) => setDraft((prev) => ({ ...prev, branchId: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: lockedBranch ? '#f1f5f9' : '#ffffff',
            }}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{ height: 34, backgroundColor: '#0f766e' }}
            onClick={() => setApplied({ ...draft, pageIndex: 1 })}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 34 }}
            onClick={() => {
              const reset: StocktakeFilterState = {
                keyword: '',
                branchId: lockedBranch,
                status: '',
                pageIndex: 1,
                pageSize: 15,
              };
              setDraft(reset);
              setApplied(reset);
            }}
          >
            Đặt lại
          </button>
        </div>
      </div>

      {loadError && (
        <div
          style={{
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

      {/* Table */}
      <div className="so-list-table-card">
        <div className="so-list-table-body" style={{ overflowX: 'auto' }}>
          <table className="so-list-table" style={{ minWidth: 1180, width: '100%' }}>
            <thead>
              <tr>
                <th className="so-list-th" style={{ width: 45, textAlign: 'center' }}>
                  #
                </th>
                <th className="so-list-th">Mã phiếu kiểm kê</th>
                <th className="so-list-th">Chi nhánh</th>
                <th className="so-list-th">Phạm vi kiểm kê</th>
                <th className="so-list-th">Ngày kiểm kê</th>
                <th className="so-list-th">Người kiểm kê</th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>
                  Số dòng
                </th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>
                  Dòng bất thường
                </th>
                <th className="so-list-th" style={{ textAlign: 'right', color: '#dc2626' }}>
                  SL Lỗi NCC
                </th>
                <th className="so-list-th" style={{ textAlign: 'right', color: '#b45309' }}>
                  Hỏng / Hết hạn
                </th>
                <th className="so-list-th" style={{ textAlign: 'center' }}>
                  Trạng thái
                </th>
                <th className="so-list-th" style={{ textAlign: 'right' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
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
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        Nhân viên chi nhánh hoặc chủ cửa hàng có thể bấm &quot;+ Tạo Phiếu Kiểm Kê&quot; hoặc chọn lô trên màn hình FEFO để kiểm kê.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const st = stocktakeStatusBadge(item.status);
                  const canEdit =
                    item.status === 'DRAFT' || item.status === 'NEEDS_RECOUNT';
                  const canApprove =
                    isStoreOwner && item.status === 'PENDING_APPROVAL';
                  const canCreateReturn =
                    isStoreOwner && item.status === 'APPROVED' && item.totalDefectiveQty > 0;
                  const isHighlighted = highlightId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="so-list-row"
                      style={isHighlighted ? { backgroundColor: '#f0fdfa' } : undefined}
                    >
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#64748b' }}>
                        {(applied.pageIndex - 1) * applied.pageSize + idx + 1}
                      </td>
                      <td className="so-list-td">
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/${item.id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span className="so-list-code">{item.code}</span>
                        </button>
                      </td>
                      <td className="so-list-td">
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {item.branchName}
                        </span>
                      </td>
                      <td className="so-list-td">
                        <span style={{ fontSize: 12.5, color: '#475569' }}>
                          {SCOPE_TYPE_LABELS[item.scopeType] || item.scopeType}
                          {item.scopeReference ? ` (${item.scopeReference})` : ''}
                        </span>
                      </td>
                      <td className="so-list-td" style={{ fontSize: 12, color: '#475569' }}>
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="so-list-td" style={{ fontWeight: 500, color: '#334155' }}>
                        {item.createdByName || 'Nhân viên'}
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(item.lineCount)}
                      </td>
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.abnormalLineCount > 0 ? '#d97706' : '#64748b',
                        }}
                      >
                        {fmt(item.abnormalLineCount)}
                      </td>
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.totalDefectiveQty > 0 ? '#dc2626' : '#64748b',
                        }}
                      >
                        {fmt(item.totalDefectiveQty)}
                      </td>
                      <td
                        className="so-list-td"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.totalDamagedAndExpiredQty > 0 ? '#b45309' : '#64748b',
                        }}
                      >
                        {fmt(item.totalDamagedAndExpiredQty)}
                      </td>
                      <td className="so-list-td" style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
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
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'right' }}>
                        <div className="so-list-actions">
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

        {/* Pager */}
        <div className="so-list-pager">
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> phiếu kiểm kê
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="so-list-pager-btn"
              disabled={applied.pageIndex <= 1}
              onClick={() =>
                setApplied((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
              }
            >
              <ChevronLeft size={13} />
              <span>Trước</span>
            </button>
            <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
              Trang {applied.pageIndex} / {totalPages}
            </span>
            <button
              type="button"
              className="so-list-pager-btn"
              disabled={applied.pageIndex >= totalPages}
              onClick={() =>
                setApplied((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))
              }
            >
              <span>Sau</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StocktakeListPage;
