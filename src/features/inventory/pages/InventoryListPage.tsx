import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Hourglass, Download, Printer } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { InventoryFilterState, InventoryItem, InventoryKpiSummary } from '../types/inventory.types';
import { inventoryApi } from '../api/inventoryApi';
import { InventoryKpiCards } from '../components/InventoryKpiCards';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryBatchDrawer } from '../components/InventoryBatchDrawer';
import '../../purchase-order/purchase-order.css';

const DEFAULT_FILTERS: InventoryFilterState = {
  keyword: '',
  branchId: '',
  category: '',
  location: '',
  stockStatus: '',
  pageIndex: 1,
  pageSize: 10,
};

export const InventoryListPage: FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const lockedBranch = !isStoreOwner && userBranchId ? userBranchId : '';

  const [draft, setDraft] = useState<InventoryFilterState>({
    ...DEFAULT_FILTERS,
    branchId: lockedBranch,
  });
  const [applied, setApplied] = useState<InventoryFilterState>({
    ...DEFAULT_FILTERS,
    branchId: lockedBranch,
  });

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<InventoryKpiSummary>({
    skuCount: 0,
    branchCount: 2,
    totalValue: 0,
    onOrderUnits: 0,
    lowCount: 0,
    outCount: 0,
    expiryBatchCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<InventoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await inventoryApi.getStockSummary(applied);
      setItems(res.items);
      setTotalCount(res.totalCount);
      setSummary(res.kpiSummary);
    } catch {
      // Handled in api
    } finally {
      setIsLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('Không có dữ liệu tồn kho để xuất.');
      return;
    }

    // Generate CSV content with BOM for UTF-8 Vietnamese support
    const headers = [
      'STT',
      'Mã SKU',
      'Tên sản phẩm',
      'Ngành hàng',
      'Chi nhánh',
      'Vị trí kệ',
      'ĐVT',
      'Tồn thực tế',
      'Đã giữ',
      'Khả dụng',
      'Đang nhập',
      'Định mức đặt',
      'Giá vốn bình quân',
      'Tổng giá trị tồn',
      'Trạng thái',
    ];

    const rows = items.map((item, idx) => [
      idx + 1,
      `"${item.sku}"`,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.categoryLabel}"`,
      `"${item.branchName}"`,
      `"${item.location}"`,
      `"${item.unit}"`,
      item.onHand,
      item.committed,
      item.available,
      item.onOrder,
      item.reorderPoint,
      item.avgCost,
      item.totalValue,
      item.status === 'Low' ? 'Sắp hết' : item.status === 'Out' ? 'Hết hàng' : 'Đủ hàng',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_cao_ton_kho_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Đã xuất báo cáo tồn kho ra tệp Excel (.csv) thành công!');
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
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 10000,
            background: '#0f766e',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeIn 0.2s',
          }}
        >
          {toastMessage}
        </div>
      )}

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
          <Boxes size={22} color="var(--blue-primary, #0f766e)" />
          <span>Tồn kho cửa hàng</span>
          {isLoading && <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>(Đang tải...)</span>}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 12px' }}
            onClick={handleExportExcel}
            title="Xuất bảng tồn kho ra Excel"
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 12px' }}
            onClick={handlePrint}
            title="In báo cáo tồn kho A4"
          >
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => navigate('/store-owner/batches')}
          >
            <Hourglass size={14} />
            <span>Quản lý lô &amp; HSD</span>
          </button>
        </div>
      </div>

      <InventoryKpiCards summary={summary} />

      <InventoryFilterBar
        draft={draft}
        totalFiltered={items.length}
        totalAll={totalCount}
        lockBranch={Boolean(lockedBranch)}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onSearch={() => setApplied({ ...draft, pageIndex: 1 })}
        onReset={() => {
          const reset = { ...DEFAULT_FILTERS, branchId: lockedBranch };
          setDraft(reset);
          setApplied(reset);
        }}
      />

      <InventoryTable
        items={items}
        totalCount={totalCount}
        pageIndex={applied.pageIndex}
        pageSize={applied.pageSize}
        onPageChange={(page) => setApplied((prev) => ({ ...prev, pageIndex: page }))}
        onPageSizeChange={(size) => setApplied((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }))}
        onViewBatches={(item) => setSelectedItemForDrawer(item)}
      />

      {/* Slide-over Drawer for FEFO Batches */}
      {selectedItemForDrawer && (
        <InventoryBatchDrawer
          isOpen={Boolean(selectedItemForDrawer)}
          onClose={() => setSelectedItemForDrawer(null)}
          item={selectedItemForDrawer}
        />
      )}
    </div>
  );
};

export default InventoryListPage;
