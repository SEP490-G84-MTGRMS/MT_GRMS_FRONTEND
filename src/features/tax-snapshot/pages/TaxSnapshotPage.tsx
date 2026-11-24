import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calculator,
  History,
  BarChart3,
  BookOpen,
  RotateCcw,
  AlertCircle,
  Calendar,
  Scale,
  Download,
  SlidersHorizontal,
  KeyRound,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useTaxSnapshots } from '../hooks/useTaxSnapshots';
import { TaxSnapshotsHistoryView } from '../components/TaxSnapshotsHistoryView';
import { CreateTaxSnapshotModal } from '../components/CreateTaxSnapshotModal';
import { SecurityPinModal } from '../components/SecurityPinModal';
import { TaxRateConfigModal } from '../components/TaxRateConfigModal';
import { TaxSnapshotDetailDrawer } from '../components/TaxSnapshotDetailDrawer';
import { TaxExportModal } from '../components/TaxExportModal';
import { TaxDeclarationFormView } from '../components/TaxDeclarationFormView';
import { TaxAnalyticsSection } from '../components/TaxAnalyticsSection';
import { AccountingBooksView } from '../components/AccountingBooksView';
import { TaxOverviewCard } from '../components/TaxOverviewCard';
import { TaxDeclarationPreviewModal } from '../components/TaxDeclarationPreviewModal';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  TaxPeriodType,
  type CreateTaxSnapshotRequest,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import '../tax-snapshot.css';

type ActiveTaxTab = 'declaration' | 'books';
type AuxiliaryView = 'history' | 'analytics' | null;

