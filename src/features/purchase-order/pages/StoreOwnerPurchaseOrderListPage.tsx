import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Zap, Layers, RefreshCw, Loader2 } from 'lucide-react';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import type { PurchaseOrderListItem, PoListFilterState } from '../types/po-list.types';
import type { BranchOption } from '../types/po.types';
import { PoListFilterBar } from '../components/po-list/PoListFilterBar';
import { PoListTable } from '../components/po-list/PoListTable';
import { PoDetailDrawer } from '../components/po-list/PoDetailDrawer';
import { AdminToast, type ToastState } from '../../admin/components';
import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import '../purchase-order.css';

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

const parseDateFromStr = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // formats: DD/MM/YYYY HH:mm or DD/MM/YYYY or YYYY-MM-DD
  if (dateStr.includes('/')) {
    const parts = dateStr.trim().split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return null;
};

export const StoreOwnerPurchaseOrderListPage: FC = () => {
  const navigate = useNavigate();

  // Master orders list
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter input states
  const [filterInputs, setFilterInputs] = useState<PoListFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<PoListFilterState>(DEFAULT_FILTERS);

  // Pagination states
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Drawer detail state
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderListItem | null>(null);

  // Toast notification
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load branches from Backend API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await httpClient.get<ApiResponse<any>>('/branches');
        const rawData = res.data?.data;
        const bList: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.items)
          ? rawData.items
          : [];
        if (bList.length > 0) {
          setBranches(
            bList.map((b) => ({
              id: b.id,
              code: b.branchCode || b.code || 'BR',
              name: b.name || b.branchName || 'Chi nhánh',
              address: b.address || '',
            }))
          );
        }
      } catch {
        // keep empty
      }
    };
    fetchBranches();
  }, []);

  // Load purchase orders from Backend API
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await purchaseOrderApi.getPurchaseOrders({
        branchId: appliedFilters.branchId,
        supplierId: appliedFilters.supplierId,
        status: appliedFilters.status,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        pageSize: 100,
      });
      setOrders(data.items || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn đặt hàng từ máy chủ.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Approve PO via Backend API
  const handleApproveOrder = async (order: PurchaseOrderListItem) => {
    try {
      await purchaseOrderApi.updatePurchaseOrderStatus(order.id, 'APPROVED');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'APPROVED' } : o))
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
      showToast(`Đã duyệt đơn mua hàng ${order.poCode} thành công!`, 'success');
    } catch {
      showToast(`Lỗi khi duyệt đơn mua hàng ${order.poCode}.`, 'error');
    }
  };

  // Cancel PO via Backend API
  const handleCancelOrder = async (order: PurchaseOrderListItem) => {
    try {
      await purchaseOrderApi.updatePurchaseOrderStatus(
        order.id,
        'CANCELLED',
        'Hủy từ danh sách đơn mua hàng PO'
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' } : o))
      );
      if (selectedOrder?.id === order.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }
      showToast(`Đã hủy đơn mua hàng ${order.poCode}.`, 'info');
    } catch {
      showToast(`Lỗi khi hủy đơn mua hàng ${order.poCode}.`, 'error');
    }
  };

  // Cross-module flow FE-8 -> FE-7: Receive Now (Nhập kho ngay)
  const handleReceiveNow = (order: PurchaseOrderListItem) => {
    const params = new URLSearchParams();
    params.set('poId', order.id);
    params.set('poCode', order.poCode);
    if (order.branchId) params.set('branchId', order.branchId);
    navigate(`/store-owner/goods-receipts/create?${params.toString()}`);
  };

  // Unique suppliers list derived from orders
  const supplierOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    orders.forEach((o) => {
      if (!map.has(o.supplierId)) {
        map.set(o.supplierId, { id: o.supplierId, code: o.supplierCode, name: o.supplierName });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Handle Search button
  const handleSearch = () => {
    setAppliedFilters(filterInputs);
    setPageIndex(1);
  };

  // Handle Reset button
  const handleReset = () => {
    setFilterInputs(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageIndex(1);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Branch filter
      if (appliedFilters.branchId !== 'all') {
        if (o.branchId !== appliedFilters.branchId && o.branchCode !== appliedFilters.branchId) {
          return false;
        }
      }

      // 2. Supplier filter
      if (appliedFilters.supplierId !== 'all') {
        if (o.supplierId !== appliedFilters.supplierId && o.supplierCode !== appliedFilters.supplierId) {
          return false;
        }
      }

      // 3. Status filter
      if (appliedFilters.status !== 'all') {
        if (o.status !== appliedFilters.status) return false;
      }

      // 4. Date From filter (matches lastUpdated or expectedDelivery)
      if (appliedFilters.dateFrom) {
        const from = new Date(appliedFilters.dateFrom);
        from.setHours(0, 0, 0, 0);
        const orderDate = parseDateFromStr(o.lastUpdated) || parseDateFromStr(o.expectedDelivery);
        if (!orderDate || orderDate < from) return false;
      }

      // 5. Date To filter
      if (appliedFilters.dateTo) {
        const to = new Date(appliedFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        const orderDate = parseDateFromStr(o.lastUpdated) || parseDateFromStr(o.expectedDelivery);
        if (!orderDate || orderDate > to) return false;
      }

      // 6. Keyword filter
      if (appliedFilters.keyword.trim()) {
        const kw = appliedFilters.keyword.trim().toLowerCase();
        const matchCode = o.poCode.toLowerCase().includes(kw);
        const matchStore = o.storeRefCode.toLowerCase().includes(kw);
        const matchSup = o.supplierName.toLowerCase().includes(kw) || o.supplierCode.toLowerCase().includes(kw);
        const matchBranch = o.branchName.toLowerCase().includes(kw) || o.branchCode.toLowerCase().includes(kw);
        const matchCreator = o.createdSource.toLowerCase().includes(kw);
        const matchItems = o.items.some(
          (it) => it.name.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw)
        );

        if (!matchCode && !matchStore && !matchSup && !matchBranch && !matchCreator && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, appliedFilters]);

  // Paginated orders
  const pagedOrders = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, pageIndex, pageSize]);

  return (
    <div className="po-matrix-container" style={{ width: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Danh sách đơn mua hàng (PO)</span>
          </h1>
        </div>

        {/* Quick Link Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 12px' }}
            title="Tải lại danh sách từ máy chủ"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/dispatch-hub')}
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 14px' }}
            title="Chuyển sang Trung tâm chốt đơn & tách PO theo NCC"
          >
            <Zap size={14} color="#0d9488" />
            <span>Chốt đơn với nhà cung cấp</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/create-matrix')}
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            title="Mở Bảng lưới đặt hàng ma trận"
          >
            <Grid size={14} />
            <span>Bảng lưới đặt hàng</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.84rem',
            marginBottom: 12,
          }}
        >
          {loadError}
        </div>
      )}

      {/* ── UNIFIED FILTER BAR ── */}
      <PoListFilterBar
        filterInputs={filterInputs}
        onFilterInputChange={(newFilters) =>
          setFilterInputs((prev) => ({ ...prev, ...newFilters }))
        }
        onSearch={handleSearch}
        onReset={handleReset}
        branches={branches}
        suppliers={supplierOptions}
      />

      {/* ── MAIN DATA TABLE WITH PAGING ── */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 20px',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            gap: 10,
          }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: '#0F766E' }} />
          <span style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: 600 }}>
            Đang tải danh sách đơn đặt hàng từ hệ thống...
          </span>
        </div>
      ) : (
        <PoListTable
          orders={pagedOrders}
          totalCount={filteredOrders.length}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(1);
          }}
          onViewDetail={async (order) => {
            setSelectedOrder(order);
            const fullDetail = await purchaseOrderApi.getPurchaseOrderById(order.id);
            if (fullDetail) {
              setSelectedOrder(fullDetail);
            }
          }}
          onEditOrder={(order) => {
            const params = new URLSearchParams();
            if (order.branchId) params.set('branchId', order.branchId);
            if (order.supplierId) params.set('supplier', order.supplierId);
            navigate(`/store-owner/purchase-orders/create-matrix?${params.toString()}`);
          }}
          onApproveOrder={handleApproveOrder}
          onCancelOrder={handleCancelOrder}
          onReceiveNow={handleReceiveNow}
        />
      )}

      {/* ── SLIDE-OVER DRAWER CHI TIẾT PO ── */}
      <PoDetailDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onApproveOrder={handleApproveOrder}
        onCancelOrder={handleCancelOrder}
        onReceiveNow={handleReceiveNow}
      />
    </div>
  );
};

export default StoreOwnerPurchaseOrderListPage;
