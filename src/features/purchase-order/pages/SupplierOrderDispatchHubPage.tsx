import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Grid3x3, ListOrdered, Loader2, Truck } from 'lucide-react';
import type {
  SupplierDispatchGroup,
  DispatchScope,
  SplitMatrixBatchResult,
  EmailSendMode,
  DispatchPendingChangeLine,
} from '../types/po.types';
import { DispatchFilterBar, type DispatchTabType } from '../components/dispatch/DispatchFilterBar';
import { SupplierDispatchTable } from '../components/dispatch/SupplierDispatchTable';
import { DispatchConfirmModal } from '../components/dispatch/DispatchConfirmModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { dispatchHubApi } from '../api/dispatchHubApi';
import '../purchase-order.css';

const EMPTY_COUNTS: Record<DispatchTabType, number> = {
  all: 0,
  critical: 0,
  today: 0,
  later: 0,
  completed: 0,
  pending_changes: 0,
};

const PENDING_CHANGE_MSG =
  'Nhà cung cấp có số lượng trên ma trận khác PO đã chốt — nhấn Cập nhật & gửi mail để amend PO và gửi lại email NCC (trước giờ cutoff).';

function formatDeliveryDateVi(isoDate: string): string {
  if (!isoDate) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return isoDate;
}

