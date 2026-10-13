import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, ArrowLeft, Layers } from 'lucide-react';
import { MOCK_DISPATCH_SUPPLIERS } from '../lib/mockDispatchData';
import { MOCK_BRANCHES } from '../lib/mockData';
import type { SupplierDispatchGroup } from '../types/po.types';
import { DispatchUrgencyBar } from '../components/dispatch/DispatchUrgencyBar';
import { DispatchFilterBar, type DispatchTabType } from '../components/dispatch/DispatchFilterBar';
import { SupplierDispatchCard } from '../components/dispatch/SupplierDispatchCard';
import { DispatchConfirmModal } from '../components/dispatch/DispatchConfirmModal';
import { AdminToast, type ToastState } from '../../admin/components';

export const SupplierOrderDispatchHubPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Branch scope
  const branchParam = searchParams.get('branchId') || searchParams.get('branch') || 'DC1';
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchParam);
  const currentBranch = useMemo(() => {
    return MOCK_BRANCHES.find((b) => b.id === selectedBranchId) || MOCK_BRANCHES[0];
  }, [selectedBranchId]);

  // Master State: Suppliers
  const [suppliers, setSuppliers] = useState<SupplierDispatchGroup[]>(MOCK_DISPATCH_SUPPLIERS);

  // Accordion Expand State: default expand critical ones (< 2 hours)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    MOCK_DISPATCH_SUPPLIERS.filter((s) => s.urgency === 'critical').forEach((s) => set.add(s.id));
    return set;
  });

  // Filter States
  const [activeTab, setActiveTab] = useState<DispatchTabType>('all');
  const [keyword, setKeyword] = useState<string>('');

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

  // Toggle Accordion Card
  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Inline Quantity Edit
  const handleUpdateItemQty = (supplierId: string, itemId: string, newQty: number) => {
    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id !== supplierId) return sup;
        const updatedItems = sup.items.map((it) => (it.id === itemId ? { ...it, qty: newQty } : it));
        return { ...sup, items: updatedItems };
      })
    );
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

  // Open Dispatch Modal for all today's suppliers (critical + today)
  const handleOpenDispatchToday = () => {
    const todayDueSuppliers = suppliers.filter(
      (s) => s.status !== 'dispatched' && (s.urgency === 'critical' || s.urgency === 'today')
    );
    if (todayDueSuppliers.length === 0) {
      showToast('Không có nhà cung cấp nào cần chốt trong hôm nay.', 'info');
      return;
    }
    setModalState({
      isOpen: true,
      targets: todayDueSuppliers,
      isBatch: true,
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
      modalState.isBatch
        ? `Đã chốt & phát hành thành công ${modalState.targets.length} Purchase Order cho các NCC hôm nay!`
        : `Đã phát hành đơn mua hàng PO thành công cho ${modalState.targets[0].name}!`,
      'success'
    );
  };

  // Calculate Metrics
  const metrics = useMemo(() => {
    const draftSuppliers = suppliers.filter((s) => s.status !== 'dispatched');
    const totalAmount = draftSuppliers.reduce(
      (sum, s) => sum + s.items.reduce((acc, it) => acc + it.qty * it.price, 0),
      0
    );
    const totalSkus = draftSuppliers.reduce(
      (sum, s) => sum + s.items.filter((it) => it.qty > 0).length,
      0
    );
    const critical = draftSuppliers.filter((s) => s.urgency === 'critical').length;
    const today = draftSuppliers.filter((s) => s.urgency === 'today').length;
    const later = draftSuppliers.filter((s) => s.urgency === 'later').length;
    const completed = suppliers.filter((s) => s.status === 'dispatched').length;

    return {
      totalSuppliers: draftSuppliers.length,
      totalAmount,
      totalSkus,
      critical,
      today,
      later,
      completed,
    };
  }, [suppliers]);

  // Tab counts
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
      // Tab filter
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

  return (
    <div className="po-matrix-container" style={{ width: '100%' }}>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header (matching BranchOrderListPage & OrderMatrixPage style) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
            <span style={{ color: 'var(--blue-primary, #0d9488)', display: 'inline-flex' }}>⚡</span>
            <span>Trung tâm chốt đơn & tách PO theo nhà cung cấp</span>
          </h1>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            Chi nhánh: {currentBranch.name}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/create-matrix')}
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 14px' }}
            title="Mở Bảng Lưới Đặt Hàng Ma Trận"
          >
            <Grid size={14} color="#0d9488" />
            <span>Bảng lưới đặt hàng</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/store-owner/purchase-orders/branches')}
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            title="Quay lại danh sách chi nhánh"
          >
            <ArrowLeft size={14} />
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      {/* ── KHU VỰC 1: TOP URGENCY BAR ── */}
      <DispatchUrgencyBar
        totalSuppliers={metrics.totalSuppliers}
        totalSkuCount={metrics.totalSkus}
        totalAmount={metrics.totalAmount}
        criticalCount={metrics.critical}
        todayCount={metrics.today}
        laterCount={metrics.later}
        completedCount={metrics.completed}
        onQuickDispatchToday={handleOpenDispatchToday}
      />

      {/* ── KHU VỰC 2: FILTER & GROUPING TABS ── */}
      <DispatchFilterBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        counts={tabCounts}
        keyword={keyword}
        onKeywordChange={(kw) => setKeyword(kw)}
        branches={MOCK_BRANCHES}
        selectedBranchId={selectedBranchId}
        onSelectBranch={(id) => setSelectedBranchId(id)}
        onResetFilters={() => {
          setActiveTab('all');
          setKeyword('');
        }}
      />

      {/* ── KHU VỰC 3: DANH SÁCH THẺ NCC (ACCORDION 2 TẦNG) ── */}
      <div>
        {filteredSuppliers.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <Layers size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#334155' }}>
              Không tìm thấy đơn hàng Nhà cung cấp phù hợp
            </h4>
            <p style={{ margin: 0, fontSize: 13 }}>
              Vui lòng thử chọn lại tab hoặc điều chỉnh từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <SupplierDispatchCard
              key={supplier.id}
              supplier={supplier}
              isExpanded={expandedIds.has(supplier.id)}
              onToggleExpand={() => handleToggleExpand(supplier.id)}
              onUpdateItemQty={handleUpdateItemQty}
              onUpdateNote={handleUpdateNote}
              onDispatch={handleOpenDispatchSingle}
            />
          ))
        )}
      </div>

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
