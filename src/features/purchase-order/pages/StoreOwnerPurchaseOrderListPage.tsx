import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Grid, Zap, Layers, Loader2 } from 'lucide-react';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { branchApi } from '../api/branchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import type { PurchaseOrderListItem, PoListFilterState, PurchaseOrderStatus } from '../types/po-list.types';
import { DEFAULT_PO_LIST_FILTERS } from '../types/po-list.types';
import { PoListFilterBar } from '../components/po-list/PoListFilterBar';
import { PoListTable } from '../components/po-list/PoListTable';
import { downloadPoInvoicePdf } from '../lib/poInvoicePdf';
import { AdminToast, type ToastState } from '../../admin/components';
import { useBranchScope } from '../../../hooks/useBranchScope';
import {
  formatDeliveryDateGateMessage,
  isDeliveryDateReached,
  toDeliveryDateKey,
} from '../lib/deliveryDateGate';
import '../purchase-order.css';
import '../../supplier/supplier.css';

const formatVnDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatVnDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const KNOWN_PO_STATUSES: PurchaseOrderStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'DISPATCHED',
  'SENT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

/** Giữ nguyên status BE — không gộp SENT/DISPATCHED/PENDING_APPROVAL. */
const normalizePoStatus = (status: string): PurchaseOrderStatus => {
  const s = (status || '').toUpperCase();
  return KNOWN_PO_STATUSES.includes(s as PurchaseOrderStatus)
    ? (s as PurchaseOrderStatus)
    : 'SENT';
};

const mapCreatedSource = (role?: string): string => {
  const r = (role || '').toUpperCase();
  if (r === 'EMPLOYEE' || r === 'STAFF') return 'NV Chi nhánh đề xuất';
  return 'Chủ cửa hàng (PO Matrix)';
};

const RECEIVE_ELIGIBLE_STATUSES: PurchaseOrderStatus[] = [
  'PENDING_APPROVAL',
  'SENT',
  'CONFIRMED',
  'APPROVED',
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
];

const canReceiveOrder = (order: PurchaseOrderListItem): boolean => {
  if (order.activeGoodsReceiptStatus?.toUpperCase() === 'COMPLETED') return true;
  if (order.status === 'CANCELLED' || order.status === 'REJECTED') return false;
  return RECEIVE_ELIGIBLE_STATUSES.includes(order.status) || order.status === 'RECEIVED';
};

const mapFilterStatusToBackend = (status: PoListFilterState['status']): string | undefined => {
  if (status === 'all') return undefined;
  return status;
};

function tokenMatches(value: string | undefined, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = (value || '').toLowerCase();
  return tokens.some((t) => hay.includes(t.trim().toLowerCase()));
}

function hasChipFilters(f: PoListFilterState): boolean {
  return (
    f.poCodes.length > 0 ||
    f.supplierCodes.length > 0 ||
    f.supplierNames.length > 0 ||
    f.branchCodes.length > 0 ||
    f.branchNames.length > 0
  );
}

function resolveUniqueId(
  options: { id: string; code: string; name: string }[],
  codes: string[],
  names: string[]
): string {
  if (!codes.length && !names.length) return 'all';
  const matched = options.filter(
    (o) => tokenMatches(o.code, codes) && tokenMatches(o.name, names)
  );
  return matched.length === 1 ? matched[0].id : 'all';
}

export const StoreOwnerPurchaseOrderListPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isBranchLocked, lockedBranchId, scopedBranchId } = useBranchScope();
  const supplierIdFromUrl = searchParams.get('supplierId') || searchParams.get('supplier') || '';
  const codeFromUrl = searchParams.get('code') || searchParams.get('keyword') || '';

  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [branchOptions, setBranchOptions] = useState<{ id: string; code: string; name: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; code: string; name: string }[]>([]);

  const [appliedFilters, setAppliedFilters] = useState<PoListFilterState>(() => ({
    ...DEFAULT_PO_LIST_FILTERS,
    poCodes: codeFromUrl ? [codeFromUrl] : [],
  }));

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isPrinting, setIsPrinting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const state = location.state as { toastMessage?: string } | null;
    if (!state?.toastMessage) return;
    showToast(state.toastMessage, 'success');
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đọc toast khi vào trang
  }, [location.state]);

  const prevScopedBranchRef = useRef<string>(scopedBranchId);
  useEffect(() => {
    if (prevScopedBranchRef.current === scopedBranchId) return;
    prevScopedBranchRef.current = scopedBranchId;
    setAppliedFilters((prev) => ({
      ...prev,
      branchCodes: [],
      branchNames: [],
      pageIndex: 1,
    }));
    setPageIndex(1);
  }, [scopedBranchId]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const chipActive = hasChipFilters(appliedFilters);
      const supplierId = resolveUniqueId(
        supplierOptions,
        appliedFilters.supplierCodes,
        appliedFilters.supplierNames
      );
      const chipBranchId = resolveUniqueId(
        branchOptions,
        appliedFilters.branchCodes,
        appliedFilters.branchNames
      );
      const branchId = lockedBranchId
        ? lockedBranchId
        : chipBranchId !== 'all'
          ? chipBranchId
          : scopedBranchId || 'all';

      // BE chỉ hỗ trợ 1 keyword — dùng mã PO đầu tiên để thu hẹp server-side
      const keyword =
        appliedFilters.poCodes.length === 1 ? appliedFilters.poCodes[0] : undefined;

      const fetchPageSize = chipActive ? 200 : pageSize;
      const fetchPageIndex = chipActive ? 1 : pageIndex;

      const result = await purchaseOrderApi.getPagedPurchaseOrders({
        branchId,
        supplierId,
        status: mapFilterStatusToBackend(appliedFilters.status),
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        keyword,
        pageIndex: fetchPageIndex,
        pageSize: fetchPageSize,
      });

      let mapped: PurchaseOrderListItem[] = result.items.map((po) => {
        const branchCode = po.branchCode || '';
        const supplierCode = po.supplierCode || '';
        return {
          id: po.id,
          poCode: po.code,
          storeRefCode: branchCode || po.branchName,
          supplierId: po.supplierId,
          supplierCode,
          supplierName: po.supplierName,
          branchId: po.branchId,
          branchCode,
          branchName: po.branchName,
          createdSource: mapCreatedSource(po.createdByRole),
          lastUpdated: formatVnDateTime(po.lastAmendedAtUtc || po.createdAt),
          expectedDelivery: formatVnDate(po.deliveryDate),
          deliveryDate: toDeliveryDateKey(po.deliveryDate),
          itemCount: po.details?.length ?? 0,
          totalAmount: po.totalAmount,
          status: normalizePoStatus(po.status),
          note: po.note,
          revisionNumber: po.revisionNumber ?? 1,
          activeGoodsReceiptId: po.activeGoodsReceiptId ?? null,
          activeGoodsReceiptCode: po.activeGoodsReceiptCode ?? null,
          activeGoodsReceiptStatus: po.activeGoodsReceiptStatus ?? null,
          sourceType: po.sourceType ?? null,
          sourceSupplierReturnId: po.sourceSupplierReturnId ?? null,
          items: (po.details ?? []).map((d) => ({
            id: d.id,
            name: d.productName,
            sku: d.sku,
            unit: d.unit,
            orderedQty: d.orderedQty,
            price: d.unitPrice,
            total: d.lineAmount,
          })),
        };
      });

      if (chipActive) {
        mapped = mapped.filter(
          (o) =>
            tokenMatches(o.poCode, appliedFilters.poCodes) &&
            tokenMatches(o.supplierCode, appliedFilters.supplierCodes) &&
            tokenMatches(o.supplierName, appliedFilters.supplierNames) &&
            tokenMatches(o.branchCode, appliedFilters.branchCodes) &&
            tokenMatches(o.branchName, appliedFilters.branchNames)
        );
        const total = mapped.length;
        const start = (pageIndex - 1) * pageSize;
        setOrders(mapped.slice(start, start + pageSize));
        setTotalCount(total);
      } else {
        setOrders(mapped);
        setTotalCount(result.totalItems);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không tải được danh sách PO.';
      showToast(message, 'error');
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, pageIndex, pageSize, supplierOptions, branchOptions, lockedBranchId, scopedBranchId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let mounted = true;
    const loadCatalog = async () => {
      try {
        const [branchRes, supplierRes] = await Promise.all([
          branchApi.getBranches({ status: 'all', pageIndex: 1, pageSize: 100 }),
          supplierApi.getSuppliers({ pageIndex: 1, pageSize: 100 }),
        ]);
        if (!mounted) return;
        setBranchOptions(
          (branchRes.items ?? []).map((b) => ({
            id: b.id,
            code: b.code || '',
            name: b.name,
          }))
        );
        setSupplierOptions(
          (supplierRes.items ?? []).map((s) => ({
            id: s.id,
            code: s.code || '',
            name: s.name,
          }))
        );
      } catch {
        if (!mounted) return;
      }
    };
    void loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // URL → chip filter (supplierId / code) — chỉ áp dụng 1 lần
  const urlAppliedRef = useRef(false);
  useEffect(() => {
    if (urlAppliedRef.current) return;
    if (!supplierIdFromUrl && !codeFromUrl) {
      urlAppliedRef.current = true;
      return;
    }
    // Chờ catalog nếu cần map supplierId → mã NCC
    if (supplierIdFromUrl && !supplierOptions.length) return;

    const patches: Partial<PoListFilterState> = {};
    if (codeFromUrl) patches.poCodes = [codeFromUrl];

    if (supplierIdFromUrl) {
      const s = supplierOptions.find((x) => x.id === supplierIdFromUrl);
      if (s?.code) patches.supplierCodes = [s.code];
      else if (s?.name) patches.supplierNames = [s.name];
    }

    urlAppliedRef.current = true;
    if (!Object.keys(patches).length) return;

    setAppliedFilters((prev) => ({ ...prev, ...patches }));
    setPageIndex(1);
  }, [supplierIdFromUrl, codeFromUrl, supplierOptions]);

  const handleSearch = (values: PoListFilterState) => {
    setAppliedFilters({ ...values, pageIndex: 1, pageSize });
    setPageIndex(1);
  };

  const handleReset = () => {
    setAppliedFilters({ ...DEFAULT_PO_LIST_FILTERS, pageSize });
    setPageIndex(1);
  };

  /** Nhận hàng từ PO → tạo / tiếp tục confirm / xem GRN (goods-receipts vẫn là sổ chứng từ). */
  const handleReceiveOrder = (order: PurchaseOrderListItem) => {
    if (!canReceiveOrder(order) && !order.activeGoodsReceiptId) {
      showToast(`PO ${order.poCode} chưa đủ điều kiện nhận hàng.`, 'warning');
      return;
    }

    const grnStatus = (order.activeGoodsReceiptStatus || '').toUpperCase();
    const grnId = order.activeGoodsReceiptId;
    const isExchange =
      String(order.sourceType || '').toUpperCase() === 'SUPPLIER_RETURN';

    if (
      grnId &&
      grnStatus === 'COMPLETED' &&
      !(isExchange && order.status === 'PARTIALLY_RECEIVED')
    ) {
      showToast(`PO ${order.poCode} đã nhập kho (${order.activeGoodsReceiptCode}). Mở phiếu nhập.`, 'info');
      navigate(`/store-owner/goods-receipts/${grnId}`);
      return;
    }

    if (!isDeliveryDateReached(order.deliveryDate)) {
      showToast(formatDeliveryDateGateMessage(order.deliveryDate), 'warning');
      return;
    }

    if (grnId && grnStatus === 'DRAFT') {
      showToast(`Tiếp tục xác nhận phiếu nhập nháp ${order.activeGoodsReceiptCode}.`, 'info');
      navigate(`/store-owner/goods-receipts/${grnId}/confirm`);
      return;
    }

    const params = new URLSearchParams({
      po: order.id,
      poCode: order.poCode,
    });
    showToast(`Tạo phiếu nhập kho từ PO ${order.poCode}.`, 'info');
    navigate(`/store-owner/goods-receipts/create?${params.toString()}`);
  };

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
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Danh sách đơn mua hàng</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: '#0f766e' }} />}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/dispatch-hub')}
            className="po-btn po-btn-outline"
            title="Chuyển sang Trung tâm chốt đơn & tách PO theo NCC"
          >
            <Zap size={14} color="#0d9488" />
            <span>Chốt đơn với nhà cung cấp</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/create-matrix')}
            className="po-btn po-btn-secondary"
            title="Mở Bảng lưới đặt hàng ma trận"
          >
            <Grid size={14} />
            <span>Bảng lưới đặt hàng</span>
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <PoListFilterBar
          initialValues={appliedFilters}
          lockBranch={isBranchLocked}
          onSearch={handleSearch}
          onReset={handleReset}
          branches={branchOptions}
          suppliers={supplierOptions}
          poCodeSuggestions={orders.map((o) => o.poCode).filter(Boolean)}
        />
      </div>

      <PoListTable
        orders={orders}
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={(page) => setPageIndex(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(1);
        }}
        onPrintOrder={async (order) => {
          if (isPrinting) return;
          setIsPrinting(true);
          try {
            const fileName = await downloadPoInvoicePdf(order);
            showToast(`Đã tải hóa đơn ${fileName}.`, 'success');
          } catch (err: any) {
            showToast(err?.message || 'Không thể tạo file PDF hóa đơn PO.', 'error');
          } finally {
            setIsPrinting(false);
          }
        }}
        onEditOrder={(order) => {
          if (String(order.sourceType || '').toUpperCase() === 'SUPPLIER_RETURN') {
            showToast(`PO đổi hàng ${order.poCode} không thể chỉnh sửa trên ma trận.`, 'warning');
            return;
          }
          const params = new URLSearchParams();
          if (order.branchId) params.set('branchId', order.branchId);
          if (order.supplierId) params.set('supplier', order.supplierId);
          showToast(
            `Mở ma trận để sửa SL đơn ${order.poCode}${order.revisionNumber && order.revisionNumber > 1 ? ` (Rev ${order.revisionNumber})` : ''}. Chốt lại trước cutoff để cập nhật PO.`,
            'info'
          );
          navigate(`/store-owner/purchase-orders/create-matrix?${params.toString()}`);
        }}
        onReceiveOrder={handleReceiveOrder}
      />
    </div>
  );
};

export default StoreOwnerPurchaseOrderListPage;
