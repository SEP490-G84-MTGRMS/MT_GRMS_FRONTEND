import { useState, useRef } from 'react';
import type { FC } from 'react';
import { Calculator } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxKPICards } from '../components/TaxKPICards';
import { TaxSnapshotFilterBar } from '../components/TaxSnapshotFilterBar';
import { TaxSnapshotTable } from '../components/TaxSnapshotTable';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { TaxExportModal } from '../components/TaxExportModal';
import type { TaxSnapshot, TaxSnapshotStatus } from '../types/taxSnapshot';
import '../tax-snapshot.css';

const CURRENT_YEAR = new Date().getFullYear();

export const TaxSnapshotPage: FC = () => {
  const {
    snapshots,
    isLoading,
    kpis,
    isKpiLoading,
    filterParams,
    setFilterParams,
    createSnapshot,
    updateStatus,
    deleteSnapshot,
  } = useTaxSnapshots(CURRENT_YEAR);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TaxSnapshot | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [exportSnapshot, setExportSnapshot] = useState<TaxSnapshot | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Toast State
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Handlers
  const handleCreate = async (data: {
    year: number;
    quarter: number;
    note?: string;
    asFinalized?: boolean;
  }) => {
    try {
      await createSnapshot(data);
      showToast(
        data.asFinalized
          ? `Đã chốt số liệu kỳ thuế Quý ${data.quarter}/${data.year} thành công!`
          : `Đã lưu nháp kỳ thuế Quý ${data.quarter}/${data.year}!`,
        'success'
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo kỳ thuế';
      showToast(errorMsg, 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: TaxSnapshotStatus) => {
    try {
      const updated = await updateStatus({ id, status });
      setSelectedSnapshot(updated);
      showToast(`Đã cập nhật trạng thái kỳ thuế sang: ${status}`, 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi cập nhật';
      showToast(errorMsg, 'error');
    }
  };

  const handleDelete = async (snapshot: TaxSnapshot) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản nháp kỳ thuế Quý ${snapshot.quarter}/${snapshot.year}?`)) {
      return;
    }
    try {
      await deleteSnapshot(snapshot.id);
      showToast('Đã xóa bản nháp thành công', 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể xóa';
      showToast(errorMsg, 'error');
    }
  };

  return (
    <div className="tax-page">
      <div className="tax-content-container">
        {/* Toast Notification */}
        {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

        {/* Top Header Banner */}
        <div className="tax-topbar-wrapper">
          <div className="tax-topbar-container">
            <div className="tax-topbar-title-group">
              <div className="tax-topbar-icon">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h1 className="tax-topbar-title">Kê khai & Chốt thuế Hộ kinh doanh</h1>
                <p className="tax-topbar-subtitle">
                  Phân hệ Quản lý Tài chính & Thuế (FE-19) — Quy chuẩn Thông tư 40/2021/TT-BTC
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <TaxKPICards kpis={kpis} isLoading={isKpiLoading} year={filterParams.year || CURRENT_YEAR} />

        {/* Filter and Action Bar */}
        <TaxSnapshotFilterBar
          filterParams={filterParams}
          onFilterChange={setFilterParams}
          onOpenCreateModal={() => setIsCreateOpen(true)}
        />

        {/* Snapshots Table */}
        <TaxSnapshotTable
          snapshots={snapshots}
          isLoading={isLoading}
          onViewDetail={(s) => {
            setSelectedSnapshot(s);
            setIsDrawerOpen(true);
          }}
          onFinalize={(s) => handleUpdateStatus(s.id, 'Finalized')}
          onMarkPaid={(s) => handleUpdateStatus(s.id, 'Paid')}
          onDelete={handleDelete}
        />

        {/* Modal: Create Snapshot */}
        <CreateTaxSnapshotModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />

        {/* Drawer: Snapshot Detail */}
        <TaxSnapshotDetailDrawer
          snapshot={selectedSnapshot}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onUpdateStatus={handleUpdateStatus}
          onOpenExportModal={(s) => {
            setExportSnapshot(s);
            setIsExportOpen(true);
          }}
        />

        {/* Modal: Export Tax Report */}
        <TaxExportModal
          snapshot={exportSnapshot}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      </div>
    </div>
  );
};
