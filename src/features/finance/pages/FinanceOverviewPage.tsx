import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatCompactMoney } from '../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { cashbookService, type BackendCashbookSummaryResponse } from '../../cashbook/services/cashbookService';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { taxSnapshotApi } from '../../tax-snapshot/api/taxSnapshotApi';
import { TaxPeriodType, TaxCalculationMethod } from '../../tax-snapshot/types/taxSnapshot';
import { TrendingUp, ShieldCheck, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import '../finance.css';

export const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [cashTransitConfirmed, setCashTransitConfirmed] = useState(false);
  const [showConfirmTransitModal, setShowConfirmTransitModal] = useState(false);

  // 1. Live Cash Accounts & Summary from Backend
  const cashAccountsQuery = useQuery({
    queryKey: ['finance-overview-cash-accounts'],
    queryFn: () => cashbookService.getCashAccounts(),
  });

  const cashSummaryQuery = useQuery({
    queryKey: ['finance-overview-cash-summary'],
    queryFn: async () => {
      const res = await financeHttpClient.get<{ data: BackendCashbookSummaryResponse }>('/cashbook/summary');
      return res.data?.data;
    },
  });

  // 2. Customer Debt Summary from Backend
  const debtsSummaryQuery = useQuery({
    queryKey: ['finance-overview-debts-summary'],
    queryFn: async () => {
      try {
        const res = await financeHttpClient.get('/customers/debts/summary');
        return res.data?.data || res.data;
      } catch {
        return null;
      }
    },
  });

  // 3. Operating Expenses & Payables Summary from Backend
  const expensesSummaryQuery = useQuery({
    queryKey: ['finance-overview-expenses-summary'],
    queryFn: async () => {
      try {
        const res = await financeHttpClient.get('/expenses/summary');
        return res.data?.data || res.data;
      } catch {
        return null;
      }
    },
  });

  // 4. PnL Report Summary from Backend
  const pnlSummaryQuery = useQuery({
    queryKey: ['finance-overview-pnl-summary'],
    queryFn: async () => {
      try {
        const res = await financeHttpClient.get('/finance/reports/pnl/summary');
        return res.data?.data || res.data;
      } catch {
        return null;
      }
    },
  });

  // 5. Tax Summary from Backend
  const currentYear = new Date().getFullYear();
  const taxSummaryQuery = useQuery({
    queryKey: ['tax-summary-overview', currentYear],
    queryFn: () =>
      taxSnapshotApi.getTaxSummary({
        year: currentYear,
        periodType: TaxPeriodType.Year,
        periodNumber: currentYear,
        calculationMethod: TaxCalculationMethod.RevenuePercentage,
      }),
  });

  const isLoading =
    cashAccountsQuery.isLoading ||
    cashSummaryQuery.isLoading;

  const isError =
    cashAccountsQuery.isError ||
    cashSummaryQuery.isError;

  const refetchAll = () => {
    cashAccountsQuery.refetch();
    cashSummaryQuery.refetch();
    debtsSummaryQuery.refetch();
    expensesSummaryQuery.refetch();
    pnlSummaryQuery.refetch();
    taxSummaryQuery.refetch();
  };

  // Calculations from Live Data
  const accounts = cashAccountsQuery.data || [];
  const cashSummary = cashSummaryQuery.data;

  const cashAtRegisters =
    cashSummary?.totalCashInDrawers ??
    accounts
      .filter((a) => a.accountType === 'CASH' && !a.isSafeDeposit)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const safeDeposit =
    cashSummary?.totalSafeDepositBalance ??
    accounts
      .filter((a) => a.isSafeDeposit)
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const bankBalances =
    cashSummary?.totalBankDeposits ??
    accounts
      .filter((a) => a.accountType === 'BANK')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const cashInTransit = cashTransitConfirmed ? 0 : 0;
  const totalAssets = (cashSummary?.totalClosingBalance ?? (cashAtRegisters + safeDeposit + bankBalances)) + cashInTransit;

  // Debt & Expense Figures
  const totalCustomerDebt = debtsSummaryQuery.data?.totalDebtAR || 0;
  const overLimitCustomersCount = debtsSummaryQuery.data?.overLimitCount || 0;
  const totalDebtorsCount = debtsSummaryQuery.data?.totalCustomers || 0;

  const overduePayablesAmount =
    expensesSummaryQuery.data?.overdueAmount ??
    expensesSummaryQuery.data?.totalOverdueAmount ??
    0;
  const overduePayablesCount = expensesSummaryQuery.data?.overdueCount || 0;

  // P&L figures
  const netProfitMonth = Number(pnlSummaryQuery.data?.netProfit || 0);
  const netMarginPct = Number(pnlSummaryQuery.data?.netMarginPercentage || 0);

  // Tax figures
  const taxDueYear =
    taxSummaryQuery.data?.taxDueYtd ??
    taxSummaryQuery.data?.totalTaxAmount ??
    0;

  // Percentages for allocation bar
  const pctCash = totalAssets > 0 ? Math.round((cashAtRegisters / totalAssets) * 100) : 0;
  const pctSafe = totalAssets > 0 ? Math.round((safeDeposit / totalAssets) * 100) : 0;
  const pctBank = totalAssets > 0 ? Math.round((bankBalances / totalAssets) * 100) : 0;
  const pctTransit = totalAssets > 0 ? Math.round((cashInTransit / totalAssets) * 100) : 0;

  return (
    <div className="finance-overview-container">
      {/* Main Content Container */}
      <main className="finance-overview-main">
        {/* Header & Page Title */}
        <div className="finance-overview-header">
          <div className="finance-overview-title">
            <h1>Tổng quan Tài chính</h1>
            <p>Dòng tiền, công nợ và các khoản cần xử lý trong ngày ({new Date().toLocaleDateString('vi-VN')})</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={refetchAll}
              className="btn-secondary-pill"
              title="Làm mới dữ liệu từ máy chủ"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span>Cập nhật</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/store-owner/cashbook')}
              className="btn-primary-teal"
              id="btn-quick-receipt-payment"
            >
              <span>+ Thu / Chi tiền</span>
            </button>
          </div>
        </div>

        {/* Error notification banner if API connection fails */}
        {isError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              marginBottom: 16,
              color: '#991B1B',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} color="#DC2626" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Không thể kết nối đến máy chủ kế toán để tải số dư quỹ. Vui lòng kiểm tra dịch vụ backend hoặc thử lại.
              </span>
            </div>
            <button
              type="button"
              onClick={refetchAll}
              style={{
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Hero Card: Tiền hiện có hôm nay */}
        <section aria-labelledby="hero-title" className="finance-hero-card">
          <div className="finance-hero-header">
            <div>
              <span id="hero-title" className="finance-hero-title-text">
                Tiền hiện có hôm nay (có thể tiêu ngay)
              </span>
              <div className="finance-hero-amount">
                {isLoading ? (
                  <span style={{ fontSize: '1.5rem', color: '#94A3B8' }}>Đang tải số dư...</span>
                ) : (
                  formatMoney(totalAssets)
                )}
              </div>
            </div>

            <div className="finance-hero-badge">
              <TrendingUp size={16} />
              <span>Dữ liệu thực từ sổ quỹ & tài khoản ngân hàng</span>
            </div>
          </div>

          {/* Asset Allocation Progress Bar */}
          <div>
            <div
              className="finance-allocation-track"
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                style={{ width: `${pctCash}%`, background: '#115E59' }}
                title={`Tiền mặt quầy: ${formatMoney(cashAtRegisters)}`}
              />
              <div
                style={{ width: `${pctSafe}%`, background: '#2DD4BF' }}
                title={`Két sắt chủ shop: ${formatMoney(safeDeposit)}`}
              />
              <div
                style={{ width: `${pctBank}%`, background: '#94A3B8' }}
                title={`Ngân hàng: ${formatMoney(bankBalances)}`}
              />
              {cashInTransit > 0 && (
                <div
                  style={{ width: `${pctTransit}%`, background: '#B45309' }}
                  title={`Đang chuyển về két sắt: ${formatMoney(cashInTransit)}`}
                />
              )}
            </div>

            {/* Asset Legend */}
            <div className="finance-legend-grid">
              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#115E59' }} />
                <span className="finance-legend-label">Tiền quầy:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(cashAtRegisters)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#2DD4BF' }} />
                <span className="finance-legend-label">Két sắt:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(safeDeposit)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#94A3B8' }} />
                <span className="finance-legend-label">Ngân hàng:</span>
                <span className="finance-legend-val">
                  {formatCompactMoney(bankBalances)}
                </span>
              </div>

              <div className="finance-legend-item">
                <span className="finance-legend-dot" style={{ background: '#B45309' }} />
                <span className="finance-legend-label">Đang chuyển:</span>
                <span className="finance-legend-val">
                  {cashInTransit > 0 ? formatCompactMoney(cashInTransit) : '0đ'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tasks Section: Việc cần làm */}
        <section aria-labelledby="tasks-title" className="finance-todo-section">
          <div className="finance-todo-header">
            <h2 id="tasks-title">Việc cần làm trong ngày</h2>
            <span className="finance-todo-count-badge">
              {(overduePayablesCount > 0 ? 1 : 0) + (overLimitCustomersCount > 0 ? 1 : 0)} việc
            </span>
          </div>

          <div className="finance-todo-list">
            {/* Urgent Task 1: Overdue Payables */}
            {overduePayablesCount > 0 ? (
              <div className="finance-todo-item danger">
                <div className="finance-todo-left">
                  <div className="finance-todo-icon danger">!</div>
                  <div>
                    <h3 className="finance-todo-title danger">
                      {overduePayablesCount} khoản phải trả đã quá hạn ({formatMoney(overduePayablesAmount)})
                    </h3>
                    <p className="finance-todo-sub danger">
                      Các khoản chi phí dịch vụ quá hạn thanh toán cần được giải ngân
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/store-owner/expenses')}
                  className="finance-todo-btn danger"
                >
                  Xem chi tiết
                </button>
              </div>
            ) : null}

            {/* Urgent Task 2: Customers Over Credit Limit */}
            {overLimitCustomersCount > 0 ? (
              <div className="finance-todo-item warning">
                <div className="finance-todo-left">
                  <div className="finance-todo-icon warning">!</div>
                  <div>
                    <h3 className="finance-todo-title warning">
                      {overLimitCustomersCount} khách hàng vượt hạn mức nợ
                    </h3>
                    <p className="finance-todo-sub warning">
                      Cần thu hồi công nợ trước khi tiếp tục cho phép ghi nợ đơn mới
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/store-owner/customers')}
                  className="finance-todo-btn warning"
                >
                  Thu nợ ngay
                </button>
              </div>
            ) : null}

            {/* Empty Tasks State */}
            {overduePayablesCount === 0 && overLimitCustomersCount === 0 && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#64748B',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Tuyệt vời! Không có khoản nợ quá hạn hoặc khoản chi nào cần xử lý khẩn cấp hôm nay.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4 Summary Cards Grid */}
        <section aria-label="Tóm tắt 4 trụ cột tài chính" className="finance-summary-grid">
          {/* Card 1: Khách nợ */}
          <div
            onClick={() => navigate('/store-owner/customers')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Khách đang nợ mình</span>
              <div className="finance-summary-val">
                {formatMoney(totalCustomerDebt)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#B45309', fontWeight: 600 }}>
                {totalDebtorsCount > 0 ? `${totalDebtorsCount} khách hàng ghi nợ` : 'Không có nợ xấu'}
              </span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Xem sổ nợ <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 2: Phải trả */}
          <div
            onClick={() => navigate('/store-owner/expenses')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Phải trả dịch vụ</span>
              <div className="finance-summary-val">
                {formatMoney(overduePayablesAmount)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: overduePayablesCount > 0 ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                {overduePayablesCount > 0 ? `${overduePayablesCount} khoản quá hạn` : 'Đã thanh toán đủ'}
              </span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Xem chi tiết <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 3: Lãi tháng này */}
          <div
            onClick={() => navigate('/store-owner/reports/pnl')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Lợi nhuận ròng PnL</span>
              <div className="finance-summary-val" style={{ color: netProfitMonth >= 0 ? '#15803D' : '#DC2626' }}>
                {formatMoney(netProfitMonth)}
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#475569', fontWeight: 600 }}>
                Tỷ suất lợi nhuận: {netMarginPct}%
              </span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Báo cáo Lãi lỗ <ChevronRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 4: Thuế năm nay */}
          <div
            onClick={() => navigate('/store-owner/tax-snapshots')}
            className="finance-summary-card"
          >
            <div>
              <span className="finance-summary-title">Thuế năm nay (Lũy kế {currentYear})</span>
              <div className="finance-summary-val" style={{ color: '#B45309' }}>
                {formatMoney(taxDueYear)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                Theo Thông tư 152/2025/TT-BTC
              </div>
            </div>
            <div className="finance-summary-footer">
              <span style={{ color: '#B45309', fontWeight: 600 }}>Kỳ thuế hiện tại</span>
              <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Kê khai thuế <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </section>

        {/* Confirmation Modal for Cash Transit */}
        {showConfirmTransitModal && (
          <div className="finance-modal-backdrop" onClick={() => setShowConfirmTransitModal(false)}>
            <div className="finance-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: '#CCFBF1',
                    color: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Xác nhận nhận tiền về két sắt
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Chuyển từ Két quầy về két sắt an toàn của chủ tiệm
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmTransitModal(false)}
                  className="btn-secondary-pill"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCashTransitConfirmed(true);
                    setShowConfirmTransitModal(false);
                  }}
                  className="btn-primary-pill"
                  style={{ background: 'var(--brand-700, #115E59)' }}
                >
                  Xác nhận đã cất vào két
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default FinanceOverviewPage;
