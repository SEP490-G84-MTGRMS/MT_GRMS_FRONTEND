import { useState, useRef } from 'react';
import type { FC } from 'react';
import {
  Calculator,
  FileText,
  History,
  BarChart3,
  Sliders,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxKPICards } from '../components/TaxKPICards';
import { TaxSnapshotFilterBar } from '../components/TaxSnapshotFilterBar';
import { TaxSnapshotTable } from '../components/TaxSnapshotTable';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { TaxExportModal } from '../components/TaxExportModal';
import { TaxDeclarationFormView } from '../components/TaxDeclarationFormView';
import { TaxAnalyticsSection } from '../components/TaxAnalyticsSection';
import { TaxRateSettingsView } from '../components/TaxRateSettingsView';
import type { TaxSnapshot, TaxSnapshotStatus } from '../types/taxSnapshot';
import '../tax-snapshot.css';

const CURRENT_YEAR = new Date().getFullYear();

type ActiveTaxTab = 'declaration' | 'history' | 'analytics' | 'settings';

export const TaxSnapshotPage: FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>('declaration');

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

  const latestSnapshot = snapshots[0];

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

        {/* Top Header Banner with Revenue Alert */}
        <div className="tax-topbar-wrapper">
          <div className="tax-topbar-container">
            <div className="tax-topbar-title-group">
              <div className="tax-topbar-icon">
                <Calculator size={26} />
              </div>
              <div className="tax-topbar-text">
                <h1 className="tax-topbar-title">Kế toán & Kê khai Thuế Hộ kinh doanh</h1>
                <p className="tax-topbar-subtitle">
                  Phân hệ Quản lý Tài chính & Thuế (FE-19) — Quy chuẩn Thông tư 40/2021/TT-BTC
                </p>
              </div>
            </div>

            {/* Threshold Notification Banner & Fast Action */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <div className="tax-threshold-banner">
                <div className="tax-threshold-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="tax-threshold-title">DOANH THU AN TOÀN NHÓM 2</div>
                  <div className="tax-threshold-desc">Lũy kế 1.41 tỷ / Ngưỡng trần 3.00 tỷ VNĐ</div>
                </div>
              </div>

              <button onClick={() => setIsCreateOpen(true)} className="btn-primary-pill">
                <Plus size={16} />
                <span>Tạo kỳ tính thuế</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <TaxKPICards kpis={kpis} isLoading={isKpiLoading} year={filterParams.year || CURRENT_YEAR} />

        {/* Workspace Tab Navigation */}
        <div className="tax-segmented-tabs">
          <button
            onClick={() => setActiveTab('declaration')}
            className={`tax-segmented-tab-btn ${activeTab === 'declaration' ? 'active' : ''}`}
          >
            <FileText size={16} />
            <span>Tờ khai thuế Quý (Form 01/CNKD)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`tax-segmented-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          >
            <History size={16} />
            <span>Lịch sử các kỳ tính thuế ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`tax-segmented-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Phân tích biểu đồ 4 Quý</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`tax-segmented-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Sliders size={16} />
            <span>Biểu thuế suất HKD (TT 40)</span>
          </button>
        </div>

        {/* Tab 1: Declaration Form */}
        {activeTab === 'declaration' && (
          <TaxDeclarationFormView
            latestSnapshot={latestSnapshot}
            onOpenCreateModal={() => setIsCreateOpen(true)}
            onOpenExportModal={(s) => {
              setExportSnapshot(s);
              setIsExportOpen(true);
            }}
          />
        )}

        {/* Tab 2: Snapshots History Table */}
        {activeTab === 'history' && (
          <div>
            <TaxSnapshotFilterBar
              filterParams={filterParams}
              onFilterChange={setFilterParams}
              onOpenCreateModal={() => setIsCreateOpen(true)}
            />
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
          </div>
        )}

        {/* Tab 3: Analytics Section */}
        {activeTab === 'analytics' && (
          <TaxAnalyticsSection snapshots={snapshots} year={filterParams.year || CURRENT_YEAR} />
        )}

        {/* Tab 4: Tax Rate Settings */}
        {activeTab === 'settings' && <TaxRateSettingsView />}

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