export const TaxSnapshotPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSnapshotId = searchParams.get('snapshotId');
  const [activeTab, setActiveTab] = useState<ActiveTaxTab>('declaration');
  const [auxiliaryView, setAuxiliaryView] = useState<AuxiliaryView>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isDeclarationPreviewOpen, setIsDeclarationPreviewOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const auxiliaryDialogRef = useRef<HTMLElement>(null);
  const { user } = useAuthStore();
  const canManageTax = user?.role === 'STORE_OWNER';

  const {
    summary,
    isSummaryLoading,
    isSummaryRefetching,
    summaryError,
    refetchSummary,
    snapshots,
    isSnapshotsLoading,
    snapshotsError,
    refetchSnapshots,
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
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalInitialTab, setPinModalInitialTab] = useState<'change' | 'reset'>('change');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<HouseholdTaxSnapshotDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Snapshot hiện tại đã được chốt hay chưa (chỉ lấy bản đang Active/Finalized, loại bỏ bản đã bị Superseded)
  const existingFinalizedSnapshot = snapshots.find(
    (s) =>
      s.year === filterParams.year &&
      s.periodType === filterParams.periodType &&
      s.periodNumber === filterParams.periodNumber &&
      s.status !== 'superseded' &&
      s.status !== 'Superseded' &&
      (s.status as any) !== 2 &&
      (s.status as any) !== '2' &&
      (s.status === 'finalized' || s.status === 'Finalized' || (s.status as any) === 1 || (s.status as any) === '1' || Boolean(s.auditSignatureHash))
  );

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  useEffect(() => {
    if (!linkedSnapshotId || !canManageTax) return;
    const controller = new AbortController();
    setIsDrawerOpen(false);
    setSelectedSnapshot(null);
    void taxSnapshotApi.getSnapshot(linkedSnapshotId, controller.signal).then((snapshot) => {
      if (controller.signal.aborted) return;
      setSelectedSnapshot(snapshot);
      setIsDrawerOpen(true);
    }).catch(() => {
      if (!controller.signal.aborted) setToast({ id: `toast-${Date.now()}`, type: 'error', message: 'Không thể mở hồ sơ chốt kỳ từ thông báo.' });
    });
    return () => controller.abort();
  }, [linkedSnapshotId, canManageTax]);

  useDialogFocusTrap(Boolean(auxiliaryView), auxiliaryDialogRef, () => setAuxiliaryView(null));

  useEffect(() => {
    if (!isActionMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) setIsActionMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsActionMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isActionMenuOpen]);

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
    const defaultNumber = pType === TaxPeriodType.Month ? 1 : pType === TaxPeriodType.Quarter ? 1 : filterParams.year;
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
      allowSupersedeExisting: req.allowSupersedeExisting,
      rectificationReason: req.rectificationReason,
      pinProvided: Boolean(req.pin),
    });

    try {
      const result = await createSnapshot(req);
      setToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        message: `Chốt kỳ tính thuế thành công! Mã tham chiếu: ${result.id}`,
      });
      setAuxiliaryView('history');
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
        {/* Desktop: controls on the left, annual overview on the right. */}
        <div className="tax-hero-grid">
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
                      : 'Chưa có dữ liệu phân nhóm thuế'}
                  </span>
                </div>
              </div>
            </div>

            <div className="tax-topbar-actions">
              {/* Period Selector: Type & Number */}
              <div
                className="tax-period-selector"
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

              <button
                type="button"
                className="btn-secondary-pill tax-refresh-button"
                disabled={isSummaryLoading || isSummaryRefetching}
                onClick={() => { void refetchSummary(); }}
                title="Cập nhật số liệu"
              >
                <RotateCcw size={14} className={isSummaryRefetching ? 'tax-refresh-icon spinning' : 'tax-refresh-icon'} />
                <span>{isSummaryRefetching ? 'Đang cập nhật' : 'Cập nhật'}</span>
              </button>
              <div ref={actionMenuRef} className="tax-actions-menu-wrap">
                <button
                  type="button"
                  className="btn-secondary-pill tax-actions-menu-trigger"
                  aria-label="Thao tác khác"
                  aria-haspopup="menu"
                  aria-expanded={isActionMenuOpen}
                  onClick={() => setIsActionMenuOpen((value) => !value)}
                >
                  <MoreHorizontal size={18} />
                </button>
                {isActionMenuOpen && (
                  <div className="tax-actions-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setAuxiliaryView('history'); setIsActionMenuOpen(false); }}>
                      <History size={16} /> Lịch sử chốt kỳ <span>{snapshots.length}</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setAuxiliaryView('analytics'); setIsActionMenuOpen(false); }}>
                      <BarChart3 size={16} /> Phân tích doanh thu &amp; thuế
                    </button>
                    <div className="tax-actions-menu-separator" />
                    {canManageTax && <button type="button" role="menuitem" onClick={() => { setIsRateConfigOpen(true); setIsActionMenuOpen(false); }}><SlidersHorizontal size={16} /> Cấu hình thuế</button>}
                    {canManageTax && <button type="button" role="menuitem" onClick={() => { setPinModalInitialTab('change'); setIsPinModalOpen(true); setIsActionMenuOpen(false); }}><KeyRound size={16} /> Mã PIN bảo mật</button>}
                    {canManageTax && <button type="button" role="menuitem" disabled={isExportingExcel || isSummaryLoading || !summary || Boolean(summaryError)} onClick={() => { void handleExportExcel(); setIsActionMenuOpen(false); }}><Download size={16} /> {isExportingExcel ? 'Đang xuất…' : 'Xuất báo cáo Excel'}</button>}
                  </div>
                )}
              </div>

              {/* Finalize Button (Ẩn đối với Employee) */}
              {canManageTax && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  disabled={!summary || isSummaryLoading || isSummaryRefetching || Boolean(summaryError)}
                  className="btn-primary-pill"
                >
                  <span>Chốt kỳ sổ {periodLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <TaxOverviewCard summary={summary} isLoading={isSummaryLoading} />
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
                <strong style={{ fontSize: '0.88rem', color: '#991B1B' }}>Không thể tải dữ liệu thuế</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#B91C1C' }}>
                  {summaryError.message || 'Vui lòng thử lại để tải dữ liệu từ máy chủ.'}
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

        <div className="tax-segmented-tabs" role="tablist" aria-label="Khu vực thuế">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'declaration'}
            aria-controls="tax-panel-declaration"
            className={`tax-segmented-tab-btn ${activeTab === 'declaration' ? 'active' : ''}`}
            onClick={() => setActiveTab('declaration')}
          >
            <Calculator size={16} />
            <span>Tờ khai thuế</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'books'}
            aria-controls="tax-panel-books"
            className={`tax-segmented-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <BookOpen size={16} />
            <span>Sổ kế toán <small>· 7 mẫu</small></span>
          </button>
        </div>

        {/* Tab 1: Declaration & Method View */}
        {activeTab === 'declaration' && (
          <section id="tax-panel-declaration" role="tabpanel">
          <TaxDeclarationFormView
            summary={summary}
            calculationMethod={filterParams.calculationMethod}
            onSelectCalculationMethod={setCalculationMethod}
            applyVatReduction={Boolean(filterParams.applyVatReduction2026)}
            customVatRate={filterParams.customVatRate}
            customPitRate={filterParams.customPitRate}
            vatReductionPercentage={filterParams.vatReductionPercentage}
            onPreviewDeclaration={() => setIsDeclarationPreviewOpen(true)}
            onToggleVatReduction={setApplyVatReduction}
            isLoading={isSummaryLoading}
            isRefreshing={isSummaryRefetching}
          />
          </section>
        )}

        {/* Tab 2: Accounting Books View */}
        {activeTab === 'books' && (
          <section id="tax-panel-books" role="tabpanel">
          <AccountingBooksView
            summary={summary}
            year={filterParams.year}
            periodType={filterParams.periodType}
            periodNumber={filterParams.periodNumber}
          />
          </section>
        )}
      </div>

      {auxiliaryView && (
        <div className="tax-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuxiliaryView(null); }}>
          <section ref={auxiliaryDialogRef} className="tax-auxiliary-modal" role="dialog" aria-modal="true" aria-labelledby="tax-auxiliary-title">
            <header className="tax-auxiliary-header">
              <div><h2 id="tax-auxiliary-title">{auxiliaryView === 'history' ? 'Lịch sử chốt kỳ' : 'Phân tích doanh thu & thuế'}</h2><p>{periodLabel}</p></div>
              <button type="button" className="tax-drawer-close-btn" aria-label="Đóng" onClick={() => setAuxiliaryView(null)}><X size={18} /></button>
            </header>
            <div className="tax-auxiliary-body">
              {snapshotsError ? (
                <div role="alert"><p>Không thể tải lịch sử chốt kỳ: {snapshotsError.message}</p><button type="button" className="btn-secondary-pill" onClick={() => void refetchSnapshots()}>Thử lại</button></div>
              ) : auxiliaryView === 'history' ? (
                <TaxSnapshotsHistoryView
                  snapshots={snapshots as any}
                  isLoading={isSnapshotsLoading}
                  onOpenSealWizard={() => setIsCreateOpen(true)}
                  onViewDetail={(snap: any) => { setSelectedSnapshot(snap); setIsDrawerOpen(true); }}
                  onExport={(snap: any) => { setSelectedSnapshot(snap); setIsExportOpen(true); }}
                />
              ) : (
                <TaxAnalyticsSection snapshots={snapshots as any} year={filterParams.year} periodType={filterParams.periodType} />
              )}
            </div>
          </section>
        </div>
      )}

      <TaxDeclarationPreviewModal
        isOpen={isDeclarationPreviewOpen}
        filter={filterParams}
        onClose={() => setIsDeclarationPreviewOpen(false)}
      />

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
          existingFinalizedSnapshot={existingFinalizedSnapshot}
          onOpenPinModal={(tab) => {
            setPinModalInitialTab(tab || 'change');
            setIsPinModalOpen(true);
          }}
          onSubmit={handleCreateSnapshot}
        />
      )}

      {/* Security PIN Modal */}
      <SecurityPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        initialTab={pinModalInitialTab}
        onSuccess={(msg) => {
          setToast({
            id: `toast-${Date.now()}`,
            type: 'success',
            message: msg,
          });
        }}
      />

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
          if (linkedSnapshotId) {
            setSearchParams((previous) => {
              const next = new URLSearchParams(previous);
              next.delete('snapshotId');
              return next;
            }, { replace: true });
          }
        }}
        snapshot={selectedSnapshot}
        onExport={(snap) => {
          setSelectedSnapshot(snap);
          setIsExportOpen(true);
        }}
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
