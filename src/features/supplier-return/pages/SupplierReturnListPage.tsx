import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { RotateCcw, Truck, Plus, Loader2, ClipboardList } from 'lucide-react';
import { useBranchScope } from '../../../hooks/useBranchScope';
import type {
  SupplierReturnListItem,
  SupplierReturnFilterState,
} from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import {
  SupplierReturnFilterBar,
  type SupplierReturnLookupOption,
} from '../components/SupplierReturnFilterBar';
import { SupplierReturnTable } from '../components/SupplierReturnTable';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';
import '../../../styles/so-list-page.css';

const DEFAULT_FILTERS: SupplierReturnFilterState = {
  keyword: '',
  returnCodes: [],
  grnCodes: [],
  supplierCodes: [],
  supplierNames: [],
  branchNames: [],
  branchId: '',
  supplierId: '',
  status: '',
  pageIndex: 1,
  pageSize: 20,
};

export const SupplierReturnListPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isBranchLocked, scopedBranchId } = useBranchScope();

  const [applied, setApplied] = useState<SupplierReturnFilterState>(() => ({
    ...DEFAULT_FILTERS,
    branchId: scopedBranchId,
  }));

  useEffect(() => {
    setApplied((prev) =>
      prev.branchId === scopedBranchId ? prev : { ...prev, branchId: scopedBranchId, pageIndex: 1 }
    );
  }, [scopedBranchId]);

  const [items, setItems] = useState<SupplierReturnListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const state = location.state as { toastMessage?: string } | null;
    if (!state?.toastMessage) return;
    setToast({ id: Date.now().toString(), message: state.toastMessage, type: 'success' });
    const t = window.setTimeout(() => setToast(null), 4000);
    navigate(location.pathname, { replace: true, state: {} });
    return () => window.clearTimeout(t);
  }, [location.state, location.pathname, navigate]);

  const [branches, setBranches] = useState<SupplierReturnLookupOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierReturnLookupOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      branchApi.getBranches({ status: 'active', pageIndex: 1, pageSize: 100 }),
      supplierApi.getSuppliers({ status: 'Active', pageIndex: 1, pageSize: 100 }),
    ])
      .then(([bRes, sRes]) => {
        if (!isMounted) return;
        if (bRes.items?.length) {
          setBranches(
            bRes.items.map((b) => ({
              id: b.id,
              code: b.code || '',
              name: b.name || '',
            }))
          );
        }
        if (sRes.items?.length) {
          setSuppliers(
            sRes.items.map((s) => ({
              id: s.id,
              code: s.code || '',
              name: s.name || '',
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await supplierReturnApi.getList(applied);
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch (err: unknown) {
      setItems([]);
      setTotalCount(0);
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách phiếu trả hàng.');
    } finally {
      setIsLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = (item: SupplierReturnListItem) => {
    navigate(`/store-owner/supplier-returns/${item.id}?print=true`);
  };

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

      {/* Top Header — chuẩn /store-owner/suppliers/products */}
      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <RotateCcw size={22} color="var(--blue-primary, #0f766e)" />
            <span>Quản lý Trả Hàng Nhà Cung Cấp (RTV)</span>
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
          <Link
            to="/store-owner/stocktakes"
            className="po-btn po-btn-secondary"
            title="Xem danh sách Phiếu kiểm kê hàng hóa"
          >
            <ClipboardList size={14} />
            <span>Phiếu kiểm kê hàng hóa</span>
          </Link>
          <Link
            to="/store-owner/goods-receipts"
            className="po-btn po-btn-secondary"
            title="Xem danh sách Phiếu nhập kho (GRN)"
          >
            <Truck size={14} />
            <span>Phiếu nhập kho (GRN)</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={() => navigate('/store-owner/supplier-returns/create')}
            title="Tạo phiếu yêu cầu trả hàng NCC mới từ phiếu nhập kho COMPLETED"
          >
            <Plus size={14} />
            <span>Tạo Phiếu Trả Hàng</span>
          </button>
        </div>
      </div>

      {/* ── FILTER BAR CHUẨN TÁCH RIÊNG TỪNG Ô TÌM KIẾM ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierReturnFilterBar
          initialValues={applied}
          lockBranch={isBranchLocked}
          suppliers={suppliers}
          branches={branches}
          items={items}
          onSearch={(next) => setApplied({ ...next, pageIndex: 1 })}
          onReset={() => {
            setApplied({ ...DEFAULT_FILTERS, branchId: scopedBranchId });
          }}
        />
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
          Không tải được dữ liệu từ máy chủ: {loadError}
        </div>
      )}

      {/* ── BẢNG DỮ LIỆU TÁCH CỘT & XUỐNG DÒNG ĐẦY ĐỦ ── */}
      <SupplierReturnTable
        items={items}
        totalCount={totalCount}
        pageIndex={applied.pageIndex}
        pageSize={applied.pageSize}
        onPageChange={(page) => setApplied((prev) => ({ ...prev, pageIndex: page }))}
        onPageSizeChange={(size) => setApplied((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }))}
        onViewDetail={(item) => navigate(`/store-owner/supplier-returns/${item.id}`)}
        onPrint={handlePrint}
      />
    </div>
  );
};

export default SupplierReturnListPage;
