import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Truck } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type {
  SupplierReturnListItem,
  SupplierReturnDetail,
  SupplierReturnFilterState,
  SupplierReturnKpiSummary,
} from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { SupplierReturnKpiCards } from '../components/SupplierReturnKpiCards';
import { SupplierReturnFilterBar } from '../components/SupplierReturnFilterBar';
import { SupplierReturnTable } from '../components/SupplierReturnTable';
import { CompleteHandoverModal } from '../components/CompleteHandoverModal';
import '../../purchase-order/purchase-order.css';

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
  const [quickHandoverItem, setQuickHandoverItem] = useState<SupplierReturnDetail | null>(null);

  const branches = [
    { id: 'BR-01', name: 'BR-01 Main Store' },
    { id: 'BR-02', name: 'BR-02 Thu Duc Hub' },
  ];

  const suppliers = [
    { id: 'sup-vinamilk', name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)' },
    { id: 'sup-pepsi', name: 'Suntory PepsiCo Việt Nam' },
    { id: 'sup-orion', name: 'Công ty TNHH Thực phẩm Orion Vina' },
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await supplierReturnApi.getList(applied);
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch {
      // Fallback handled inside supplierReturnApi
    } finally {
      setIsLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute KPI summaries from loaded items
  const summary: SupplierReturnKpiSummary = useMemo(() => {
    return {
      totalCount: totalCount,
      pendingSupplierCount: items.filter((i) => i.status === 'PENDING_SUPPLIER').length,
      approvedCount: items.filter((i) => i.status === 'APPROVED').length,
      completedCount: items.filter((i) => i.status === 'COMPLETED').length,
      totalEstimatedAmount: items.reduce((sum, i) => sum + i.totalEstimatedAmount, 0),
    };
  }, [items, totalCount]);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
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
          <RotateCcw size={22} color="var(--blue-primary, #0f766e)" />
          <span>Trả hàng nhà cung cấp (RTV)</span>
          {isLoading && <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>(Đang tải...)</span>}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => navigate('/store-owner/goods-receipts')}
          >
            <Truck size={14} />
            <span>Phiếu nhập kho (GRN)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <SupplierReturnKpiCards summary={summary} />

      {/* Filter Bar */}
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
