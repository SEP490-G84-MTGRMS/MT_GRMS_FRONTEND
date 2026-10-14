import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MOCK_DISPATCH_SUPPLIERS } from '../lib/mockDispatchData';
import { MOCK_BRANCHES } from '../lib/mockData';
import type { SupplierDispatchGroup } from '../types/po.types';
import { DispatchFilterBar, type DispatchTabType } from '../components/dispatch/DispatchFilterBar';
import { SupplierDispatchTable } from '../components/dispatch/SupplierDispatchTable';
import { SupplierDispatchDrawer } from '../components/dispatch/SupplierDispatchDrawer';
import { DispatchConfirmModal } from '../components/dispatch/DispatchConfirmModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../purchase-order.css';

export const SupplierOrderDispatchHubPage: FC = () => {
  const [searchParams] = useSearchParams();

  // Branch scope
  const branchParam = searchParams.get('branchId') || searchParams.get('branch') || 'DC1';
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchParam);

  // Master State: Suppliers
  const [suppliers, setSuppliers] = useState<SupplierDispatchGroup[]>(MOCK_DISPATCH_SUPPLIERS);

  // Drawer Open State: holds the ID of supplier currently viewed in Drawer
  const [selectedDrawerSupplierId, setSelectedDrawerSupplierId] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<DispatchTabType>('all');
  const [keyword, setKeyword] = useState<string>('');

  // Pagination States
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Confirm Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    targets: SupplierDispatchGroup[];
    isBatch: boolean;
  }>({
    isOpen: false,
    targets: [],
    isBatch: false,
  });

  // Inline Quantity Edit in Drawer
  const handleUpdateItemQty = (supplierId: string, itemId: string, newQty: number) => {
    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id !== supplierId) return sup;
        const updatedItems = sup.items.map((it) => (it.id === itemId ? { ...it, qty: newQty } : it));
        return { ...sup, items: updatedItems };
      })
    );
  };

  // Delete Item from PO in Drawer
  const handleDeleteItem = (supplierId: string, itemId: string) => {
    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id !== supplierId) return sup;
        const updatedItems = sup.items.filter((it) => it.id !== itemId);
        return { ...sup, items: updatedItems };
      })
    );
    showToast('Đã xóa mặt hàng khỏi đơn mua hàng.', 'info');
  };

  // Update Note
  const handleUpdateNote = (supplierId: string, note: string) => {
    setSuppliers((prev) =>
      prev.map((sup) => (sup.id === supplierId ? { ...sup, note } : sup))
    );
  };

  // Open Dispatch Modal for single supplier
  const handleOpenDispatchSingle = (sup: SupplierDispatchGroup) => {
    setModalState({
      isOpen: true,
      targets: [sup],
      isBatch: false,
    });
  };

  // Confirm Dispatch & Generate PO
  const handleConfirmDispatch = () => {
    const targetIds = new Set(modalState.targets.map((t) => t.id));
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setSuppliers((prev) =>
      prev.map((s) => {
        if (!targetIds.has(s.id)) return s;
        const poCode = `PO-20261014-${s.code.replace('SUP-', '')}`;
        return {
          ...s,
          status: 'dispatched',
          poCode,
          dispatchedAt: nowStr,
        };
      })
    );

    setModalState({ isOpen: false, targets: [], isBatch: false });
    showToast(
      `Đã phát hành đơn mua hàng PO thành công cho ${modalState.targets[0]?.name}!`,
      'success'
    );
  };

  // Tab counts for dropdown
  const tabCounts = useMemo(() => {
    return {
      all: suppliers.length,
      critical: suppliers.filter((s) => s.status !== 'dispatched' && s.urgency === 'critical').length,
      today: suppliers.filter((s) => s.status !== 'dispatched' && (s.urgency === 'today' || s.urgency === 'critical')).length,
      later: suppliers.filter((s) => s.status !== 'dispatched' && s.urgency === 'later').length,
      completed: suppliers.filter((s) => s.status === 'dispatched').length,
    };
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return suppliers.filter((s) => {
      // Status dropdown filter
      if (activeTab === 'critical' && (s.status === 'dispatched' || s.urgency !== 'critical')) return false;
      if (activeTab === 'today' && (s.status === 'dispatched' || (s.urgency !== 'today' && s.urgency !== 'critical'))) return false;
      if (activeTab === 'later' && (s.status === 'dispatched' || s.urgency !== 'later')) return false;
      if (activeTab === 'completed' && s.status !== 'dispatched') return false;

      // Keyword filter
      if (kw) {
        const matchName = s.name.toLowerCase().includes(kw);
        const matchCode = s.code.toLowerCase().includes(kw);
        const matchTag = s.categoryTags.some((t) => t.toLowerCase().includes(kw));
        const matchItem = s.items.some((it) => it.name.toLowerCase().includes(kw) || it.sku.toLowerCase().includes(kw));
        if (!matchName && !matchCode && !matchTag && !matchItem) return false;
      }

      return true;
    });
  }, [suppliers, activeTab, keyword]);

  // Paginated Suppliers
  const pagedSuppliers = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, pageIndex, pageSize]);

  // Drawer Navigation helpers
  const selectedDrawerSupplier = useMemo(() => {
    if (!selectedDrawerSupplierId) return null;
    return suppliers.find((s) => s.id === selectedDrawerSupplierId) || null;
  }, [suppliers, selectedDrawerSupplierId]);

  const currentDrawerIndex = useMemo(() => {
    if (!selectedDrawerSupplierId) return -1;
    return filteredSuppliers.findIndex((s) => s.id === selectedDrawerSupplierId);
  }, [filteredSuppliers, selectedDrawerSupplierId]);

  const hasPrevSupplier = currentDrawerIndex > 0;
  const hasNextSupplier = currentDrawerIndex >= 0 && currentDrawerIndex < filteredSuppliers.length - 1;

  const handlePrevSupplier = () => {
    if (hasPrevSupplier) {
      setSelectedDrawerSupplierId(filteredSuppliers[currentDrawerIndex - 1].id);
    }
  };

  const handleNextSupplier = () => {
    if (hasNextSupplier) {
      setSelectedDrawerSupplierId(filteredSuppliers[currentDrawerIndex + 1].id);
    }
  };

  return (
    <div className="po-matrix-container" style={{ width: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Tiêu đề trang đơn giản theo yêu cầu ── */}
      <div style={{ marginBottom: 10 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text-main)',
            margin: 0,
          }}
        >
          Chốt đơn với nhà cung cấp
        </h1>
      </div>

      {/* ── BỘ LỌC TÌM KIẾM & CHỌN TRẠNG THÁI / CHI NHÁNH ── */}
      <DispatchFilterBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPageIndex(1);
        }}
        counts={tabCounts}
        keyword={keyword}
        onKeywordChange={(kw) => {
          setKeyword(kw);
          setPageIndex(1);
        }}
        branches={MOCK_BRANCHES}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => setSelectedBranchId(id)}
        onResetFilters={() => {
          setActiveTab('all');
          setKeyword('');
          setPageIndex(1);
        }}
      />

      {/* ── BẢNG DỮ LIỆU CHÍNH CÓ PHÂN TRANG (MAIN DATA TABLE + PAGING) ── */}
      <SupplierDispatchTable
        suppliers={pagedSuppliers}
        totalCount={filteredSuppliers.length}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={(page) => setPageIndex(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(1);
        }}
        onOpenDrawer={(id) => setSelectedDrawerSupplierId(id)}
        onDispatchSingle={handleOpenDispatchSingle}
      />

      {/* ── NGĂN KÉO CHI TIẾT (SLIDE-OVER DRAWER) ── */}
      <SupplierDispatchDrawer
        supplier={selectedDrawerSupplier}
        isOpen={Boolean(selectedDrawerSupplierId)}
        onClose={() => setSelectedDrawerSupplierId(null)}
        onPrevSupplier={handlePrevSupplier}
        onNextSupplier={handleNextSupplier}
        hasPrev={hasPrevSupplier}
        hasNext={hasNextSupplier}
        currentIndex={currentDrawerIndex >= 0 ? currentDrawerIndex : undefined}
        totalSuppliersCount={filteredSuppliers.length}
        onUpdateItemQty={handleUpdateItemQty}
        onDeleteItem={handleDeleteItem}
        onUpdateNote={handleUpdateNote}
        onDispatch={handleOpenDispatchSingle}
      />

      {/* ── MODAL XÁC NHẬN PHÁT HÀNH PO ── */}
      <DispatchConfirmModal
        isOpen={modalState.isOpen}
        targetSuppliers={modalState.targets}
        isBatch={modalState.isBatch}
        onClose={() => setModalState({ isOpen: false, targets: [], isBatch: false })}
        onConfirm={handleConfirmDispatch}
      />
    </div>
  );
};

export default SupplierOrderDispatchHubPage;
