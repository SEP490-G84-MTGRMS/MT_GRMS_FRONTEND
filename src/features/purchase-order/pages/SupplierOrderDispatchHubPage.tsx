import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Grid3x3, ListOrdered, Loader2, Truck } from 'lucide-react';
import type {
  SupplierDispatchGroup,
  DispatchScope,
  SplitMatrixBatchResult,
  EmailSendMode,
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
};

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
      const hub = await dispatchHubApi.getSupplierHub({
        keyword: keyword.trim() || undefined,
        urgency: activeTab,
      });
      setSuppliers(hub.suppliers);
      setTabCounts({
        all: hub.counts.all,
        critical: hub.counts.critical,
        today: hub.counts.today,
        later: hub.counts.later,
        completed: hub.counts.completed,
      });
    } catch (err: any) {
      setSuppliers([]);
      setTabCounts(EMPTY_COUNTS);
      showToast(err.message || 'Không tải được hub chốt đơn.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [keyword, activeTab]);

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
      if (result.successCount > 0) {
        showToast(`Đã chốt thành công ${result.successCount}/${result.totalGroups} group PO.`, 'success');
      } else {
        showToast('Không có PO nào được tạo thành công.', 'warning');
      }
      await fetchHub();
    } catch (err: any) {
      showToast(err.message || 'Không thể chốt đơn mua hàng.', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const pagedSuppliers = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return suppliers.slice(start, start + pageSize);
  }, [suppliers, pageIndex, pageSize]);

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
        />
      </div>

      <SupplierDispatchTable
        suppliers={pagedSuppliers}
        totalCount={suppliers.length}
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
          void openConfirmForSupplier(sup, 'NEAREST');
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
