import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  FileText,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import type {
  BatchItem,
  BatchFilterState,
  BatchStatus,
  UserRole,
} from '../types/batch.types';
import { MOCK_BATCH_ITEMS } from '../lib/mockBatchData';
import { BatchFilterBar } from '../components/BatchFilterBar';
import { BatchTable } from '../components/BatchTable';
import { BatchDetailDrawer } from '../components/BatchDetailDrawer';
import { BatchDiscountModal } from '../components/BatchDiscountModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const DEFAULT_FILTERS: BatchFilterState = {
  keyword: '',
  branchId: 'ALL',
  status: 'ALL',
  pageIndex: 1,
  pageSize: 10,
};

export const BatchListPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role Management (Store Owner vs Employee)
  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || 'BR-01';

  // Master State
  const [batches, setBatches] = useState<BatchItem[]>(MOCK_BATCH_ITEMS);
  const [filterInputs, setFilterInputs] = useState<BatchFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BatchFilterState>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawer State
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [discountBatch, setDiscountBatch] = useState<BatchItem | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync initial query params from URL (e.g. ?sku=DY-SUA-01 or ?batch=BAT-001)
  useEffect(() => {
    const skuParam = searchParams.get('sku');
    const batchParam = searchParams.get('batch');
    const statusParam = searchParams.get('status') as BatchStatus | null;
    const branchParam = searchParams.get('branch');

    const updated = { ...DEFAULT_FILTERS };
    if (skuParam) updated.keyword = skuParam;
    else if (batchParam) updated.keyword = batchParam;

    if (statusParam && ['Expired', 'Critical', 'Warning', 'Normal'].includes(statusParam)) {
      updated.status = statusParam;
    }
    if (branchParam && branchParam !== 'ALL') {
      updated.branchId = branchParam;
    }

    setFilterInputs(updated);
    setAppliedFilters(updated);
  }, [searchParams]);

  // Switch role handler (Store Owner <-> Employee)
  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    setPageIndex(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);
    if (newRole === 'employee') {
      newParams.set('branch', employeeBranchId);
      setFilterInputs((prev) => ({ ...prev, branchId: employeeBranchId }));
      setAppliedFilters((prev) => ({ ...prev, branchId: employeeBranchId }));
    } else {
      newParams.delete('branch');
      setFilterInputs((prev) => ({ ...prev, branchId: 'ALL' }));
      setAppliedFilters((prev) => ({ ...prev, branchId: 'ALL' }));
    }
    setSearchParams(newParams, { replace: true });
    showToast(
      `Đã chuyển sang góc nhìn ${newRole === 'store_owner' ? 'Chủ cửa hàng (Toàn chuỗi)' : 'Nhân viên kho (Chi nhánh ' + employeeBranchId + ')'}`,
      'info'
    );
  };

  // Base list scoped by role
  const roleScopedBatches = useMemo(() => {
    if (role === 'employee') {
      return batches.filter((b) => b.branchId === employeeBranchId);
    }
    return batches;
  }, [batches, role, employeeBranchId]);

  // Filter input change
  const handleFilterChange = <K extends keyof BatchFilterState>(
    key: K,
    value: BatchFilterState[K]
  ) => {
    setFilterInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filterInputs });
    setPageIndex(1);
  };

  const handleReset = () => {
    const resetBranch = role === 'employee' ? employeeBranchId : 'ALL';
    const resetState: BatchFilterState = {
      ...DEFAULT_FILTERS,
      branchId: resetBranch,
    };
    setFilterInputs(resetState);
    setAppliedFilters(resetState);
    setPageIndex(1);
    setSearchParams(new URLSearchParams(), { replace: true });
    showToast('Đã đặt lại toàn bộ tiêu chí tìm kiếm', 'info');
  };

  // Filtered dataset
  const filteredBatches = useMemo(() => {
    return roleScopedBatches.filter((b) => {
      // 1. Status Filter
      if (appliedFilters.status !== 'ALL' && b.status !== appliedFilters.status) {
        return false;
      }

      // 2. Branch Filter
      if (role === 'store_owner' && appliedFilters.branchId !== 'ALL') {
        if (b.branchId !== appliedFilters.branchId) return false;
      }

      // 3. Keyword Filter
      if (appliedFilters.keyword.trim()) {
        const kw = appliedFilters.keyword.trim().toLowerCase();
        const match =
          b.productName.toLowerCase().includes(kw) ||
          b.sku.toLowerCase().includes(kw) ||
          b.batchCode.toLowerCase().includes(kw) ||
          b.supplierName.toLowerCase().includes(kw) ||
          b.shelfLocation.toLowerCase().includes(kw) ||
          b.originalGrnNo.toLowerCase().includes(kw);
        if (!match) return false;
      }

      return true;
    });
  }, [roleScopedBatches, appliedFilters, role]);

  // Paged dataset
  const pagedBatches = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredBatches.slice(start, start + pageSize);
  }, [filteredBatches, pageIndex, pageSize]);

  // Action: Select row to view detail drawer
  const handleSelectBatch = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsDrawerOpen(true);
  };

  // Action: Update shelf location
  const handleUpdateLocation = (batchId: string, newLocation: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, shelfLocation: newLocation } : b))
    );
    if (selectedBatch && selectedBatch.id === batchId) {
      setSelectedBatch((prev) => (prev ? { ...prev, shelfLocation: newLocation } : null));
    }
    showToast(`Đã cập nhật vị trí lưu kho của lô hàng thành: ${newLocation}`, 'success');
  };

  // Action: Open Discount Modal
  const handleOpenDiscount = (batch: BatchItem) => {
    if (batch.status === 'Expired') {
      showToast('Lô hàng đã quá hạn sử dụng, không thể áp dụng giảm giá. Bắt buộc xuất hủy!', 'error');
      return;
    }
    setDiscountBatch(batch);
    setIsDiscountModalOpen(true);
  };

  // Action: Apply Discount
  const handleApplyDiscount = (batchId: string, discountPercent: number) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, discountPercent } : b))
    );
    showToast(`Đã áp dụng chiết khấu -${discountPercent}% cho lô hàng FEFO thành công!`, 'success');
  };

  // Action: Write-off confirmation
  const handleWriteOff = (batch: BatchItem) => {
    const confirmed = window.confirm(
      `Xác nhận tạo phiếu xuất hủy phế phẩm (FE-06) cho lô ${batch.batchCode} (${batch.productName})?\n\nSố lượng tiêu hủy: ${batch.qtyCurrent} ${batch.unit}\nTổng giá trị hao hụt: ${new Intl.NumberFormat('vi-VN').format(batch.totalValuation)} đ`
    );
    if (confirmed) {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batch.id
            ? {
                ...b,
                qtyCurrent: 0,
                movements: [
                  ...b.movements,
                  {
                    id: `MOV-WO-${Date.now()}`,
                    timestamp: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    type: 'WRITE_OFF',
                    typeLabel: 'Xuất hủy phế phẩm',
                    quantity: -b.qtyCurrent,
                    documentCode: `WO-${Date.now().toString().slice(-6)}`,
                    actor: role === 'store_owner' ? 'Chủ cửa hàng' : 'Thủ kho',
                    notes: 'Xuất hủy do hết hạn sử dụng theo quy tắc FE-06',
                  },
                ],
              }
            : b
        )
      );
      if (selectedBatch && selectedBatch.id === batch.id) {
        setIsDrawerOpen(false);
      }
      showToast(`Đã hoàn tất xuất hủy ${batch.qtyCurrent} ${batch.unit} cho lô ${batch.batchCode}`, 'warning');
    }
  };

  // Action: Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="po-matrix-container" style={{ width: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Top Header Toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '4px 0 8px 0',
          marginBottom: 6,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Quản lý Lô & Hạn sử dụng (FEFO Expiry Management)
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #ccfbf1',
              }}
            >
              FE-02
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>
            Theo dõi vòng đời sản phẩm, phân loại hạn sử dụng và kiểm soát xuất kho theo nguyên tắc FEFO (First Expired, First Out)
          </div>
        </div>

        {/* Right Header Controls: Role switcher + Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Role switcher toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 6,
              padding: 2,
              border: '1px solid #cbd5e1',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleRole('store_owner')}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 5,
                border: 'none',
                backgroundColor: role === 'store_owner' ? '#ffffff' : 'transparent',
                color: role === 'store_owner' ? '#0f766e' : '#64748b',
                fontWeight: role === 'store_owner' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: role === 'store_owner' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <ShieldCheck size={13} />
              <span>Chủ chuỗi</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleRole('employee')}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 5,
                border: 'none',
                backgroundColor: role === 'employee' ? '#ffffff' : 'transparent',
                color: role === 'employee' ? '#0f766e' : '#64748b',
                fontWeight: role === 'employee' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: role === 'employee' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <UserCheck size={13} />
              <span>Thủ kho ({employeeBranchId})</span>
            </button>
          </div>

          {/* Quick link to Goods Receipts */}
          <button
            type="button"
            onClick={() => navigate('/store-owner/goods-receipts')}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Đến màn hình danh sách phiếu nhập kho"
          >
            <FileText size={13} color="#0d9488" />
            <span>Phiếu nhập kho (GRN)</span>
          </button>

          {/* Quick link to Products */}
          <button
            type="button"
            onClick={() => navigate('/store-owner/products')}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Đến danh mục sản phẩm"
          >
            <Package size={13} color="#0d9488" />
            <span>Danh mục sản phẩm</span>
          </button>
        </div>
      </div>

      {/* ── Thanh Bộ lọc Hợp nhất ── */}
      <BatchFilterBar
        filterInputs={filterInputs}
        role={role}
        employeeBranchId={employeeBranchId}
        totalFiltered={filteredBatches.length}
        totalAll={roleScopedBatches.length}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
        onPrint={handlePrint}
      />

      {/* ── Bảng Dữ liệu Lô hàng & Phân trang ── */}
      <BatchTable
        batches={pagedBatches}
        totalCount={filteredBatches.length}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={(p) => setPageIndex(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPageIndex(1);
        }}
        onSelectBatch={handleSelectBatch}
        onDiscountClick={handleOpenDiscount}
        onWriteOffClick={handleWriteOff}
        onResetFilters={handleReset}
      />

      {/* ── Slide-over Drawer Chi tiết Lô hàng UI-02-02 ── */}
      <BatchDetailDrawer
        isOpen={isDrawerOpen}
        batch={selectedBatch}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateLocation={handleUpdateLocation}
        onDiscountClick={handleOpenDiscount}
        onWriteOffClick={handleWriteOff}
        onViewGrn={(grnNo) => {
          setIsDrawerOpen(false);
          navigate(`/store-owner/goods-receipts?keyword=${grnNo}`);
        }}
      />

      {/* ── Modal cấu hình Giảm giá FEFO ── */}
      <BatchDiscountModal
        isOpen={isDiscountModalOpen}
        batch={discountBatch}
        onClose={() => setIsDiscountModalOpen(false)}
        onApplyDiscount={handleApplyDiscount}
      />
    </div>
  );
};