function flattenPendingChangeLines(list: SupplierDispatchGroup[]): DispatchPendingChangeLine[] {
  const rows: DispatchPendingChangeLine[] = [];
  for (const s of list) {
    for (const line of s.pendingChanges || []) {
      rows.push({
        ...line,
        updateStatus: line.updateStatus === 'LOCKED_CUTOFF' ? 'LOCKED_CUTOFF' : 'EDITABLE',
        supplierId: s.id,
        supplierCode: s.code,
        supplierName: s.name,
      });
    }
  }
  return rows.sort((a, b) => {
    const aLocked = a.updateStatus === 'LOCKED_CUTOFF' ? 1 : 0;
    const bLocked = b.updateStatus === 'LOCKED_CUTOFF' ? 1 : 0;
    if (aLocked !== bLocked) return aLocked - bLocked;
    const bySupplier = (a.supplierName || '').localeCompare(b.supplierName || '', 'vi');
    if (bySupplier !== 0) return bySupplier;
    const byDate = (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
    if (byDate !== 0) return byDate;
    return (a.productName || '').localeCompare(b.productName || '', 'vi');
  });
}

function getMondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 + (day - 1)) % 7;
  d.setDate(d.getDate() - diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const SupplierOrderDispatchHubPage: FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierDispatchGroup[]>([]);
  const [tabCounts, setTabCounts] = useState(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const [activeTab, setActiveTab] = useState<DispatchTabType>('all');
  const [keyword, setKeyword] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingDetailsOpen, setPendingDetailsOpen] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    supplier: SupplierDispatchGroup | null;
    supplierEmail?: string;
    scope: DispatchScope;
    weekStartDate: string;
    previewData: SplitMatrixBatchResult | null;
    isLoadingPreview: boolean;
    previewError: string | null;
    batchResult: SplitMatrixBatchResult | null;
    note: string;
    emailSendMode: EmailSendMode;
    scheduledSendAt: string;
    ccEmails: string[];
  }>({
    isOpen: false,
    supplier: null,
    supplierEmail: undefined,
    scope: 'NEAREST',
    weekStartDate: getMondayOfThisWeek(),
    previewData: null,
    isLoadingPreview: false,
    previewError: null,
    batchResult: null,
    note: '',
    emailSendMode: 'SEND_NOW',
    scheduledSendAt: '',
    ccEmails: [],
  });

  const fetchHub = useCallback(async () => {
    setIsLoading(true);
    try {
      // Luôn lấy full list (theo keyword) — urgency / pending_changes lọc client-side
      const hub = await dispatchHubApi.getSupplierHub({
        keyword: keyword.trim() || undefined,
      });
      const list = hub.suppliers || [];
      const pendingCount = list.filter((s) => s.hasPendingChanges && s.status !== 'dispatched').length;
      setSuppliers(list);
      setTabCounts({
        all: hub.counts.all,
        critical: hub.counts.critical,
        today: hub.counts.today,
        later: hub.counts.later,
        completed: hub.counts.completed,
        pending_changes: pendingCount,
      });
    } catch (err: any) {
      setSuppliers([]);
      setTabCounts(EMPTY_COUNTS);
      showToast(err.message || 'Không tải được hub chốt đơn.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchHub();
    }, keyword ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchHub, keyword]);

  const loadPreview = useCallback(
    async (supplierId: string, targetScope: DispatchScope, weekMonday?: string) => {
      setModalState((prev) => ({
        ...prev,
        isLoadingPreview: true,
        previewError: null,
      }));

      try {
        const preview = await dispatchHubApi.previewSupplierSplit(
          supplierId,
          targetScope,
          targetScope === 'WEEK' ? weekMonday : undefined
        );
        setModalState((prev) =>
          prev.isOpen && prev.supplier?.id === supplierId
            ? { ...prev, previewData: preview, isLoadingPreview: false }
            : prev
        );
      } catch (err: any) {
        setModalState((prev) =>
          prev.isOpen && prev.supplier?.id === supplierId
            ? {
                ...prev,
                previewData: null,
                previewError: err?.message || 'Không thể xem trước dữ liệu chốt PO từ máy chủ.',
                isLoadingPreview: false,
              }
            : prev
        );
      }
    },
    []
  );

  const openConfirmForSupplier = async (sup: SupplierDispatchGroup, initialScope: DispatchScope = 'NEAREST') => {
    const monday = getMondayOfThisWeek();
    setModalState({
      isOpen: true,
      supplier: sup,
      supplierEmail: undefined,
      scope: initialScope,
      weekStartDate: monday,
      previewData: null,
      isLoadingPreview: true,
      previewError: null,
      batchResult: null,
      note: '',
      emailSendMode: 'SEND_NOW',
      scheduledSendAt: '',
      ccEmails: [],
    });

    void dispatchHubApi
      .getSupplierDetail(sup.id)
      .then((d) => setModalState((prev) => (prev.isOpen ? { ...prev, supplierEmail: d.email } : prev)))
      .catch(() => undefined);

    await loadPreview(sup.id, initialScope, monday);
  };

  const handleScopeChange = async (newScope: DispatchScope) => {
    const supplier = modalState.supplier;
    if (!supplier) return;
    setModalState((prev) => ({
      ...prev,
      scope: newScope,
      previewData: null,
      batchResult: null,
    }));
    await loadPreview(supplier.id, newScope, modalState.weekStartDate);
  };

  const handleWeekChange = async (newMonday: string) => {
    const supplier = modalState.supplier;
    if (!supplier) return;
    setModalState((prev) => ({
      ...prev,
      weekStartDate: newMonday,
      previewData: null,
      batchResult: null,
    }));
    await loadPreview(supplier.id, 'WEEK', newMonday);
  };

  const handleRetryPreview = () => {
    if (modalState.supplier) {
      void loadPreview(
        modalState.supplier.id,
        modalState.scope,
        modalState.scope === 'WEEK' ? modalState.weekStartDate : undefined
      );
    }
  };

  const handleConfirmDispatch = async () => {
    if (!modalState.supplier) return;
    setIsDispatching(true);
    try {
      const result = await dispatchHubApi.dispatchSupplierByScope(
        modalState.supplier.id,
        modalState.scope,
        modalState.scope === 'WEEK' ? modalState.weekStartDate : undefined,
        modalState.note.trim() || undefined,
        {
          emailSendMode: modalState.emailSendMode,
          scheduledSendAt: modalState.emailSendMode === 'SCHEDULED_SEND' ? modalState.scheduledSendAt : undefined,
          ccEmails: modalState.ccEmails,
        }
      );
      setModalState((prev) => ({ ...prev, batchResult: result }));
      const created = result.successCount || 0;
      const amended = result.amendedCount || 0;
      const noChanges = result.noChangesCount || 0;
      if (created > 0 && amended > 0) {
        showToast(`Đã tạo ${created} PO mới và cập nhật ${amended} PO thành công.`, 'success');
      } else if (amended > 0) {
        showToast(`Đã cập nhật PO thành công (${amended} đơn).`, 'success');
      } else if (created > 0) {
        showToast(`Đã chốt thành công ${created}/${result.totalGroups} group PO.`, 'success');
      } else if (noChanges > 0) {
        showToast('PO không đổi số lượng — đã giữ nguyên và gửi lại email (nếu có).', 'success');
      } else {
        showToast('Không có PO nào được tạo/cập nhật trong phạm vi đã chọn.', 'warning');
      }
      await fetchHub();
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message;
      showToast(apiMsg || 'Không thể chốt đơn mua hàng.', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    switch (activeTab) {
      case 'pending_changes':
        return suppliers.filter((s) => s.hasPendingChanges && s.status !== 'dispatched');
      case 'critical':
        return suppliers.filter((s) => s.status !== 'dispatched' && s.urgency === 'critical' && (s.branchesWithQty ?? 0) > 0);
      case 'today':
        return suppliers.filter(
          (s) =>
            s.status !== 'dispatched' &&
            (s.urgency === 'today' || s.urgency === 'critical') &&
            (s.branchesWithQty ?? 0) > 0
        );
      case 'later':
        return suppliers.filter((s) => s.status !== 'dispatched' && s.urgency === 'later' && (s.branchesWithQty ?? 0) > 0);
      case 'completed':
        return suppliers.filter((s) => s.status === 'dispatched');
      default:
        return suppliers;
    }
  }, [suppliers, activeTab]);

  const pagedSuppliers = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, pageIndex, pageSize]);

  const pendingLines = useMemo(() => flattenPendingChangeLines(suppliers), [suppliers]);
  const pendingSupplierCount = tabCounts.pending_changes;

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

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Truck size={22} color="var(--blue-primary, #0f766e)" />
            <span>Chốt đơn với nhà cung cấp</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <Link to="/store-owner/purchase-orders/create-matrix" className="po-btn po-btn-secondary">
            <Grid3x3 size={14} />
            <span>Ma trận đặt hàng</span>
          </Link>
          <Link to="/store-owner/purchase-orders" className="po-btn po-btn-secondary">
            <ListOrdered size={14} />
            <span>Danh sách PO</span>
          </Link>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <DispatchFilterBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setPageIndex(1);
          }}
          counts={tabCounts}
          keyword={keyword}
          onKeywordChange={(kw) => {
            setKeyword(kw);
            setPageIndex(1);
          }}
          onResetFilters={() => {
            setActiveTab('all');
            setKeyword('');
            setPageIndex(1);
          }}
          pendingChangeCount={pendingSupplierCount}
          pendingChangeLineCount={pendingLines.length}
          onViewPendingChanges={() => setPendingDetailsOpen(true)}
        />
      </div>

      {pendingDetailsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPendingDetailsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1100,
              maxHeight: '85vh',
              background: '#fff',
              borderRadius: 12,
              border: pendingSupplierCount > 0 ? '1px solid #fdba74' : '1px solid #86efac',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: pendingSupplierCount > 0 ? '#9a3412' : '#166534',
                marginBottom: 6,
                flexShrink: 0,
              }}
            >
              {pendingSupplierCount > 0
                ? `Có ${pendingSupplierCount} NCC cần cập nhật số lượng${
                    pendingLines.length > 0 ? ` · ${pendingLines.length} dòng thay đổi` : ''
                  }`
                : 'Không có NCC nào cần cập nhật số lượng'}
            </div>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 13,
                lineHeight: 1.5,
                color: pendingSupplierCount > 0 ? '#7c2d12' : '#166534',
                flexShrink: 0,
              }}
            >
              {pendingSupplierCount > 0
                ? PENDING_CHANGE_MSG
                : 'Số lượng trên ma trận đang khớp với PO đã chốt.'}
            </p>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                border: pendingSupplierCount > 0 ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              {pendingLines.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    fontSize: 13,
                    color: pendingSupplierCount > 0 ? '#9a3412' : '#166534',
                    textAlign: 'center',
                  }}
                >
                  {pendingSupplierCount > 0
                    ? 'Có NCC cần cập nhật nhưng chưa tải được chi tiết dòng.'
                    : 'Tất cả NCC đã khớp SL với PO.'}
                </div>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12.5,
                    minWidth: 980,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: '#fff7ed',
                        color: '#9a3412',
                        textAlign: 'left',
                        zIndex: 1,
                      }}
                    >
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74' }}>Tên NCC</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                        Mã NCC
                      </th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                        Mã PO
                      </th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74' }}>Sản phẩm</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                        Ngày giao
                      </th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                        Trạng thái
                      </th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #fdba74' }}>Cửa hàng</th>
                      <th
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #fdba74',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        SL PO
                      </th>
                      <th
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #fdba74',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        SL ma trận
                      </th>
                      <th
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid #fdba74',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Chênh lệch
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLines.map((line, idx) => {
                      const delta = line.draftQty - line.committedQty;
                      const deltaColor = delta > 0 ? '#15803d' : delta < 0 ? '#b91c1c' : '#64748b';
                      const isLocked = line.updateStatus === 'LOCKED_CUTOFF';
                      return (
                        <tr
                          key={`${line.supplierId}-${line.branchId || ''}-${line.productId}-${line.deliveryDate}-${idx}`}
                          style={{
                            borderBottom: '1px solid #ffedd5',
                            background: isLocked
                              ? '#f8fafc'
                              : idx % 2 === 0
                                ? '#fff'
                                : '#fffbeb',
                            opacity: isLocked ? 0.85 : 1,
                          }}
                        >
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>
                            {line.supplierName || '—'}
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#475569',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {line.supplierCode || '—'}
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#0369a1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {line.poCode || '—'}
                          </td>
                          <td style={{ padding: '7px 10px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{line.productName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {line.sku}
                              {line.unit ? ` · ${line.unit}` : ''}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              whiteSpace: 'nowrap',
                              fontWeight: 700,
                              color: '#9a3412',
                            }}
                          >
                            {formatDeliveryDateVi(line.deliveryDate)}
                          </td>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 11.5,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 4,
                                color: isLocked ? '#64748b' : '#c2410c',
                                background: isLocked ? '#e2e8f0' : '#ffedd5',
                                border: isLocked ? '1px solid #cbd5e1' : '1px solid #fdba74',
                              }}
                              title={
                                isLocked
                                  ? 'Đã qua giờ cutoff — không amend/gửi lại PO cho ngày này'
                                  : 'Còn trước cutoff — có thể Cập nhật & gửi mail'
                              }
                            >
                              {isLocked ? 'Đã qua cutoff' : 'Còn cập nhật được'}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px', color: '#334155' }}>
                            {line.branchName || line.branchCode || '—'}
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          >
                            {line.committedQty.toLocaleString('vi-VN')}
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#c2410c',
                            }}
                          >
                            {line.draftQty.toLocaleString('vi-VN')}
                          </td>
                          <td
                            style={{
                              padding: '7px 10px',
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              color: deltaColor,
                            }}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="po-btn po-btn-secondary"
                style={{ height: 34, padding: '0 14px', fontSize: 13 }}
                onClick={() => setPendingDetailsOpen(false)}
              >
                Đóng
              </button>
              {pendingSupplierCount > 0 && (
                <button
                  type="button"
                  className="po-btn"
                  style={{
                    height: 34,
                    padding: '0 14px',
                    fontSize: 13,
                    background: '#ea580c',
                    borderColor: '#ea580c',
                    color: '#fff',
                  }}
                  onClick={() => {
                    setActiveTab('pending_changes');
                    setPageIndex(1);
                    setPendingDetailsOpen(false);
                  }}
                >
                  Lọc NCC cần cập nhật
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SupplierDispatchTable
        suppliers={pagedSuppliers}
        totalCount={filteredSuppliers.length}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(1);
        }}
        onOpenDrawer={(supplierId) => {
          navigate(`/store-owner/purchase-orders/dispatch-hub/${supplierId}`);
        }}
        onDispatchSingle={(sup) => {
          // Có lệch SL còn amend được → mở rộng 14 ngày để cover mọi ngày mở (vd. 11/11 đã khóa vẫn amend được 12/11)
          const scope =
            sup.hasPendingChanges && sup.status !== 'dispatched' ? 'DAYS_14' : 'NEAREST';
          void openConfirmForSupplier(sup, scope);
        }}
      />

      <DispatchConfirmModal
        isOpen={modalState.isOpen}
        supplier={modalState.supplier}
        supplierEmail={modalState.supplierEmail}
        scope={modalState.scope}
        onScopeChange={(s) => {
          void handleScopeChange(s);
        }}
        weekStartDate={modalState.weekStartDate}
        onWeekChange={(w) => {
          void handleWeekChange(w);
        }}
        previewData={modalState.previewData}
        isLoadingPreview={modalState.isLoadingPreview}
        previewError={modalState.previewError}
        onRetryPreview={handleRetryPreview}
        batchResult={modalState.batchResult}
        note={modalState.note}
        onNoteChange={(n) => setModalState((prev) => ({ ...prev, note: n }))}
        emailSendMode={modalState.emailSendMode}
        onEmailSendModeChange={(m) => setModalState((prev) => ({ ...prev, emailSendMode: m }))}
        scheduledSendAt={modalState.scheduledSendAt}
        onScheduledSendAtChange={(v) => setModalState((prev) => ({ ...prev, scheduledSendAt: v }))}
        ccEmails={modalState.ccEmails}
        onCcEmailsChange={(emails) => setModalState((prev) => ({ ...prev, ccEmails: emails }))}
        isSubmitting={isDispatching}
        onClose={() =>
          setModalState({
            isOpen: false,
            supplier: null,
            supplierEmail: undefined,
            scope: 'NEAREST',
            weekStartDate: getMondayOfThisWeek(),
            previewData: null,
            isLoadingPreview: false,
            previewError: null,
            batchResult: null,
            note: '',
            emailSendMode: 'SEND_NOW',
            scheduledSendAt: '',
            ccEmails: [],
          })
        }
        onConfirm={() => {
          void handleConfirmDispatch();
        }}
      />
    </div>
  );
};

export default SupplierOrderDispatchHubPage;
