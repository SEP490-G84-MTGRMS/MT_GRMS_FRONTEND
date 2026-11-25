import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import type {
  SupplierSummary,
  APLedgerEntry,
  SupplierApSummary,
  SupplierApAging,
  APDocType,
  RecordAPTransactionCommand,
} from '../../types/supplier.types';
import { supplierApi } from '../../api/supplierApi';
import { exportSupplierApStatementExcel } from '../../lib/apStatementExcel';
import { SupplierPayablePaymentModal } from './SupplierPayablePaymentModal';
import { TablePagination } from '../../../../components/common/TablePagination';
import {
  CreditCard,
  FileSpreadsheet,
  Banknote,
  RefreshCw,
  RotateCcw,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  /** Optional static fixture (used in unit tests). Omit in app to load live data from API. */
  apLedgers?: APLedgerEntry[];
  actorName?: string;
  onDebtChanged?: (summary: SupplierApSummary) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const DOC_TYPE_LABEL: Record<APLedgerEntry['docType'], string> = {
  PurchaseInvoice: 'Nhập kho',
  ServiceInvoice: 'Dịch vụ',
  PaymentVoucher: 'Thanh toán',
  ReturnAdjustment: 'Hoàn trả',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  OTHER: 'Khác',
};

function buildFallbackAging(currentDebt: number, overdueDebt: number): SupplierApAging {
  const safeCurrent = Math.max(0, currentDebt - overdueDebt);
  return {
    current: safeCurrent,
    days1To30: overdueDebt,
    days31To60: 0,
    days61To90: 0,
    over90Days: 0,
    totalOverdue: overdueDebt,
    totalDebt: currentDebt,
  };
}

export const SupplierPayablesTab: FC<Props> = ({
  supplier,
  apLedgers: staticLedgers,
  actorName = 'Chủ cửa hàng',
  onDebtChanged,
  onNotify,
}) => {
  const isStaticMode = staticLedgers !== undefined;

  const [summary, setSummary] = useState<SupplierApSummary | null>(null);
  const [ledgers, setLedgers] = useState<APLedgerEntry[]>(staticLedgers ?? []);
  const [totalItems, setTotalItems] = useState<number>(staticLedgers?.length ?? 0);

  // Filters & pagination
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [docType, setDocType] = useState<APDocType | ''>('');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Async states
  const [isLoading, setIsLoading] = useState<boolean>(!isStaticMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  const fmt = (val: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(val))} đ`;

  const currentDebt = summary ? summary.currentDebt : supplier.currentDebt;
  const overdueDebt = summary ? summary.overdueDebt : supplier.overdueDebt;
  const aging: SupplierApAging = summary?.aging ?? buildFallbackAging(currentDebt, overdueDebt);

  useEffect(() => {
    if (staticLedgers !== undefined) {
      setLedgers(staticLedgers);
      setTotalItems(staticLedgers.length);
    }
  }, [staticLedgers]);

  const loadData = useCallback(
    async (opts?: { page?: number; size?: number; from?: string; to?: string; type?: APDocType | '' }) => {
      if (isStaticMode) return;
      const nextPage = opts?.page ?? pageIndex;
      const nextSize = opts?.size ?? pageSize;
      const nextFrom = opts?.from !== undefined ? opts.from : fromDate;
      const nextTo = opts?.to !== undefined ? opts.to : toDate;
      const nextType = opts?.type !== undefined ? opts.type : docType;

      if (nextFrom && nextTo && nextFrom > nextTo) {
        setErrorMessage('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [summaryRes, ledgerRes] = await Promise.all([
          supplierApi.getAPSummary(supplier.id),
          supplierApi.getAPLedger(supplier.id, {
            fromDate: nextFrom || undefined,
            toDate: nextTo || undefined,
            docType: nextType || undefined,
            pageIndex: nextPage,
            pageSize: nextSize,
          }),
        ]);
        setSummary(summaryRes);
        setLedgers(ledgerRes.items || []);
        setTotalItems(ledgerRes.totalItems ?? ledgerRes.items?.length ?? 0);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Không thể tải dữ liệu công nợ nhà cung cấp.');
      } finally {
        setIsLoading(false);
      }
    },
    [isStaticMode, supplier.id, pageIndex, pageSize, fromDate, toDate, docType]
  );

  useEffect(() => {
    if (isStaticMode) return;
    void loadData();
  }, [isStaticMode, loadData]);

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setDocType('');
    setPageIndex(1);
    setErrorMessage(null);
  };

  const handleConfirmPayment = async (command: RecordAPTransactionCommand) => {
    setIsSubmittingPayment(true);
    try {
      const created = await supplierApi.recordAPTransaction(supplier.id, command);
      setIsPaymentModalOpen(false);
      onNotify?.(
        `Đã thanh toán ${fmt(created.amount)} (${created.docNo}) cho NCC ${supplier.name}.`,
        'success'
      );

      // Refresh summary + ledger (trang 1) và báo về trang detail cập nhật currentDebt/overdueDebt
      const [freshSummary, freshLedger] = await Promise.all([
        supplierApi.getAPSummary(supplier.id),
        supplierApi.getAPLedger(supplier.id, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          docType: docType || undefined,
          pageIndex: 1,
          pageSize,
        }),
      ]);
      setPageIndex(1);
      setSummary(freshSummary);
      setLedgers(freshLedger.items || []);
      setTotalItems(freshLedger.totalItems ?? freshLedger.items?.length ?? 0);
      onDebtChanged?.(freshSummary);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      let rowsToExport = ledgers;
      if (!isStaticMode && totalItems > ledgers.length) {
        const allRes = await supplierApi.getAPLedger(supplier.id, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          docType: docType || undefined,
          pageIndex: 1,
          pageSize: Math.min(Math.max(totalItems, 100), 1000),
        });
        rowsToExport = allRes.items || ledgers;
      }

      await exportSupplierApStatementExcel({
        supplier,
        aging,
        currentDebt,
        ledgers: rowsToExport,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      onNotify?.(`Đã xuất sao kê công nợ NCC ${supplier.name} ra Excel.`, 'success');
    } catch (err: any) {
      onNotify?.(err?.message || 'Không thể xuất file Excel sao kê công nợ.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(fromDate || toDate || docType);
  const renderBucketCell = (value: number, isOverdueBucket: boolean) => (
    <td
      style={{
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontWeight: value > 0 ? 600 : 400,
        color:
          value <= 0
            ? 'var(--text-faint)'
            : isOverdueBucket
            ? 'var(--red-accent)'
            : 'inherit',
      }}
    >
      {fmt(value)}
    </td>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SECTION 1: Aging Buckets & Actions */}
      <div className="supplier-detail-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                Phân Tích Tuổi Nợ (AP Aging Buckets)
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tự động phân nhóm công nợ theo hạn thanh toán ({summary?.paymentTermDays ?? supplier.paymentTermDays} ngày) và ngày đến hạn phiếu nhập.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {currentDebt > 0 && (
              <button
                type="button"
                data-testid="btn-open-ap-payment"
                className="admin-btn admin-btn-primary"
                onClick={() => setIsPaymentModalOpen(true)}
                style={{
                  height: 34,
                  padding: '0 14px',
                  gap: 6,
                  borderRadius: 6,
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                }}
              >
                <Banknote size={15} />
                <span>Thanh toán công nợ</span>
              </button>
            )}

            <button
              type="button"
              data-testid="btn-export-ap-excel"
              className="admin-btn admin-btn-secondary"
              disabled={isLoading || isExporting}
              onClick={() => void handleExportExcel()}
              style={{ height: 34, padding: '0 14px', gap: 6, borderRadius: 6 }}
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Sao Kê Excel'}</span>
            </button>
          </div>
        </div>

        {/* Aging table (6 columns bound directly from BE AP Aging) */}
        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>Trong hạn (Current)</th>
                <th style={{ textAlign: 'right' }}>Quá hạn 1–30 ngày</th>
                <th style={{ textAlign: 'right' }}>31–60 ngày</th>
                <th style={{ textAlign: 'right' }}>61–90 ngày</th>
                <th style={{ textAlign: 'right' }}>&gt; 90 ngày</th>
                <th style={{ textAlign: 'right', background: 'var(--blue-subtle)' }}>TỔNG DƯ NỢ</th>
              </tr>
            </thead>
            <tbody>
              <tr data-testid="ap-aging-row">
                {renderBucketCell(aging.current, false)}
                {renderBucketCell(aging.days1To30, true)}
                {renderBucketCell(aging.days31To60, true)}
                {renderBucketCell(aging.days61To90, true)}
                {renderBucketCell(aging.over90Days, true)}
                <td
                  data-testid="ap-total-debt"
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--blue-primary)',
                    background: 'var(--blue-light)',
                  }}
                >
                  {fmt(currentDebt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: AP Ledger Transactions */}
      <div className="supplier-detail-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <h2 className="supplier-detail-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Biến Động Sổ Cái Công Nợ (AP Ledger Transactions)
          </h2>

          {/* Filter Bar */}
          {!isStaticMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-muted)' }}>
                <span>Từ ngày:</span>
                <input
                  type="date"
                  data-testid="ap-filter-from-date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPageIndex(1);
                  }}
                  style={{
                    height: 32,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    fontSize: 12.5,
                    color: 'var(--text-main)',
                    background: '#fff',
                  }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-muted)' }}>
                <span>Đến ngày:</span>
                <input
                  type="date"
                  data-testid="ap-filter-to-date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPageIndex(1);
                  }}
                  style={{
                    height: 32,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    fontSize: 12.5,
                    color: 'var(--text-main)',
                    background: '#fff',
                  }}
                />
              </label>

              <select
                data-testid="ap-filter-doc-type"
                value={docType}
                onChange={(e) => {
                  setDocType(e.target.value as APDocType | '');
                  setPageIndex(1);
                }}
                style={{
                  height: 32,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  fontSize: 12.5,
                  color: 'var(--text-main)',
                  background: '#fff',
                }}
              >
                <option value="">Tất cả loại chứng từ</option>
                <option value="PurchaseInvoice">Nhập kho (GRN)</option>
                <option value="PaymentVoucher">Thanh toán</option>
                <option value="ServiceInvoice">Dịch vụ</option>
                <option value="ReturnAdjustment">Hoàn trả</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={handleResetFilters}
                  style={{ height: 32, padding: '0 10px', gap: 4, borderRadius: 6, fontSize: 12 }}
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại</span>
                </button>
              )}

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={isLoading}
                onClick={() => void loadData()}
                title="Làm mới sổ cái"
                style={{ height: 32, padding: '0 10px', gap: 4, borderRadius: 6, fontSize: 12 }}
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid #f87171',
                background: '#fff',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="admin-table-card" style={{ borderRadius: 16, border: '1px solid var(--border-light)' }}>
          <table className="admin-data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Mã chứng từ</th>
                <th style={{ width: 110 }}>Loại</th>
                <th style={{ width: 115 }}>Ngày GD</th>
                <th style={{ width: 160 }}>Phương thức / Tham chiếu</th>
                <th>Nội dung diễn giải</th>
                <th style={{ width: 140, textAlign: 'right' }}>Biến động nợ</th>
                <th style={{ width: 140, textAlign: 'right' }}>Dư nợ sau GD</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang tải sổ cái công nợ...</span>
                    </div>
                  </td>
                </tr>
              ) : ledgers.length > 0 ? (
                ledgers.map((entry) => {
                  const methodText = entry.paymentMethod
                    ? PAYMENT_METHOD_LABEL[entry.paymentMethod] || entry.paymentMethod
                    : null;
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="admin-subdomain-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                          {entry.docNo}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color: entry.direction === 1 ? 'var(--blue-primary, #0f766e)' : '#16a34a',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {DOC_TYPE_LABEL[entry.docType] || entry.docType}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.transactionDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {methodText || entry.referenceNo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {methodText && <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{methodText}</span>}
                            {entry.referenceNo && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{entry.referenceNo}</span>
                            )}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-main)' }}>
                        {entry.description}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: entry.direction === 1 ? '#111827' : '#059669',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.direction === 1 ? '+' : '-'}{fmt(entry.amount)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--blue-primary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmt(entry.balanceAfter)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 460 }}>
                      <Info size={20} style={{ color: '#94a3b8' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13.5 }}>
                        {hasActiveFilters
                          ? 'Không có giao dịch công nợ nào phù hợp với bộ lọc.'
                          : 'Chưa có giao dịch phát sinh công nợ nào.'}
                      </div>
                      {!hasActiveFilters && (
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                          Công nợ nhà cung cấp sẽ tự động phát sinh khi xác nhận phiếu nhập kho (GRN) theo hình thức Ghi nợ (AP).
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!isStaticMode && totalItems > 0 && (
            <TablePagination
              currentPage={pageIndex}
              pageSize={pageSize}
              totalItems={totalItems}
              pageSizeOptions={[10, 15, 25, 50]}
              onPageChange={setPageIndex}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPageIndex(1);
              }}
              itemLabel="giao dịch"
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <SupplierPayablePaymentModal
        isOpen={isPaymentModalOpen}
        supplier={supplier}
        currentDebt={currentDebt}
        actorName={actorName}
        isSubmitting={isSubmittingPayment}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
};
