import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Zap, Layers } from 'lucide-react';
import { MOCK_PURCHASE_ORDERS } from '../lib/mockPoListData';
import { MOCK_BRANCHES } from '../lib/mockData';
import type { PurchaseOrderListItem, PoListFilterState } from '../types/po-list.types';
import { PoListFilterBar } from '../components/po-list/PoListFilterBar';
import { PoListTable } from '../components/po-list/PoListTable';
import { PoDetailDrawer } from '../components/po-list/PoDetailDrawer';
import { AdminToast, type ToastState } from '../../admin/components';
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
  const [orders] = useState<PurchaseOrderListItem[]>(MOCK_PURCHASE_ORDERS);

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

      {/* ── UNIFIED FILTER BAR ── */}
      <PoListFilterBar
        filterInputs={filterInputs}
        onFilterInputChange={(newFilters) =>
          setFilterInputs((prev) => ({ ...prev, ...newFilters }))
        }
        onSearch={handleSearch}
        onReset={handleReset}
        branches={MOCK_BRANCHES}
        suppliers={supplierOptions}
      />

      {/* ── MAIN DATA TABLE WITH PAGING ── */}
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
        onViewDetail={(order) => setSelectedOrder(order)}
        onEditOrder={(order) => {
          showToast(`Đang mở giao diện chỉnh sửa đơn ${order.poCode}`, 'info');
        }}
      />

      {/* ── SLIDE-OVER DRAWER CHI TIẾT PO ── */}
      <PoDetailDrawer
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};

export default StoreOwnerPurchaseOrderListPage;
