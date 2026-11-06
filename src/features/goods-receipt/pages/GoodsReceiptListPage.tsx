import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  Plus,
  ShieldCheck,
  UserCheck,
  Layers,
  Loader2,
} from 'lucide-react';
import type {
  GoodsReceiptListItem,
  GrnFilterState,
  GrnFilterTab,
  UserRole,
} from '../types/grn.types';
import { goodsReceiptApi } from '../api/goodsReceiptApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import { GrnFilterBar, type GrnFilterOption } from '../components/GrnFilterBar';
import { GrnTable } from '../components/GrnTable';
import { GrnDetailDrawer } from '../components/GrnDetailDrawer';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const DEFAULT_FILTERS: GrnFilterState = {
  keyword: '',
  branchId: 'ALL',
  supplierId: 'ALL',
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
  tab: 'ALL',
  pageIndex: 1,
  pageSize: 20,
};

export const GoodsReceiptListPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const branchParam = searchParams.get('branch') || '';

  const [branches, setBranches] = useState<GrnFilterOption[]>([]);
  const [suppliers, setSuppliers] = useState<GrnFilterOption[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceiptListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tabCounts, setTabCounts] = useState({ all: 0, today: 0, draft: 0, mismatch: 0 });

  const [activeTab, setActiveTab] = useState<GrnFilterTab>('ALL');
  const [filterInputs, setFilterInputs] = useState<GrnFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GrnFilterState>(DEFAULT_FILTERS);

  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptListItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const employeeBranchId = useMemo(() => {
    if (!branchParam) return branches[0]?.id || '';
    const byId = branches.find((b) => b.id === branchParam);
    if (byId) return byId.id;
    const byLabel = branches.find(
      (b) => b.label.toLowerCase().includes(branchParam.toLowerCase())
    );
    return byLabel?.id || branchParam;
  }, [branchParam, branches]);

  const employeeBranchLabel = useMemo(() => {
    return branches.find((b) => b.id === employeeBranchId)?.label || employeeBranchId || 'Chi nhánh';
  }, [branches, employeeBranchId]);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [branchRes, supplierRes] = await Promise.all([
          branchApi.getBranches({ status: 'active', pageIndex: 1, pageSize: 100 }),
          supplierApi.getSuppliers({ status: 'Active', pageIndex: 1, pageSize: 100 }),
        ]);
        setBranches(
          (branchRes.items ?? []).map((b) => ({
            id: b.id,
            label: `${b.code || ''} — ${b.name}`.trim(),
          }))
        );
        setSuppliers(
          (supplierRes.items ?? []).map((s) => ({
            id: s.id,
            label: `${s.code} — ${s.name}`,
          }))
        );
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh mục chi nhánh / NCC.', 'error');
      }
    };
    void loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildQuery = useCallback(
    (overrides: Partial<GrnFilterState> = {}): Partial<GrnFilterState> => {
      const base: GrnFilterState = {
        ...appliedFilters,
        tab: activeTab,
        ...overrides,
      };
      if (role === 'employee' && employeeBranchId) {
        base.branchId = employeeBranchId;
      }
      return base;
    },
    [appliedFilters, activeTab, role, employeeBranchId]
  );

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = buildQuery();
      const res = await goodsReceiptApi.getGoodsReceipts(query);
      setReceipts(res.items);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      setReceipts([]);
      setTotalCount(0);
      showToast(err.message || 'Không thể tải danh sách phiếu nhập kho.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  const fetchTabCounts = useCallback(async () => {
    try {
      const base = buildQuery({ pageIndex: 1, pageSize: 1, tab: 'ALL', status: 'ALL' });
      const [allRes, todayRes, draftRes, mismatchRes] = await Promise.all([
        goodsReceiptApi.getGoodsReceipts({ ...base, tab: 'ALL' }),
        goodsReceiptApi.getGoodsReceipts({ ...base, tab: 'TODAY' }),
        goodsReceiptApi.getGoodsReceipts({ ...base, tab: 'DRAFT' }),
        goodsReceiptApi.getGoodsReceipts({ ...base, tab: 'MISMATCH' }),
      ]);
      setTabCounts({
        all: allRes.totalCount,
        today: todayRes.totalCount,
        draft: draftRes.totalCount,
        mismatch: mismatchRes.totalCount,
      });
    } catch {
      // counts are non-critical
    }
  }, [buildQuery]);

  useEffect(() => {
    void fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    void fetchTabCounts();
  }, [fetchTabCounts]);

  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);

    if (newRole === 'employee') {
      const branchId = employeeBranchId || branches[0]?.id || '';
      if (branchId) newParams.set('branch', branchId);
      setFilterInputs((prev) => ({ ...prev, branchId: branchId || 'ALL', pageIndex: 1 }));
      setAppliedFilters((prev) => ({ ...prev, branchId: branchId || 'ALL', pageIndex: 1 }));
    } else {
      newParams.delete('branch');
      setFilterInputs((prev) => ({ ...prev, branchId: 'ALL', pageIndex: 1 }));
      setAppliedFilters((prev) => ({ ...prev, branchId: 'ALL', pageIndex: 1 }));
    }

    setSearchParams(newParams, { replace: true });
    showToast(
      `Đã chuyển sang góc nhìn ${
        newRole === 'store_owner' ? 'Chủ cửa hàng (Toàn chuỗi)' : 'Nhân viên kho'
      }`,
      'info'
    );
  };

  const handleFilterChange = <K extends keyof GrnFilterState>(
    key: K,
    value: GrnFilterState[K]
  ) => {
    setFilterInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filterInputs, pageIndex: 1, tab: activeTab });
  };

  const handleReset = () => {
    const resetBranch = role === 'employee' && employeeBranchId ? employeeBranchId : 'ALL';
    const resetState: GrnFilterState = {
      ...DEFAULT_FILTERS,
      branchId: resetBranch,
    };
    setFilterInputs(resetState);
    setAppliedFilters(resetState);
    setActiveTab('ALL');
  };

  const handleTabChange = (tab: GrnFilterTab) => {
    setActiveTab(tab);
    setAppliedFilters((prev) => ({ ...prev, pageIndex: 1, tab }));
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }));
  };

  const handleSelectReceipt = (receipt: GoodsReceiptListItem) => {
    setSelectedReceipt(receipt);
    setIsDrawerOpen(true);
  };

  const basePath = role === 'employee' ? '/employee/goods-receipts' : '/store-owner/goods-receipts';
  const roleQuery =
    role === 'employee'
      ? `?branch=${encodeURIComponent(employeeBranchId)}&role=employee`
      : '';

  const handleActionClick = (action: string, receipt: GoodsReceiptListItem) => {
    if (action === 'RECEIVE_NOW') {
      navigate(
        role === 'employee'
          ? `${basePath}/create?poCode=${encodeURIComponent(receipt.poReference)}&branch=${employeeBranchId}&role=employee`
          : `${basePath}/create?poCode=${encodeURIComponent(receipt.poReference)}`
      );
    } else if (action === 'APPROVE_DRAFT') {
      navigate(`${basePath}/${receipt.id}/confirm${roleQuery}`);
    } else if (
      action === 'VIEW_DETAIL' ||
      action === 'EDIT_DRAFT' ||
      action === 'RESOLVE_MISMATCH'
    ) {
      navigate(`${basePath}/${receipt.id}${roleQuery}`);
    } else if (action === 'VIEW_BATCH') {
      setSelectedReceipt(receipt);
      setIsDrawerOpen(true);
      showToast(`Xem danh sách lô hàng FEFO đã gán cho phiếu ${receipt.code}`, 'info');
    } else if (action === 'PRINT_RECEIPT') {
      showToast(`Đang kết nối máy in để in phiếu nhập kho ${receipt.code}...`, 'success');
    }
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
            <PackageCheck size={22} color="var(--blue-primary, #0f766e)" />
            <span>Danh sách phiếu nhập kho (GRN)</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: 2,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
            }}
            title="Chuyển đổi góc nhìn vai trò để kiểm thử phân quyền"
          >
            <button
              type="button"
              onClick={() => handleToggleRole('store_owner')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'store_owner' ? 700 : 500,
                backgroundColor: role === 'store_owner' ? '#ffffff' : 'transparent',
                color: role === 'store_owner' ? '#0f766e' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'store_owner' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ShieldCheck size={14} />
              <span>Chủ cửa hàng</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleRole('employee')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'employee' ? 700 : 500,
                backgroundColor: role === 'employee' ? '#ffffff' : 'transparent',
                color: role === 'employee' ? '#059669' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'employee' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <UserCheck size={14} />
              <span>Nhân viên</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/list')}
            className="po-btn po-btn-secondary"
            title="Chuyển sang danh sách đơn mua hàng (PO)"
          >
            <Layers size={14} />
            <span>Đơn mua hàng PO</span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                role === 'employee'
                  ? `/employee/goods-receipts/create?branch=${employeeBranchId}&role=employee`
                  : '/store-owner/goods-receipts/create'
              )
            }
            className="po-btn po-btn-primary"
          >
            <Plus size={14} />
            <span>Nhập kho từ PO</span>
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <GrnFilterBar
          filterInputs={filterInputs}
          role={role}
          employeeBranchLabel={employeeBranchLabel}
          branches={branches}
          suppliers={suppliers}
          activeTab={activeTab}
          tabCounts={tabCounts}
          onTabChange={handleTabChange}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <GrnTable
        receipts={receipts}
        totalCount={totalCount}
        pageIndex={appliedFilters.pageIndex}
        pageSize={appliedFilters.pageSize}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSelectReceipt={handleSelectReceipt}
        onActionClick={handleActionClick}
        onResetFilters={handleReset}
      />

      <GrnDetailDrawer
        receipt={selectedReceipt}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onPrint={(r) => showToast(`Đang in phiếu ${r.code}...`, 'success')}
        onAction={handleActionClick}
      />
    </div>
  );
};
