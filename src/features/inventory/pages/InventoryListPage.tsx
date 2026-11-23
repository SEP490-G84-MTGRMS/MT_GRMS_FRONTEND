import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Hourglass, Download, Printer, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { InventoryFilterState, InventoryItem } from '../types/inventory.types';
import { DEFAULT_INVENTORY_FILTERS } from '../types/inventory.types';
import { inventoryApi } from '../api/inventoryApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryTable } from '../components/InventoryTable';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';

function tokenMatches(value: string | undefined, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = (value || '').toLowerCase();
  return tokens.some((t) => hay.includes(t.trim().toLowerCase()));
}

function resolveUniqueBranchId(
  options: { id: string; code: string; name: string }[],
  codes: string[],
  names: string[]
): string {
  if (!codes.length && !names.length) return '';
  const matched = options.filter(
    (o) => tokenMatches(o.code, codes) && tokenMatches(o.name, names)
  );
  return matched.length === 1 ? matched[0].id : '';
}

export const InventoryListPage: FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const lockedBranch = !isStoreOwner && userBranchId ? userBranchId : '';

  const [applied, setApplied] = useState<InventoryFilterState>({
    ...DEFAULT_INVENTORY_FILTERS,
    branchId: lockedBranch,
  });

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [branchOptions, setBranchOptions] = useState<{ id: string; code: string; name: string }[]>(
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await branchApi.getBranches({
          status: 'all',
          pageIndex: 1,
          pageSize: 100,
        });
        if (!mounted) return;
        setBranchOptions(
          (res.items ?? []).map((b) => ({
            id: b.id,
            code: b.code || '',
            name: b.name,
          }))
        );
      } catch {
        if (!mounted) return;
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const resolvedBranchId =
        lockedBranch ||
        resolveUniqueBranchId(branchOptions, applied.branchCodes, applied.branchNames) ||
        applied.branchId;

      const hasChipFilters =
        applied.skus.length > 0 ||
        applied.names.length > 0 ||
        applied.branchCodes.length > 0 ||
        applied.branchNames.length > 0;

      const fetchFilters: InventoryFilterState = {
        ...applied,
        branchId: resolvedBranchId,
        pageIndex: hasChipFilters ? 1 : applied.pageIndex,
        pageSize: hasChipFilters ? Math.max(applied.pageSize, 100) : applied.pageSize,
      };

      const res = await inventoryApi.getStockSummary(fetchFilters);
      let mapped = res.items;

      if (hasChipFilters) {
        mapped = mapped.filter(
          (o) =>
            tokenMatches(o.sku, applied.skus) &&
            tokenMatches(o.productName, applied.names) &&
            tokenMatches(o.branchCode || o.branchName, applied.branchCodes) &&
            tokenMatches(o.branchName, applied.branchNames)
        );
        const total = mapped.length;
        const start = (applied.pageIndex - 1) * applied.pageSize;
        setItems(mapped.slice(start, start + applied.pageSize));
        setTotalCount(total);
      } else {
        setItems(mapped);
        setTotalCount(res.totalCount);
      }
    } catch (err: any) {
      setItems([]);
      setTotalCount(0);
      setToastMessage(err?.message || 'Không tải được tồn kho. Kiểm tra kết nối API.');
      setTimeout(() => setToastMessage(''), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [applied, branchOptions, lockedBranch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSearch = (values: InventoryFilterState) => {
    const resolvedBranchId =
      lockedBranch ||
      resolveUniqueBranchId(branchOptions, values.branchCodes, values.branchNames) ||
      '';
    setApplied({ ...values, branchId: resolvedBranchId, pageIndex: 1 });
  };

  const handleReset = () => {
    setApplied({ ...DEFAULT_INVENTORY_FILTERS, branchId: lockedBranch, pageSize: applied.pageSize });
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('Không có dữ liệu tồn kho để xuất.');
      return;
    }

    const headers = [
      'STT',
      'Mã hàng',
      'Tên sản phẩm',
      'Ngành hàng',
      'Chi nhánh',
      'Vị trí kệ',
      'ĐVT',
      'Tồn',
      'Cách ly/Giữ',
      'Khả dụng',
      'Đang đặt',
      'Điểm đặt lại',
      'Giá vốn',
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
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
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

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Boxes size={22} color="var(--blue-primary, #0f766e)" />
            <span>Tồn kho cửa hàng</span>
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
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={handleExportExcel}
            title="Xuất bảng tồn kho ra Excel"
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={handlePrint}
            title="In báo cáo tồn kho A4"
          >
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/batches')}
          >
            <Hourglass size={14} />
            <span>Quản lý lô &amp; HSD</span>
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <InventoryFilterBar
          initialValues={applied}
          lockBranch={Boolean(lockedBranch)}
          branches={branchOptions}
          products={items.map((i) => ({ sku: i.sku, productName: i.productName }))}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <InventoryTable
        items={items}
        totalCount={totalCount}
        pageIndex={applied.pageIndex}
        pageSize={applied.pageSize}
        onPageChange={(page) => setApplied((prev) => ({ ...prev, pageIndex: page }))}
        onPageSizeChange={(size) =>
          setApplied((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }))
        }
        onViewBatches={(item) => {
          const params = new URLSearchParams();
          params.set('sku', item.sku);
          if (item.branchId) params.set('branch', item.branchId);
          params.set('from', 'inventory');
          navigate(`/store-owner/batches?${params.toString()}`);
        }}
      />
    </div>
  );
};

export default InventoryListPage;
