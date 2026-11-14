import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  FileText,
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import type {
  BatchItem,
  BatchFilterState,
  BatchKpiSummary,
  BatchStatus,
  UserRole,
} from '../types/batch.types';
import { batchApi } from '../api/batchApi';
import { BatchFilterBar } from '../components/BatchFilterBar';
import { BatchTable } from '../components/BatchTable';
import { BatchDetailDrawer } from '../components/BatchDetailDrawer';
import { BatchDiscountModal } from '../components/BatchDiscountModal';
import { BatchRepackModal } from '../components/BatchRepackModal';
import {
  BatchExpiryAlertModal,
  type BatchAlertMode,
} from '../components/BatchExpiryAlertModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const DEFAULT_FILTERS: BatchFilterState = {
  keyword: '',
  productName: '',
  sku: '',
  batchCode: '',
  supplierName: '',
  branchId: 'ALL',
  status: 'ALL',
  pageIndex: 1,
  pageSize: 20,
};

export const BatchListPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const skuParam = searchParams.get('sku');
  const fromInventory = searchParams.get('from') === 'inventory';
  const role: UserRole = roleParam || defaultRole;
  const employeeBranchId = searchParams.get('branch') || '';

  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filterInputs, setFilterInputs] = useState<BatchFilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BatchFilterState>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [discountBatch, setDiscountBatch] = useState<BatchItem | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [repackBatch, setRepackBatch] = useState<BatchItem | null>(null);
  const [kpi, setKpi] = useState<BatchKpiSummary | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMode, setAlertMode] = useState<BatchAlertMode>('near_expiry');
  const [toast, setToast] = useState<ToastState | null>(null);

  const nearExpiryCount = (kpi?.warningCount || 0) + (kpi?.criticalCount || 0);
  const expiredCount = kpi?.expiredCount || 0;

  const openAlert = (mode: BatchAlertMode) => {
    setAlertMode(mode);
    setIsAlertOpen(true);
  };

  const stocktakeBasePath =
    role === 'employee' ? '/employee/stocktakes' : '/store-owner/stocktakes';

  const handleCreateStocktake = (singleBatch?: BatchItem) => {
    const itemsToCount = singleBatch ? [singleBatch] : [];
    navigate(`${stocktakeBasePath}/create`, {
      state: {
        preselectedBatches: itemsToCount,
        branchId:
          itemsToCount[0]?.branchId ||
          (appliedFilters.branchId !== 'ALL' ? appliedFilters.branchId : ''),
      },
    });
  };

  const fetchIdRef = useRef(0);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync initial query params from URL
  useEffect(() => {
    const skuFromUrl = searchParams.get('sku');
    const batchParam = searchParams.get('batch');
    const statusParam = searchParams.get('status') as BatchStatus | null;
    const branchParam = searchParams.get('branch');

    const updated = { ...DEFAULT_FILTERS };
    if (skuFromUrl) updated.sku = skuFromUrl;
    if (batchParam && !skuFromUrl) updated.batchCode = batchParam;

    if (statusParam && ['Expired', 'Critical', 'Warning', 'Normal'].includes(statusParam)) {
      updated.status = statusParam;
    }
    if (role === 'employee' && branchParam) {
      updated.branchId = branchParam;
    } else if (branchParam && branchParam !== 'ALL') {
      updated.branchId = branchParam;
    }

    setFilterInputs(updated);
    setAppliedFilters(updated);
    setPageIndex(1);
  }, [searchParams, role]);

  const loadBatches = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const branchId =
        role === 'employee' && employeeBranchId
          ? employeeBranchId
          : appliedFilters.branchId;

      const result = await batchApi.getBatches({
        ...appliedFilters,
        sku: appliedFilters.sku || skuParam || '',
        branchId,
        pageIndex,
        pageSize,
      });

      if (fetchId !== fetchIdRef.current) return;
      setBatches(result.items);
      setTotalCount(result.totalCount);
      setKpi(result.kpiSummary);
    } catch (err: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      setBatches([]);
      setTotalCount(0);
      setKpi(null);
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh sách lô hàng.';
      showToast(message, 'error');
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoading(false);
    }
  }, [appliedFilters, pageIndex, pageSize, role, employeeBranchId, skuParam]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  const focusedProduct = skuParam
    ? batches.find((b) => b.sku.toLowerCase() === skuParam.toLowerCase()) || batches[0]
    : null;

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
    const resetBranch = role === 'employee' && employeeBranchId ? employeeBranchId : 'ALL';
    const resetState: BatchFilterState = {
      ...DEFAULT_FILTERS,
      branchId: resetBranch,
    };
    setFilterInputs(resetState);
    setAppliedFilters(resetState);
    setPageIndex(1);
    const keep = new URLSearchParams();
    if (skuParam) keep.set('sku', skuParam);
    if (fromInventory) keep.set('from', 'inventory');
    if (searchParams.get('branch')) keep.set('branch', searchParams.get('branch') || '');
    setSearchParams(keep, { replace: true });
    showToast('Đã đặt lại toàn bộ tiêu chí tìm kiếm', 'info');
  };

  const handleSelectBatch = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsDrawerOpen(true);
  };

  const handleUpdateLocation = (_batchId: string, _newLocation: string) => {
    showToast('Chưa có API cập nhật vị trí kệ — thay đổi chưa được lưu.', 'warning');
  };

  const handleOpenDiscount = (batch: BatchItem) => {
    if (batch.status === 'Expired') {
      showToast('Lô hàng đã quá hạn sử dụng, không thể áp dụng giảm giá. Bắt buộc xuất hủy!', 'error');
      return;
    }
    setDiscountBatch(batch);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscount = async (batchId: string, discountPercent: number) => {
    try {
      await batchApi.applyFefoDiscount(batchId, discountPercent);
      setIsDiscountModalOpen(false);
      setDiscountBatch(null);
      showToast(`Đã lưu giảm giá FEFO ${discountPercent}% cho lô hàng.`, 'success');
      await loadBatches();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu giảm giá FEFO.', 'error');
    }
  };

  const handleWriteOff = (batch: BatchItem) => {
    handleCreateStocktake(batch);
  };

  const handlePrint = () => {
    window.print();
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
            {(fromInventory || skuParam) && (
              <button
                type="button"
                onClick={() => navigate('/store-owner/inventory')}
                className="po-btn po-btn-secondary"
                style={{ height: 28, padding: '0 10px', marginRight: 4 }}
                title="Quay lại tồn kho"
              >
                <ArrowLeft size={13} />
              </button>
            )}
            <Package size={22} color="var(--blue-primary, #0f766e)" />
            <span>
              {skuParam ? 'Chi tiết lô & hạn sử dụng' : 'Quản lý Lô & Hạn sử dụng (FEFO)'}
            </span>
          </h1>
          {skuParam && (
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, marginLeft: 30 }}>
              {focusedProduct?.productName || skuParam} · SKU {skuParam} · {totalCount} lô
              {isLoading ? ' · Đang tải…' : ''}
            </div>
          )}
        </div>

        <div className="so-list-header-actions">
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => openAlert('near_expiry')}
            style={
              nearExpiryCount > 0
                ? { borderColor: '#f59e0b', color: '#b45309', fontWeight: 800 }
                : undefined
            }
          >
            <AlertTriangle size={14} />
            <span>Cận hạn{nearExpiryCount > 0 ? ` (${nearExpiryCount})` : ''}</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => openAlert('expired')}
            style={
              expiredCount > 0
                ? { borderColor: '#f87171', color: '#be123c', fontWeight: 800 }
                : undefined
            }
          >
            <ClipboardCheck size={14} />
            <span>Hết hạn{expiredCount > 0 ? ` (${expiredCount})` : ''}</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{ backgroundColor: '#0f766e' }}
            onClick={() => handleCreateStocktake()}
          >
            <ClipboardCheck size={14} />
            <span>Kiểm kê hàng hóa</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate(stocktakeBasePath)}
          >
            <ClipboardList size={14} />
            <span>Phiếu kiểm kê</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/goods-receipts')}
          >
            <FileText size={14} />
            <span>Phiếu nhập kho</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/inventory')}
          >
            <Package size={14} />
            <span>Tồn kho</span>
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <BatchFilterBar
          filterInputs={filterInputs}
          role={role}
          employeeBranchId={employeeBranchId}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onReset={handleReset}
          onPrint={handlePrint}
        />
      </div>

      <BatchTable
        batches={batches}
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onQuickStocktake={(b) => handleCreateStocktake(b)}
        onProcessBatch={(b) => setRepackBatch(b)}
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

      {repackBatch && (
        <BatchRepackModal
          batch={repackBatch}
          onClose={() => setRepackBatch(null)}
          onDone={() => {
            setRepackBatch(null);
            showToast('Chế biến khay thành công.');
            void loadBatches();
          }}
        />
      )}

      <BatchDetailDrawer
        isOpen={isDrawerOpen}
        batch={selectedBatch}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateLocation={handleUpdateLocation}
        onDiscountClick={handleOpenDiscount}
        onWriteOffClick={handleWriteOff}
        onStocktakeClick={(b) => {
          setIsDrawerOpen(false);
          handleCreateStocktake(b);
        }}
        onViewGrn={(grnNo) => {
          setIsDrawerOpen(false);
          navigate(`/store-owner/goods-receipts?keyword=${grnNo}`);
        }}
      />

      <BatchDiscountModal
        isOpen={isDiscountModalOpen}
        batch={discountBatch}
        onClose={() => setIsDiscountModalOpen(false)}
        onApplyDiscount={handleApplyDiscount}
      />

      <BatchExpiryAlertModal
        isOpen={isAlertOpen}
        mode={alertMode}
        branchId={
          role === 'employee' && employeeBranchId
            ? employeeBranchId
            : appliedFilters.branchId !== 'ALL'
              ? appliedFilters.branchId
              : ''
        }
        onClose={() => setIsAlertOpen(false)}
        onCreated={(codes) => {
          setIsAlertOpen(false);
          showToast(
            codes.length === 1
              ? `Đã tạo phiếu trả hàng nháp ${codes[0]} — gửi Store Owner xem trên Phiếu trả NCC.`
              : `Đã tạo ${codes.length} phiếu trả hàng nháp: ${codes.join(', ')}.`,
            'success'
          );
          if (role !== 'employee') {
            navigate('/store-owner/supplier-returns');
          }
        }}
        onCreateStocktake={(items) => {
          setIsAlertOpen(false);
          navigate(`${stocktakeBasePath}/create`, {
            state: {
              preselectedBatches: items,
              branchId: items[0]?.branchId || '',
            },
          });
        }}
      />
    </div>
  );
};
