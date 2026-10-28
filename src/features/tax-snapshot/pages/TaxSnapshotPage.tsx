import { useState } from 'react';
import type { FC } from 'react';
import {
  Calculator,
  History,
  BarChart3,
  BookOpen,
  Plus,
  RotateCcw,
  AlertCircle,
  Calendar,
  Scale,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxKPICards } from '../components/TaxKPICards';
import { TaxSnapshotTable } from '../components/TaxSnapshotTable';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { TaxExportModal } from '../components/TaxExportModal';
import { TaxDeclarationFormView } from '../components/TaxDeclarationFormView';
import { TaxAnalyticsSection } from '../components/TaxAnalyticsSection';
import { AccountingBooksView } from '../components/AccountingBooksView';
import { ThresholdRuler } from '../../../components/common/ThresholdRuler';
import { isUsingMockData } from '../api/taxSnapshotApi';
import {
  TaxPeriodType,
  type CreateTaxSnapshotRequest,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import '../tax-snapshot.css';

type ActiveTaxTab = 'declaration' | 'books' | 'history' | 'analytics';

export const TaxSnapshotPage: FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>('declaration');

  const {
    summary,
    isSummaryLoading,
    summaryError,
    refetchSummary,
    snapshots,
    isSnapshotsLoading,
    filterParams,
    setCalculationMethod,
    setPeriod,
    setYear,
    setApplyVatReduction,
    createSnapshot,
  } = useTaxSnapshots(2026);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<HouseholdTaxSnapshotDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const handlePeriodTypeChange = (pType: TaxPeriodType) => {
    const defaultNumber = pType === TaxPeriodType.Month ? 10 : pType === TaxPeriodType.Quarter ? 3 : 2026;
    setPeriod(pType, defaultNumber);
  };

  const handlePeriodNumberChange = (num: number) => {
    setPeriod(filterParams.periodType, num);
  };

  const handleCreateSnapshot = async (req: CreateTaxSnapshotRequest) => {
    console.info('[TaxSnapshot] Dispatching finalization payload:', {
      year: req.year,
      periodType: req.periodType,
      periodNumber: req.periodNumber,
      calculationMethod: req.calculationMethod,
      applyVatReduction2026: req.applyVatReduction2026,
      pinProvided: Boolean(req.pin),
    });

    try {
      const result = await createSnapshot(req);
      setToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        message: `Chốt kỳ tính thuế thành công! Mã tham chiếu: ${result.id}`,
      });
      setActiveTab('history');
    } catch (err: any) {
      setToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        message: err.message || 'Không thể chốt kỳ tính thuế do lỗi bảo mật mã PIN.',
      });
      throw err;
    }
  };

  const periodLabel =
    filterParams.periodType === TaxPeriodType.Month
      ? `Tháng ${filterParams.periodNumber}/${filterParams.year}`
      : filterParams.periodType === TaxPeriodType.Quarter
      ? `Quý ${filterParams.periodNumber}/${filterParams.year}`
      : `Cả năm ${filterParams.year}`;

  return (
    <div className="tax-page">
      {/* Toast Notification Container */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Main Content Container */}
      <div className="tax-content-container">
        {/* Demo Banner */}
        {isUsingMockData() && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              marginTop: 16,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: '0.84rem', color: '#92400E' }}>
              Chế độ dữ liệu mẫu: máy chủ chưa kết nối, số liệu chỉ để xem thiết kế, không dùng để kê khai.
            </span>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="tax-topbar-wrapper">
          <div className="tax-topbar-container">
            <div className="tax-topbar-title-group">
              <div className="tax-topbar-icon">
                <Scale size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 className="tax-topbar-title">Thuế hộ kinh doanh</h1>
                  <span
                    style={{
                      background: '#CCFBF1',
                      color: '#0F766E',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 9999,
                      border: '1px solid #99F6E4',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Nhóm 2: 1 – 3 tỷ (Sổ S2a)
                  </span>
                </div>
                <p className="tax-topbar-subtitle">
                  Kiểm soát ngưỡng 1 tỷ, quản lý kê khai thuế và hệ thống 5 sổ kế toán HKD.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Period Selector: Type & Number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#F8FAFC',
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                }}
              >
                <Calendar size={15} style={{ color: '#0F766E' }} />
                <select
                  value={filterParams.periodType}
                  onChange={(e) => handlePeriodTypeChange(Number(e.target.value) as TaxPeriodType)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={TaxPeriodType.Quarter}>Theo Quý</option>
                  <option value={TaxPeriodType.Month}>Theo Tháng</option>
                  <option value={TaxPeriodType.Year}>Cả Năm</option>
                </select>

                {filterParams.periodType === TaxPeriodType.Quarter && (
                  <select
                    value={filterParams.periodNumber}
                    onChange={(e) => handlePeriodNumberChange(Number(e.target.value))}
                    style={{
                      border: 'none',
                      background: '#E2E8F0',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#0F766E',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value={1}>Quý 1</option>
                    <option value={2}>Quý 2</option>
                    <option value={3}>Quý 3</option>
                    <option value={4}>Quý 4</option>
                  </select>
                )}

                {filterParams.periodType === TaxPeriodType.Month && (
                  <select
                    value={filterParams.periodNumber}
                    onChange={(e) => handlePeriodNumberChange(Number(e.target.value))}
                    style={{
                      border: 'none',
                      background: '#E2E8F0',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#0F766E',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={filterParams.year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{
                    border: 'none',
                    background: '#E2E8F0',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#475569',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refetchSummary()}
                disabled={isSummaryLoading}
                className="btn-secondary-pill"
                title="Cập nhật số liệu mới nhất từ quầy thu ngân"
              >
                <RotateCcw size={15} className={isSummaryLoading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>

              {/* Finalize Button */}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary-pill"
              >
                <Plus size={16} />
                <span>Chốt số kỳ {periodLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Retry Banner */}
        {summaryError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} style={{ color: '#DC2626' }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#991B1B' }}>Không thể kết nối máy chủ tính thuế</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#B91C1C' }}>
                  Đang hiển thị số liệu ngoại tuyến. Bấm thử lại để kết nối lại máy chủ.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetchSummary()}
              style={{
                padding: '6px 14px',
                background: '#DC2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* 1. Top 5 KPI Cards (Placed immediately below Header per design convention) */}
        <TaxKPICards summary={summary} isLoading={isSummaryLoading} />

        {/* 2. 1 Billion Revenue Ruler (Compact status tracker directly below KPIs) */}
        <ThresholdRuler
          currentYtdRevenue={summary?.annualAccumulatedRevenue ?? 1_417_500_000}
          threshold={summary?.taxExemptionThreshold ?? 1_000_000_000}
          year={filterParams.year}
        />

        {/* 3. Segmented Pill Tabs */}
        <div className="tax-segmented-tabs">
          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'declaration' ? 'active' : ''}`}
            onClick={() => setActiveTab('declaration')}
          >
            <Calculator size={16} />
            <span>Tờ khai & Phương pháp tính</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <BookOpen size={16} />
            <span>Sổ kế toán HKD</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Lịch sử các kỳ đã chốt ({snapshots.length})</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>Phân tích & Tiến độ năm</span>
          </button>
        </div>

        {/* Tab 1: Declaration & Method View */}
        {activeTab === 'declaration' && (
          <TaxDeclarationFormView
            summary={summary}
            calculationMethod={filterParams.calculationMethod}
            onSelectCalculationMethod={setCalculationMethod}
            applyVatReduction={Boolean(filterParams.applyVatReduction2026)}
            onToggleVatReduction={setApplyVatReduction}
            isLoading={isSummaryLoading}
          />
        )}

        {/* Tab 2: Accounting Books View */}
        {activeTab === 'books' && (
          <AccountingBooksView
            summary={summary}
            year={filterParams.year}
            periodType={filterParams.periodType}
            periodNumber={filterParams.periodNumber}
          />
        )}

        {/* Tab 3: Historical Snapshots Table */}
        {activeTab === 'history' && (
          <TaxSnapshotTable
            snapshots={snapshots as any}
            isLoading={isSnapshotsLoading}
            onViewDetail={(snap: any) => {
              setSelectedSnapshot(snap);
              setIsDrawerOpen(true);
            }}
            onExport={(snap: any) => {
              setSelectedSnapshot(snap);
              setIsExportOpen(true);
            }}
            onFinalize={() => {}}
            onMarkPaid={() => {}}
            onDelete={() => {}}
          />
        )}

        {/* Tab 4: Analytics */}
        {activeTab === 'analytics' && (
          <TaxAnalyticsSection
            snapshots={snapshots as any}
            year={filterParams.year}
          />
        )}
      </div>

      {/* Finalize Modal */}
      {isCreateOpen && (
        <CreateTaxSnapshotModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          summary={summary}
          calculationMethod={filterParams.calculationMethod}
          applyVatReduction={Boolean(filterParams.applyVatReduction2026)}
          onSubmit={handleCreateSnapshot}
        />
      )}

      {/* Snapshot Detail Drawer */}
      <TaxSnapshotDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedSnapshot(null);
        }}
        snapshot={selectedSnapshot}
      />

      {/* Export Modal */}
      <TaxExportModal
        isOpen={isExportOpen}
        onClose={() => {
          setIsExportOpen(false);
          setSelectedSnapshot(null);
        }}
        snapshot={selectedSnapshot}
      />
    </div>
  );
};
