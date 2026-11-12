import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, Zap, Layers, Loader2 } from 'lucide-react';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import type { PurchaseOrderListItem, PoListFilterState, PurchaseOrderStatus } from '../types/po-list.types';
import { PoListFilterBar } from '../components/po-list/PoListFilterBar';
import { PoListTable } from '../components/po-list/PoListTable';
import { PoDetailDrawer } from '../components/po-list/PoDetailDrawer';
import { AdminToast, type ToastState } from '../../admin/components';
import {
  formatDeliveryDateGateMessage,
  isDeliveryDateReached,
  toDeliveryDateKey,
} from '../lib/deliveryDateGate';
import '../purchase-order.css';
import '../../supplier/supplier.css';

const DEFAULT_FILTERS: PoListFilterState = {
  branchId: 'all',
  supplierId: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  keyword: '',
  pageIndex: 1,
  pageSize: 10,
};

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

/** Map backend PO status → badge status trên UI list. */
const mapBackendStatus = (status: string): PurchaseOrderStatus => {
  switch ((status || '').toUpperCase()) {
    case 'PENDING_APPROVAL':
    case 'DISPATCHED':
    case 'SENT':
      return 'SENT';
    case 'APPROVED':
    case 'CONFIRMED':
    case 'FINALIZED':
      return 'CONFIRMED';
    case 'PARTIALLY_RECEIVED':
      return 'PARTIALLY_RECEIVED';
    case 'RECEIVED':
    case 'COMPLETED':
      return 'RECEIVED';
    case 'CANCELLED':
    case 'REJECTED':
      return 'CANCELLED';
    default:
      return 'SENT';
  }
};

const RECEIVE_ELIGIBLE_STATUSES: PurchaseOrderStatus[] = [
  'SENT',
  'CONFIRMED',
  'APPROVED',
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
];

const canReceiveOrder = (order: PurchaseOrderListItem): boolean => {
  if (order.activeGoodsReceiptStatus?.toUpperCase() === 'COMPLETED') return true; // xem phiếu
  if (order.status === 'CANCELLED' || order.status === 'REJECTED') return false;
  // DRAFT đã tạo: cho mở lại; tạo mới / hoàn tất: phải đến ngày giao (check ở handle + table)
  return RECEIVE_ELIGIBLE_STATUSES.includes(order.status) || order.status === 'RECEIVED';
};

/** Map UI filter status → backend status (nếu có). */
const mapFilterStatusToBackend = (status: PoListFilterState['status']): string | undefined => {
  if (status === 'all') return undefined;
  if (status === 'SENT') return 'PENDING_APPROVAL';
  if (status === 'CONFIRMED') return 'APPROVED';
  return status;
};

export const StoreOwnerPurchaseOrderListPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierIdFromUrl = searchParams.get('supplierId') || '';

  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filterInputs, setFilterInputs] = useState<PoListFilterState>(() => ({
    ...DEFAULT_FILTERS,
    supplierId: supplierIdFromUrl,
  }));
  const [appliedFilters, setAppliedFilters] = useState<PoListFilterState>(() => ({
    ...DEFAULT_FILTERS,
    supplierId: supplierIdFromUrl,
  }));

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderListItem | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await purchaseOrderApi.getPagedPurchaseOrders({
        branchId: appliedFilters.branchId,
        supplierId: appliedFilters.supplierId,
        status: mapFilterStatusToBackend(appliedFilters.status),
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        pageIndex,
        pageSize,
      });

      const keyword = appliedFilters.keyword.trim().toLowerCase();
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
          createdSource: 'Chủ cửa hàng (Dispatch Hub)',
          lastUpdated: formatVnDateTime(po.lastAmendedAtUtc || po.createdAt),
          expectedDelivery: formatVnDate(po.deliveryDate),
          deliveryDate: toDeliveryDateKey(po.deliveryDate),
          itemCount: po.details?.length ?? 0,
          totalAmount: po.totalAmount,
          status: mapBackendStatus(po.status),
          note: po.note,
          revisionNumber: po.revisionNumber ?? 1,
          activeGoodsReceiptId: po.activeGoodsReceiptId ?? null,
          activeGoodsReceiptCode: po.activeGoodsReceiptCode ?? null,
          activeGoodsReceiptStatus: po.activeGoodsReceiptStatus ?? null,
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

      if (keyword) {
        mapped = mapped.filter((o) => {
          const matchCode = o.poCode.toLowerCase().includes(keyword);
          const matchStore = o.storeRefCode.toLowerCase().includes(keyword);
          const matchSup =
            o.supplierName.toLowerCase().includes(keyword) || o.supplierCode.toLowerCase().includes(keyword);
          const matchBranch =
            o.branchName.toLowerCase().includes(keyword) || o.branchCode.toLowerCase().includes(keyword);
          const matchItems = o.items.some(
            (it) => it.name.toLowerCase().includes(keyword) || it.sku.toLowerCase().includes(keyword)
          );
          return matchCode || matchStore || matchSup || matchBranch || matchItems;
        });
      }

      setOrders(mapped);
      setTotalCount(keyword ? mapped.length : result.totalItems);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không tải được danh sách PO.';
      showToast(message, 'error');
      setOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, pageIndex, pageSize]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const supplierOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    orders.forEach((o) => {
      if (!map.has(o.supplierId)) {
        map.set(o.supplierId, { id: o.supplierId, code: o.supplierCode, name: o.supplierName });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    orders.forEach((o) => {
      if (!map.has(o.branchId)) {
        map.set(o.branchId, { id: o.branchId, code: o.branchCode, name: o.branchName });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const handleSearch = () => {
    setAppliedFilters(filterInputs);
    setPageIndex(1);
  };

  const handleReset = () => {
    setFilterInputs(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
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

    if (grnId && grnStatus === 'COMPLETED') {
      showToast(`PO ${order.poCode} đã nhập kho (${order.activeGoodsReceiptCode}). Mở phiếu nhập.`, 'info');
      navigate(`/store-owner/goods-receipts/${grnId}`);
      return;
    }

    // Rule: chỉ nhập hàng từ ngày giao trở đi (xem phiếu COMPLETED vẫn được)
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
            <span>Danh sách đơn mua hàng (PO)</span>
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
          filterInputs={filterInputs}
          onFilterInputChange={(newFilters) => setFilterInputs((prev) => ({ ...prev, ...newFilters }))}
          onSearch={handleSearch}
          onReset={handleReset}
          branches={branchOptions}
          suppliers={supplierOptions}
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
        onViewDetail={(order) => setSelectedOrder(order)}
        onEditOrder={(order) => {
          // Sửa SL trên matrix trước cutoff → chốt lại ở dispatch-hub để amend PO
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

      <PoDetailDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onReceiveNow={handleReceiveOrder}
      />
    </div>
  );
};

export default StoreOwnerPurchaseOrderListPage;
