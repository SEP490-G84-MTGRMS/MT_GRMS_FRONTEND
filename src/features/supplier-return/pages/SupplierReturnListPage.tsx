import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RotateCcw, Truck, Plus, Loader2, ClipboardList } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type {
  SupplierReturnListItem,
  SupplierReturnDetail,
  SupplierReturnFilterState,
} from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import { SupplierReturnFilterBar } from '../components/SupplierReturnFilterBar';
import { SupplierReturnTable } from '../components/SupplierReturnTable';
import { CompleteHandoverModal } from '../components/CompleteHandoverModal';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';

const DEFAULT_FILTERS: SupplierReturnFilterState = {
  keyword: '',
  branchId: '',
  supplierId: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
};

export const SupplierReturnListPage: FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const lockedBranch = !isStoreOwner && userBranchId ? userBranchId : '';

  const [draft, setDraft] = useState<SupplierReturnFilterState>({
    ...DEFAULT_FILTERS,
    branchId: lockedBranch,
  });
  const [applied, setApplied] = useState<SupplierReturnFilterState>({
    ...DEFAULT_FILTERS,
    branchId: lockedBranch,
  });

  const [items, setItems] = useState<SupplierReturnListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [quickHandoverItem, setQuickHandoverItem] = useState<SupplierReturnDetail | null>(null);

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([
    { id: 'BR-01', name: 'BR-01 Main Store' },
    { id: 'BR-02', name: 'BR-02 Thu Duc Hub' },
  ]);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([
    { id: 'sup-vinamilk', name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)' },
    { id: 'sup-pepsi', name: 'Suntory PepsiCo Việt Nam' },
    { id: 'sup-orion', name: 'Công ty TNHH Thực phẩm Orion Vina' },
  ]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      branchApi.getBranches({ status: 'active', pageIndex: 1, pageSize: 100 }),
      supplierApi.getSuppliers({ status: 'Active', pageIndex: 1, pageSize: 100 }),
    ])
      .then(([bRes, sRes]) => {
        if (!isMounted) return;
        if (bRes.items?.length) {
          setBranches(bRes.items.map((b) => ({ id: b.id, name: `${b.code || ''} — ${b.name}`.trim() })));
        }
        if (sRes.items?.length) {
          setSuppliers(sRes.items.map((s) => ({ id: s.id, name: `${s.code} — ${s.name}` })));
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

  const handleQuickHandover = async (item: SupplierReturnListItem) => {
    try {
      const detail = await supplierReturnApi.getById(item.id);
      setQuickHandoverItem(detail);
    } catch {
      navigate(`/store-owner/supplier-returns/${item.id}`);
    }
  };

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
      {/* Top Header */}
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
            <span>+ Tạo Phiếu Trả Hàng</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED FILTER BAR ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierReturnFilterBar
          draft={draft}
          totalFiltered={items.length}
          totalAll={totalCount}
          lockBranch={Boolean(lockedBranch)}
          suppliers={suppliers}
          branches={branches}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onSearch={() => setApplied({ ...draft, pageIndex: 1 })}
          onReset={() => {
            const reset = { ...DEFAULT_FILTERS, branchId: lockedBranch };
            setDraft(reset);
            setApplied(reset);
          }}
          onCreateNew={() => navigate('/store-owner/supplier-returns/create')}
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

      {/* Table */}
      <SupplierReturnTable
        items={items}
        totalCount={totalCount}
        pageIndex={applied.pageIndex}
        pageSize={applied.pageSize}
        onPageChange={(page) => setApplied((prev) => ({ ...prev, pageIndex: page }))}
        onPageSizeChange={(size) => setApplied((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }))}
        onViewDetail={(item) => navigate(`/store-owner/supplier-returns/${item.id}`)}
        onQuickHandover={handleQuickHandover}
        onPrint={handlePrint}
      />

      {/* Handover Modal */}
      {quickHandoverItem && (
        <CompleteHandoverModal
          isOpen={Boolean(quickHandoverItem)}
          onClose={() => setQuickHandoverItem(null)}
          returnDetail={quickHandoverItem}
          onSubmit={async (payload) => {
            await supplierReturnApi.completeHandover(quickHandoverItem.id, payload);
            await loadData();
          }}
        />
      )}
    </div>
  );
};

export default SupplierReturnListPage;
