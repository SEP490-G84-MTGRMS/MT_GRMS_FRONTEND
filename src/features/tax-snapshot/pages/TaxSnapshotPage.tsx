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
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxKPICards } from '../components/TaxKPICards';
import { TaxSnapshotsHistoryView } from '../components/TaxSnapshotsHistoryView';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import { TaxRateConfigModal } from '../components/TaxRateConfigModal';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { TaxExportModal } from '../components/TaxExportModal';
import { TaxDeclarationFormView } from '../components/TaxDeclarationFormView';
import { TaxAnalyticsSection } from '../components/TaxAnalyticsSection';
import { AccountingBooksView } from '../components/AccountingBooksView';
import { ThresholdRuler } from '../../../components/common/ThresholdRuler';
import { isUsingMockData, taxSnapshotApi } from '../api/taxSnapshotApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  TaxPeriodType,
  type CreateTaxSnapshotRequest,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import '../tax-snapshot.css';

type ActiveTaxTab = 'declaration' | 'books' | 'history' | 'analytics';

export const TaxSnapshotPage: FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>('declaration');
  const { user } = useAuthStore();
  const userRole = (user?.role || '').toUpperCase();
  const isEmployee = userRole === 'EMPLOYEE' || userRole === 'CASHIER' || userRole === 'STAFF';

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
    updateTaxRates,
    resetTaxRatesToDefault,
    createSnapshot,
  } = useTaxSnapshots(2026);

  // Modals & Drawers
  const [isRateConfigOpen, setIsRateConfigOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<HouseholdTaxSnapshotDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const blob = await taxSnapshotApi.exportTaxExcel(filterParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const pCode = filterParams.periodType === TaxPeriodType.Quarter ? `Q${filterParams.periodNumber}` : `T${filterParams.periodNumber}`;
      a.download = `BaoCaoThue_${filterParams.year}_${pCode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        message: 'Xuất file Excel báo cáo thuế thành công!',
      });
    } catch (err: any) {
      setToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        message: err.message || 'Không thể xuất file Excel báo cáo thuế.',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePeriodTypeChange = (pType: TaxPeriodType) => {
    const defaultNumber = pType === TaxPeriodType.Month ? 1 : pType === TaxPeriodType.Quarter ? 1 : 2026;
    setPeriod(pType, defaultNumber);
  };

  const handlePeriodNumberChange = (num: number) => {
    setPeriod(filterParams.periodType, num);
  };

  const handleCreateSnapshot = async (req: CreateTaxSnapshotRequest): Promise<HouseholdTaxSnapshotDto> => {
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
      return result;
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
                    {summary?.householdGroupName
                      ? `${summary.householdGroupName} (${summary.booksSummary?.primaryBookCode || 'S2a-HKD'})`
                      : 'Nhóm 2: 1 – 3 tỷ (Sổ S2a)'}
                  </span>
                </div>
                <p className="tax-topbar-subtitle">
                  Kiểm soát ngưỡng 1 tỷ, quản lý kê khai thuế và hệ thống 7 sổ kế toán HKD (Thông tư 152/2025/TT-BTC).
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

              {/* Tax Rate Config Button (Ẩn đối với Employee) */}
              {!isEmployee && (
                <button
                  type="button"
                  onClick={() => setIsRateConfigOpen(true)}
                  className="btn-secondary-pill"
                  title="Cấu hình mức thuế suất GTGT, TNCN và chính sách giảm thuế"
                  style={{
                    position: 'relative',
                    ...(filterParams.customVatRate != null || filterParams.customPitRate != null
                      ? {
                          borderColor: '#0F766E',
                          color: '#0F766E',
                          background: '#F0FDFA',
                          fontWeight: 700,
                        }
                      : {}),
                  }}
                >
                  <SlidersHorizontal size={15} />
                  <span>Cấu hình thuế</span>
                  {(filterParams.customVatRate != null || filterParams.customPitRate != null) && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#0F766E',
                        display: 'inline-block',
                        marginLeft: 2,
                      }}
                    />
                  )}
                </button>
              )}

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

              {/* Export Excel Button (Ẩn đối với Employee) */}
              {!isEmployee && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || isSummaryLoading}
                  className="btn-secondary-pill"
                  title="Xuất bảng tính Excel 4 sheet phẳng phục vụ đối chiếu"
                >
                  <Download size={15} />
                  <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
                </button>
              )}

              {/* Finalize Button (Ẩn đối với Employee) */}
              {!isEmployee && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="btn-primary-pill"
                >
                  <Plus size={16} />
                  <span>🔐 Chốt kỳ sổ {periodLabel} (3 bước)</span>
                </button>
              )}
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

        {/* 1. Thước đo ngưỡng 1 tỷ đồng/năm (Threshold Ruler đặt ở đầu trang theo quy định BTC) */}
        <ThresholdRuler
          currentYtdRevenue={summary?.annualAccumulatedRevenue ?? 0}
          threshold={summary?.taxExemptionThreshold ?? 1_000_000_000}
          year={filterParams.year}
          periodType={filterParams.periodType}
          periodNumber={filterParams.periodNumber}
          householdGroup={summary?.householdGroup}
        />

        {/* 2. Top 5 KPI Cards */}
        <TaxKPICards summary={summary} isLoading={isSummaryLoading} />

        {/* 3. 4 Standardized TT152 Segmented Tabs */}
        <div className="tax-segmented-tabs">
          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'declaration' ? 'active' : ''}`}
            onClick={() => setActiveTab('declaration')}
          >
            <Calculator size={16} />
            <span>Tờ khai 01/CNKD</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <BookOpen size={16} />
            <span>7 Sổ kế toán TT152</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Chốt sổ bất biến (HMAC) ({snapshots.length})</span>
          </button>

          <button
            type="button"
            className={`tax-segmented-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>Phân tích 4 Quý</span>
          </button>
        </div>

        {/* Tab 1: Declaration & Method View */}
        {activeTab === 'declaration' && (
          <TaxDeclarationFormView
            summary={summary}
            calculationMethod={filterParams.calculationMethod}
            onSelectCalculationMethod={setCalculationMethod}
            applyVatReduction={Boolean(filterParams.applyVatReduction2026)}
            customVatRate={filterParams.customVatRate}
            customPitRate={filterParams.customPitRate}
            vatReductionPercentage={filterParams.vatReductionPercentage}
            onOpenRateConfig={() => setIsRateConfigOpen(true)}
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

        {/* Tab 3: Historical Snapshots Table (Bản chụp chốt sổ bất biến HMAC-SHA256) */}
        {activeTab === 'history' && (
          <TaxSnapshotsHistoryView
            snapshots={snapshots as any}
            isLoading={isSnapshotsLoading}
            onOpenSealWizard={() => setIsCreateOpen(true)}
            onViewDetail={(snap: any) => {
              setSelectedSnapshot(snap);
              setIsDrawerOpen(true);
            }}
            onExport={(snap: any) => {
              setSelectedSnapshot(snap);
              setIsExportOpen(true);
            }}
          />
        )}

        {/* Tab 4: Analytics */}
        {activeTab === 'analytics' && (
          <TaxAnalyticsSection
            snapshots={snapshots as any}
            year={filterParams.year}
            periodType={filterParams.periodType}
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
          customVatRate={filterParams.customVatRate}
          customPitRate={filterParams.customPitRate}
          vatReductionPercentage={filterParams.vatReductionPercentage}
          onSubmit={handleCreateSnapshot}
        />
      )}

      {/* Tax Rate Config Modal */}
      <TaxRateConfigModal
        isOpen={isRateConfigOpen}
        onClose={() => setIsRateConfigOpen(false)}
        currentRates={{
          customVatRate: filterParams.customVatRate,
          customPitRate: filterParams.customPitRate,
          vatReductionPercentage: filterParams.vatReductionPercentage,
          applyVatReduction2026: filterParams.applyVatReduction2026,
        }}
        onSave={(rates) => {
          updateTaxRates(rates);
          setToast({
            id: 'toast-' + Date.now(),
            type: 'success',
            message: 'Đã lưu cấu hình tham số thuế suất và áp dụng cho bảng tính.',
          });
        }}
        onResetToDefault={() => {
          resetTaxRatesToDefault();
          setToast({
            id: 'toast-' + Date.now(),
            type: 'info',
            message: 'Đã khôi phục mức thuế suất mặc định theo luật định.',
          });
        }}
      />

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
