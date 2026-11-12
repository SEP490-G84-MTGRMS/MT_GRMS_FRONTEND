import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, History, Download, Plus, Loader2 } from 'lucide-react';
import type { BranchListItem, BranchFilterState } from '../types/po.types';
import { BranchFilterBar } from '../components/branch/BranchFilterBar';
import { BranchOrderTable } from '../components/branch/BranchOrderTable';
import { AdminToast, type ToastState } from '../../admin/components';
import { branchApi } from '../api/branchApi';
import '../purchase-order.css';
import '../../supplier/supplier.css';

const DEFAULT_FILTERS: BranchFilterState = {
  keyword: '',
  branchCode: '',
  branchCodes: [],
  branchNames: [],
  addresses: [],
  phones: [],
  status: '',
  pageIndex: 1,
  pageSize: 10,
};

export const BranchOrderListPage: FC = () => {
  const navigate = useNavigate();

  // State
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appliedFilters, setAppliedFilters] = useState<BranchFilterState>(DEFAULT_FILTERS);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await branchApi.getBranches(appliedFilters);
      setBranches(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách chi nhánh từ máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Đồng bộ lại số SP cửa hàng khi quay lại tab (sau khi gán SP ở /stores/products)
  useEffect(() => {
    const refreshCatalogCounts = () => {
      void fetchBranches();
    };
    window.addEventListener('focus', refreshCatalogCounts);
    return () => window.removeEventListener('focus', refreshCatalogCounts);
  }, [fetchBranches]);

  const handleSearch = (newFilters: BranchFilterState) => {
    setAppliedFilters(newFilters);
  };

  const handleReset = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }));
  };

  const handleOrder = (branchId: string) => {
    navigate(`/store-owner/purchase-orders/create-matrix?branchId=${branchId}`);
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
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header theo chuẩn SupplierListPage ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
          flexShrink: 0,
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
            <Building2 size={22} color="var(--blue-primary, #0f766e)" />
            <span>Đặt Hàng Theo Chi Nhánh</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        {/* Action buttons đồng bộ chuẩn SupplierListPage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/purchase-orders/list"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Xem danh sách tất cả các đơn đặt hàng đã lập"
          >
            <History size={14} />
            <span>Lịch sử đơn hàng</span>
          </Link>

          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => showToast('Đang kết xuất danh sách chi nhánh ra tệp Excel (.xlsx)...', 'info')}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>

          <Link
            to="/store-owner/purchase-orders/create-matrix"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Tạo mới ma trận đặt hàng mua từ nhà cung cấp"
          >
            <Plus size={14} />
            <span>Tạo đơn đặt hàng</span>
          </Link>
        </div>
      </div>

      {/* ── UNIFIED FILTER BAR ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <BranchFilterBar
          filters={appliedFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      {/* ── MAIN DATA TABLE WITH PAGING ── */}
      <BranchOrderTable
        branches={branches}
        totalCount={totalCount}
        pageIndex={appliedFilters.pageIndex}
        pageSize={appliedFilters.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onOrder={handleOrder}
      />
    </div>
  );
};

export default BranchOrderListPage;
